import JSZip from "jszip";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { buildInstance, buildStudy, DicomStudy, parseDicomMetadata } from "./dicomWorkerUtils";

export interface Env {
    DICOM_BUCKET: R2Bucket;
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    STORAGE_DOMAIN: string;
}

// ✅ R2 Event Notification shape — comes through Cloudflare Queue
interface R2EventNotification {
    account: string;
    bucket: string;
    eventTime: string;
    action: string;
    object: {
        key: string;
        size: number;
        etag: string;
    };
}

export default {
    // ✅ Queue handler — R2 Event Notifications are delivered via CF Queue, not fetch
    async queue(
        batch: MessageBatch<R2EventNotification>,
        env: Env,
        ctx: ExecutionContext
    ): Promise<void> {
        for (const message of batch.messages) {
            const { object } = message.body;
            const storagePath = object.key;

            if (!storagePath.startsWith("incoming/")) {
                message.ack();
                continue;
            }

            // ✅ waitUntil — don't block queue consumer, process in background
            ctx.waitUntil(
                processZip(storagePath, env).then(() => message.ack()).catch(() => message.retry())
            );
        }
    },
};

async function processZip(storagePath: string, env: Env): Promise<void> {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: job } = await supabase
        .from("dicom_processing_job")
        .select("id, user_id")
        .eq("storage_path", storagePath)
        .single();

    // ✅ Narrow user_id to string before passing anywhere
    if (!job?.id || !job?.user_id) return;
    const userId: string = job.user_id;
    const jobId: string = job.id;

    await supabase
        .from("dicom_processing_job")
        .update({ status: "processing", updated_at: new Date().toISOString() }) // ✅ ISO string
        .eq("id", jobId);

    try {
        const zipObject = await env.DICOM_BUCKET.get(storagePath);
        if (!zipObject) throw new Error(`File not found in R2: ${storagePath}`);

        const zipBuffer = await zipObject.arrayBuffer();
        const zip = await new JSZip().loadAsync(zipBuffer);

        // ✅ Fix race condition — collect results first, then build studiesMap
        // Avoids concurrent has()/set() on the same sUID across parallel awaits
        const parsedResults: Array<{
            sUID: string;
            destPath: string;
            buffer: Uint8Array;
            metadata: NonNullable<ReturnType<typeof parseDicomMetadata>>;
        }> = [];

        await Promise.allSettled(
            Object.entries(zip.files)
                .filter(
                    ([path, file]) =>
                        !file.dir &&
                        !path.includes("__MACOSX") &&
                        !path.toLowerCase().includes("dicomdir")
                )
                .map(async ([path, file]) => {
                    try {
                        const buffer = await file.async("uint8array");
                        if (buffer.length === 0) return;

                        const metadata = parseDicomMetadata(buffer);
                        if (!metadata?.studyInstanceUID) return;

                        const sUID = metadata.studyInstanceUID;
                        const destPath = `dicom/${userId}/${sUID}/${metadata.seriesInstanceUID}/${metadata.sopInstanceUID}.dcm`;

                        await env.DICOM_BUCKET.put(destPath, buffer, {
                            httpMetadata: { contentType: "application/dicom" },
                        });

                        // ✅ Push to array — no Map mutation inside parallel tasks
                        parsedResults.push({ sUID, destPath, buffer, metadata });
                    } catch (err) {
                        console.error(`[Worker] Error processing ${path}:`, err);
                    }
                })
        );

        // ✅ Build studiesMap sequentially after all parallel work is done — no race
        const studiesMap = new Map<string, DicomStudy>();
        for (const { sUID, destPath, metadata } of parsedResults) {
            if (!studiesMap.has(sUID)) {
                studiesMap.set(sUID, buildStudy(metadata, userId));
            }
            studiesMap.get(sUID)!.instances.push(
                buildInstance(metadata, `${env.STORAGE_DOMAIN}/${destPath}`)
            );
        }

        const insertedStudies = await batchInsertStudies(studiesMap, userId, supabase);

        await env.DICOM_BUCKET.delete(storagePath);

        // ✅ UPDATE triggers Supabase Realtime → client notified instantly
        await supabase
            .from("dicom_processing_job")
            .update({
                status: "done",
                studies: insertedStudies,
                updated_at: new Date().toISOString(), // ✅ ISO string
            })
            .eq("id", jobId);

    } catch (error) {
        await supabase
            .from("dicom_processing_job")
            .update({
                status: "failed",
                error: error instanceof Error ? error.message : String(error),
                updated_at: new Date().toISOString(), // ✅ ISO string
            })
            .eq("id", jobId);
    }
}

async function batchInsertStudies(
    studiesMap: Map<string, DicomStudy>,
    userId: string,
    supabase: SupabaseClient // ✅ precise type
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