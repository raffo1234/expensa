/// <reference types="@cloudflare/workers-types" />
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Unzip, UnzipFile, UnzipInflate } from "fflate";
import {
  buildInstance,
  buildStudy,
  DicomStudy,
  parseDicomMetadata,
} from "./dicomWorkerUtils";

export interface Env {
  DICOM_BUCKET: R2Bucket;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  STORAGE_DOMAIN: string;
}

const R2_CONCURRENCY = 5;
const SUPABASE_BATCH_SIZE = 30;
const PROGRESS_EVERY = 20;

// Only metadata stored in checkpoint — no buffers
interface UploadedFile {
  destPath: string;
  storageUrl: string;
  metadata: ReturnType<typeof parseDicomMetadata>;
}

interface CheckpointState {
  status: "processing" | "inserting" | "done" | "failed";
  storagePath: string;
  userId: string;
  jobId: string;
  uploadedFiles: UploadedFile[];  // metadata only, no buffers
  processedCount: number;
  totalCount: number;
  insertedStudies: { id: string; state: string }[];
  error?: string;
}

// --- SEMAPHORE ---
class Semaphore {
  private queue: (() => void)[] = [];
  private running = 0;
  constructor(private limit: number) {}

  async acquire(): Promise<void> {
    if (this.running < this.limit) { this.running++; return; }
    return new Promise((resolve) => this.queue.push(resolve));
  }

  release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) { this.running++; next(); }
  }
}

export class DicomProcessor {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const { storagePath, userId, jobId } = (await request.json()) as {
      storagePath: string;
      userId: string;
      jobId: string;
    };

    // Idempotent — if already running, return current status
    const existing = await this.state.storage.get<CheckpointState>("checkpoint");
    if (existing && existing.status !== "failed") {
      return new Response(
        JSON.stringify({ ok: true, jobId, status: existing.status }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const checkpoint: CheckpointState = {
      status: "processing",
      storagePath,
      userId,
      jobId,
      uploadedFiles: [],
      processedCount: 0,
      totalCount: 0,
      insertedStudies: [],
    };
    await this.state.storage.put("checkpoint", checkpoint);

    this.state.waitUntil(this.process(checkpoint));

    return new Response(
      JSON.stringify({ ok: true, jobId }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  private async process(checkpoint: CheckpointState): Promise<void> {
    const supabase = createClient(
      this.env.SUPABASE_URL,
      this.env.SUPABASE_SERVICE_ROLE_KEY
    );

    await supabase
      .from("dicom_processing_job")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", checkpoint.jobId);

    try {
      // --- PHASE 1: Stream ZIP → upload each file to R2 immediately ---
      // No buffer accumulation — each file is uploaded and buffer GC'd
      await this.phaseStreamAndUpload(checkpoint, supabase);

      // --- PHASE 2: Insert metadata into Supabase ---
      await this.phaseInsert(checkpoint, supabase);

      // --- PHASE 3: Delete original ZIP ---
      await this.env.DICOM_BUCKET.delete(checkpoint.storagePath);
      console.log("[DO] Deleted ZIP:", checkpoint.storagePath);

      // Done
      checkpoint.status = "done";
      await this.state.storage.put("checkpoint", checkpoint);

      await supabase
        .from("dicom_processing_job")
        .update({
          status: "done",
          studies: checkpoint.insertedStudies,
          processed_files: checkpoint.processedCount,
          total_files: checkpoint.totalCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", checkpoint.jobId);

      console.log(
        `[DO] Done. Files: ${checkpoint.processedCount}, Studies: ${checkpoint.insertedStudies.length}`
      );

      await this.state.storage.deleteAll();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[DO] Fatal error:", msg);

      checkpoint.status = "failed";
      checkpoint.error = msg;
      await this.state.storage.put("checkpoint", checkpoint);

      await supabase
        .from("dicom_processing_job")
        .update({
          status: "failed",
          error: msg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", checkpoint.jobId);
    }
  }

  private async phaseStreamAndUpload(
    checkpoint: CheckpointState,
    supabase: SupabaseClient
  ): Promise<void> {
    console.log("[DO] Streaming ZIP:", checkpoint.storagePath);

    const zipObject = await this.env.DICOM_BUCKET.get(checkpoint.storagePath);
    if (!zipObject) throw new Error(`ZIP not found in R2: ${checkpoint.storagePath}`);

    const semaphore = new Semaphore(R2_CONCURRENCY);
    const pendingUploads: Promise<void>[] = [];
    let lastProgressUpdate = 0;

    await new Promise<void>((resolve, reject) => {
      const unzip = new Unzip((file: UnzipFile) => {
        const path = file.name;

        if (
          path.includes("__MACOSX") ||
          path.toLowerCase().includes("dicomdir") ||
          path.endsWith("/")
        ) {
          file.ondata = () => {};
          return;
        }

        const chunks: Uint8Array[] = [];

        file.ondata = (err, chunk, final) => {
          if (err) {
            console.error("[DO] ondata error:", err);
            return;
          }

          chunks.push(chunk);
          if (!final) return;

          // Assemble buffer
          const totalLen = chunks.reduce((a, c) => a + c.length, 0);
          const buffer = new Uint8Array(totalLen);
          let offset = 0;
          for (const c of chunks) { buffer.set(c, offset); offset += c.length; }
          chunks.length = 0; // free chunk refs

          // Parse metadata
          const metadata = parseDicomMetadata(buffer);
          if (!metadata?.studyInstanceUID) {
            console.warn("[DO] No studyInstanceUID, skipping:", path);
            return;
          }

          checkpoint.totalCount++;

          const sUID = metadata.studyInstanceUID;
          const destPath = `dicom/${checkpoint.userId}/${sUID}/${metadata.seriesInstanceUID}/${metadata.sopInstanceUID}.dcm`;
          const storageUrl = `${this.env.STORAGE_DOMAIN}/${destPath}`;

          // ✅ Upload immediately — buffer GC'd after put() resolves
          // Only metadata is kept in checkpoint
          const upload = (async () => {
            await semaphore.acquire();
            try {
              await this.env.DICOM_BUCKET.put(destPath, buffer, {
                httpMetadata: { contentType: "application/dicom" },
              });

              // Store only metadata — no buffer
              checkpoint.uploadedFiles.push({ destPath, storageUrl, metadata });
              checkpoint.processedCount++;

              // Fire-and-forget progress update
              if (checkpoint.processedCount - lastProgressUpdate >= PROGRESS_EVERY) {
                lastProgressUpdate = checkpoint.processedCount;
                supabase
                  .from("dicom_processing_job")
                  .update({
                    processed_files: checkpoint.processedCount,
                    total_files: checkpoint.totalCount,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", checkpoint.jobId)
                  .then(() => {}).catch(() => {});
              }
            } catch (err) {
              console.error("[DO] R2 upload failed:", destPath, err);
            } finally {
              semaphore.release();
            }
          })();

          pendingUploads.push(upload);
        };

        file.start();
      });

      unzip.register(UnzipInflate);

      const reader = zipObject.body!.getReader();
      const pump = (): Promise<void> =>
        reader.read().then(({ done, value }) => {
          if (done) {
            unzip.push(new Uint8Array(0), true);
            resolve();
            return;
          }
          unzip.push(value);
          return pump();
        }).catch(reject);

      pump();
    });

    // Wait for all uploads to finish
    const results = await Promise.allSettled(pendingUploads);
    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      console.warn(`[DO] ${failed.length} R2 uploads failed`);
    }

    // Save checkpoint with metadata only — safe size for DO storage
    await this.state.storage.put("checkpoint", checkpoint);

    console.log(
      `[DO] Stream+upload done. Files: ${checkpoint.processedCount}/${checkpoint.totalCount}`
    );
  }

  private async phaseInsert(
    checkpoint: CheckpointState,
    supabase: SupabaseClient
  ): Promise<void> {
    checkpoint.status = "inserting";
    await this.state.storage.put("checkpoint", checkpoint);

    console.log("[DO] Building studies map...");

    const studiesMap = new Map<string, DicomStudy>();
    for (const file of checkpoint.uploadedFiles) {
      if (!file.metadata) continue;
      const sUID = file.metadata.studyInstanceUID;
      if (!studiesMap.has(sUID)) {
        studiesMap.set(sUID, buildStudy(file.metadata, checkpoint.userId));
      }
      studiesMap.get(sUID)!.instances.push(
        buildInstance(file.metadata, file.storageUrl)
      );
    }

    console.log(`[DO] Inserting ${studiesMap.size} studies...`);

    const sUIDs = Array.from(studiesMap.keys());
    const { data: existing } = await supabase
      .from("dicom")
      .select("id, study_instance_uid, instances")
      .eq("user_id", checkpoint.userId)
      .in("study_instance_uid", sUIDs);

    const existingMap = new Map(
      existing?.map((d) => [d.study_instance_uid, d]) ?? []
    );

    const studies = Array.from(studiesMap.values());

    for (let i = 0; i < studies.length; i += SUPABASE_BATCH_SIZE) {
      const batch = studies.slice(i, i + SUPABASE_BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async (study) => {
          study.instances.sort((a, b) => a.instance_number - b.instance_number);
          const found = existingMap.get(study.study_instance_uid);

          try {
            if (!found) {
              const { data, error } = await supabase
                .from("dicom").insert(study).select("id").single();
              if (error) throw error;
              if (data) checkpoint.insertedStudies.push({ id: data.id, state: "inserted" });
            } else if (!found.instances?.length) {
              const { error } = await supabase
                .from("dicom").update({ instances: study.instances }).eq("id", found.id);
              if (error) throw error;
              checkpoint.insertedStudies.push({ id: found.id, state: "inserted" });
            } else {
              checkpoint.insertedStudies.push({ id: found.id, state: "duplicated" });
            }
          } catch (err) {
            console.error("[DO] DB error for", study.study_instance_uid, err);
          }
        })
      );

      await this.state.storage.put("checkpoint", checkpoint);
    }

    console.log(`[DO] Inserted ${checkpoint.insertedStudies.length} studies`);
  }
}
