"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { revalidatePath } from "next/cache";
import { uploadToR2 } from "@/lib/r2";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { r2 } from "@/lib/r2";

// ─── Types ────────────────────────────────────────────────────────────────────

type SerializedFile = {
  name: string;
  type: string;
  buffer: number[];
};

type CreateExpenseInput = {
  workspace_id: string;
  workspace_slug: string;
  category_id?: string;
  provider_ruc?: string | null;
  provider_name?: string | null;
  amount: number;
  currency: string;
  paid_at: string;
  payment_method?: string | null;
  notes?: string | null;
  files: SerializedFile[];
  invoice_series?: string | null;
  invoice_number?: string | null;
  issued_at?: string | null;
  created_by?: string | null;
  provider_id?: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resolveProvider(
  workspaceId: string,
  ruc: string | null | undefined,
  name: string | null | undefined,
): Promise<string | null> {
  if (!ruc) return null;

  const { data, error } = await supabaseAdmin
    .from("provider")
    .upsert(
      {
        workspace_id: workspaceId,
        ruc,
        name: name?.trim() || ruc,
      },
      {
        onConflict: "workspace_id,ruc",
        ignoreDuplicates: false,
      },
    )
    .select("id")
    .single();

  if (error) throw new Error(`Provider resolution failed: ${error.message}`);
  return data.id;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function createExpense(input: CreateExpenseInput): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "No autenticado" };

  // 1. Resolve provider (find or create by RUC)
  let providerId: string | null = null;
  try {
    providerId = await resolveProvider(input.workspace_id, input.provider_ruc, input.provider_name);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al resolver proveedor" };
  }

  // 2. Insert expense
  const { data: expense, error: expenseError } = await supabaseAdmin
    .from("expense")
    .insert({
      workspace_id: input.workspace_id,
      category_id: input.category_id ?? null,
      provider_id: providerId,
      amount: input.amount,
      currency: input.currency,
      paid_at: input.paid_at,
      payment_method: input.payment_method ?? null,
      notes: input.notes ?? null,
      invoice_series: input.invoice_series ?? null,
      invoice_number: input.invoice_number ?? null,
      issued_at: input.issued_at ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (expenseError) return { error: expenseError.message };

  // 3. Upload files to R2 + insert expense_attachment rows
  for (const file of input.files) {
    const ext = file.name.split(".").pop();
    const uniqueName = `${crypto.randomUUID()}.${ext}`;
    const storagePath = `${input.workspace_slug}/${expense.id}/${uniqueName}`;

    await uploadToR2(storagePath, Buffer.from(file.buffer), file.type);

    await supabaseAdmin.from("expense_attachment").insert({
      expense_id: expense.id,
      storage_path: storagePath,
      file_name: file.name,
    });
  }

  revalidatePath(`/admin/workspaces/${input.workspace_slug}/expenses`);
  return {};
}

export async function deleteExpense(id: string, workspaceSlug: string): Promise<void> {
  // 1. Obtener attachments del expense
  const { data: attachments, error: fetchError } = await supabaseAdmin
    .from("expense_attachment")
    .select("storage_path")
    .eq("expense_id", id);

  if (fetchError) throw new Error(fetchError.message);

  // 2. Eliminar archivos de R2
  if (attachments && attachments.length > 0) {
    await r2.send(
      new DeleteObjectsCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
        Delete: {
          Objects: attachments.map((a) => ({ Key: a.storage_path })),
        },
      }),
    );
  }

  // 3. Eliminar expense (cascade borra expense_attachment)
  const { error } = await supabaseAdmin.from("expense").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/workspaces/${workspaceSlug}/expenses`);
}

export async function deleteAttachment(
  attachmentId: string,
  storagePath: string,
): Promise<{ error?: string }> {
  try {
    await r2.send(
      new DeleteObjectsCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
        Delete: { Objects: [{ Key: storagePath }] },
      }),
    );

    const { error } = await supabaseAdmin
      .from("expense_attachment")
      .delete()
      .eq("id", attachmentId);

    if (error) throw new Error(error.message);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al eliminar adjunto" };
  }
}

export async function uploadAttachment(
  expenseId: string,
  workspaceSlug: string,
  file: SerializedFile,
): Promise<{ error?: string }> {
  try {
    const ext = file.name.split(".").pop();
    const storagePath = `${workspaceSlug}/${expenseId}/${crypto.randomUUID()}.${ext}`;

    await uploadToR2(storagePath, Buffer.from(file.buffer), file.type);

    const { error } = await supabaseAdmin.from("expense_attachment").insert({
      expense_id: expenseId,
      storage_path: storagePath,
      file_name: file.name,
    });

    if (error) throw new Error(error.message);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al subir archivo" };
  }
}
