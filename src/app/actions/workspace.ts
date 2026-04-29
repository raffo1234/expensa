"use server";

import { getCurrentUser } from "@/lib/getCurrentUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { r2 } from "@/lib/r2";

export async function createWorkspace(name: string, slug: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabaseAdmin
    .from("workspace")
    .insert({ name, slug, created_by: user.id })
    .select("id, name, slug, created_at")
    .single();

  if (error) {
    throw new Error(error.code === "23505" ? "El slug ya está en uso" : error.message);
  }

  revalidatePath("/admin/workspaces");
  return data;
}

export async function deleteWorkspace(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado");

  const { data: attachments, error: fetchError } = await supabaseAdmin
    .from("expense_attachment")
    .select("storage_path, expense!inner(workspace_id)")
    .eq("expense.workspace_id", id);

  if (fetchError) throw new Error(fetchError.message);

  // 2. Eliminar archivos de R2
  if (attachments && attachments.length > 0) {
    await r2.send(
      new DeleteObjectsCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
        Delete: {
          Objects: attachments.map((a) => ({ Key: a.storage_path })),
        },
      })
    );
  }

  // 3. Eliminar workspace (cascade borra expenses y attachments)
  const { error } = await supabaseAdmin
    .from("workspace")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/workspaces");
}
