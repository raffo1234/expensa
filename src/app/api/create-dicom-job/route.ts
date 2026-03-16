import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
    try {
        const { storagePath, userId, fileId } = await req.json();

        const { data, error } = await supabase
            .from("dicom_processing_job")
            .insert({
                user_id: userId,
                file_id: fileId,
                storage_path: storagePath,
                status: "pending",
            })
            .select("id")
            .single();

        if (error) throw error;

        const jobId = data!.id;

        fetch(`${process.env.WORKER_URL}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storagePath, userId, jobId }),
        }).catch(console.error);

        return Response.json({ jobId });
    } catch (err: unknown) {
        const message = err instanceof Error
            ? err.message
            : typeof err === "object"
                ? JSON.stringify(err)
                : String(err);
        console.error("[create-dicom-job] error:", message);
        return Response.json({ error: message }, { status: 500 });
    }
}