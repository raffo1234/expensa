/// <reference types="@cloudflare/workers-types" />
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { buildInstance, buildStudy, DicomStudy, parseDicomMetadata } from "./dicomWorkerUtils";
import { Unzip, UnzipFile, UnzipInflate } from "fflate";

export interface Env {
    DICOM_BUCKET: R2Bucket;
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    STORAGE_DOMAIN: string;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        if (request.method !== "POST") {
            return new Response("Method not allowed", { status: 405 });
        }

        const { storagePath, userId, jobId } = await request.json() as {
            storagePath: string;
            userId: string;
            jobId: string;
        };

        ctx.waitUntil(processZip(storagePath, userId, jobId, env));

        return new Response("ok");
    },
};

async function processZip(storagePath: string, userId: string, jobId: string, env: Env): Promise<void> {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    await supabase
        .from("dicom_processing_job")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", jobId);

    try {
        console.log("[Worker] Fetching zip from R2:", storagePath);
        const zipObject = await env.DICOM_BUCKET.get(storagePath);
        if (!zipObject) throw new Error(`File not found in R2: ${storagePath}`);

        const parsedResults: Array<{
            sUID: string;
            destPath: string;
            buffer: Uint8Array;
            metadata: NonNullable<ReturnType<typeof parseDicomMetadata>>;
        }> = [];

        console.log("[Worker] Starting stream...");
        await new Promise<void>((resolve, reject) => {
            const unzip = new Unzip((file: UnzipFile) => {
                const path = file.name;
                console.log("[Worker] File in zip:", path);
                if (
                    path.includes("__MACOSX") ||
                    path.toLowerCase().includes("dicomdir") ||
                    path.endsWith("/")
                ) {
                    file.ondata = () => { };
                    return;
                }

                const chunks: Uint8Array[] = [];
                file.ondata = (err, chunk, final) => {
                    if (err) { console.error("[Worker] ondata error:", err); return; }
                    chunks.push(chunk);
                    if (final) {
                        console.log("[Worker] File complete:", path, "size:", chunks.reduce((a, c) => a + c.length, 0));
                        const buffer = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0));
                        let offset = 0;
                        for (const c of chunks) { buffer.set(c, offset); offset += c.length; }

                        const metadata = parseDicomMetadata(buffer);
                        if (!metadata?.studyInstanceUID) {
                            console.warn("[Worker] No studyInstanceUID for:", path);
                            return;
                        }

                        const sUID = metadata.studyInstanceUID;
                        const destPath = `dicom/${userId}/${sUID}/${metadata.seriesInstanceUID}/${metadata.sopInstanceUID}.dcm`;
                        parsedResults.push({ sUID, destPath, buffer, metadata });
                    }
                };
                file.start();
            });

            unzip.register(UnzipInflate);

            const reader = zipObject.body!.getReader();
            const pump = (): Promise<void> =>
                reader.read().then(({ done, value }) => {
                    if (done) { unzip.push(new Uint8Array(0), true); resolve(); return; }
                    unzip.push(value);
                    return pump();
                }).catch(reject);

            pump();
        });

        console.log("[Worker] Stream done. Parsed files:", parsedResults.length);

        // ✅ Upload to R2 after streaming is complete
        console.log("[Worker] Uploading to R2...");
        await Promise.allSettled(
            parsedResults.map(async ({ destPath, buffer }) => {
                await env.DICOM_BUCKET.put(destPath, buffer, {
                    httpMetadata: { contentType: "application/dicom" },
                });
            })
        );

        console.log("[Worker] Building studies map...");
        const studiesMap = new Map<string, DicomStudy>();
        for (const { sUID, destPath, metadata } of parsedResults) {
            if (!studiesMap.has(sUID)) {
                studiesMap.set(sUID, buildStudy(metadata, userId));
            }
            studiesMap.get(sUID)!.instances.push(
                buildInstance(metadata, `${env.STORAGE_DOMAIN}/${destPath}`)
            );
        }

        console.log("[Worker] Inserting studies into Supabase...");
        const insertedStudies = await batchInsertStudies(studiesMap, userId, supabase);

        console.log("[Worker] Deleting zip from R2...");
        await env.DICOM_BUCKET.delete(storagePath);

        console.log("[Worker] Done. Studies:", insertedStudies.length);
        await supabase
            .from("dicom_processing_job")
            .update({
                status: "done",
                studies: insertedStudies,
                updated_at: new Date().toISOString(),
            })
            .eq("id", jobId);

    } catch (error) {
        console.error("[Worker] Error:", error);
        await supabase
            .from("dicom_processing_job")
            .update({
                status: "failed",
                error: error instanceof Error ? error.message : String(error),
                updated_at: new Date().toISOString(),
            })
            .eq("id", jobId);
    }
}

async function batchInsertStudies(
    studiesMap: Map<string, DicomStudy>,
    userId: string,
    supabase: SupabaseClient
): Promise<{ id: string; state: string }[]> {
    const results: { id: string; state: string }[] = [];
    const sUIDs = Array.from(studiesMap.keys());

    const { data: existing } = await supabase
        .from("dicom")
        .select("id, study_instance_uid, instances")
        .eq("user_id", userId)
        .in("study_instance_uid", sUIDs);

    const existingMap = new Map(existing?.map((d) => [d.study_instance_uid, d]) ?? []);

    await Promise.allSettled(
        Array.from(studiesMap.values()).map(async (study) => {
            study.instances.sort((a, b) => a.instance_number - b.instance_number);
            const found = existingMap.get(study.study_instance_uid);

            if (!found) {
                const { data } = await supabase
                    .from("dicom")
                    .insert(study)
                    .select("id")
                    .single();
                if (data) results.push({ id: data.id, state: "inserted" });
            } else if (!found.instances?.length) {
                await supabase
                    .from("dicom")
                    .update({ instances: study.instances })
                    .eq("id", found.id);
                results.push({ id: found.id, state: "inserted" });
            } else {
                results.push({ id: found.id, state: "duplicated" });
            }
        })
    );

    return results;
}