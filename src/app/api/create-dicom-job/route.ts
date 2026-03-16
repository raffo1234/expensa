// app/api/create-dicom-job/route.ts
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
    const { storagePath, userId, fileId } = await req.json();

    const { data } = await supabase
        .from("dicom_processing_job")
        .insert({
            user_id: userId,
            file_id: fileId,
            storage_path: storagePath,
            status: "pending",
        })
        .select("id")
        .single();

    return Response.json({ jobId: data!.id });
}