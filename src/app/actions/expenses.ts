"use server";

import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  AccessError,
  requireRowAccess,
  requireStorageKeyAccess,
  requireWorkspaceAccess,
} from "@/lib/access";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { revalidatePath } from "next/cache";
import { r2, uploadToR2, BUCKET } from "@/lib/r2";

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
  invoice_series?: string | null;
  invoice_number?: string | null;
  issued_at?: string | null;
  created_by?: string | null;
  provider_id?: string | null;
  stage_id?: string | null; // ← agregar
  level_id?: string | null;
  tax_status?: "con_igv" | "sin_igv" | "sin_comprobante" | null;
  items?: ExpenseItemInput[];
};

export type ExpenseItemInput = {
  material_id: string;
  brand_id?: string | null;
  unit_id: string;
  quantity: number;
  unit_price?: number | null;
};

export type ExpenseItem = {
  id: string;
  quantity: number;
  unit_price: number | null;
  subtotal: number | null;
  material: { id: string; name: string };
  brand: { id: string; name: string } | null;
  unit: { id: string; name: string };
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

export async function getUploadUrl(
  expenseId: string,
  workspaceSlug: string,
  fileName: string,
  fileType: string,
): Promise<{ url: string; storagePath: string }> {
  const ext = fileName.split(".").pop();
  const storagePath = `${workspaceSlug}/${expenseId}/${crypto.randomUUID()}.${ext}`;
  await requireStorageKeyAccess(storagePath);

  const url = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: storagePath,
      ContentType: fileType,
    }),
    { expiresIn: 300 },
  );

  return { url, storagePath };
}

export type DuplicateCandidate = {
  id: string;
  amount: number;
  paid_at: string;
  provider_name: string | null;
  invoice_series: string | null;
  invoice_number: string | null;
};

export async function checkDuplicateExpenses(
  workspaceId: string,
  amount: number,
  paidAt: string,
  providerId?: string | null,
): Promise<DuplicateCandidate[]> {
  await requireWorkspaceAccess(workspaceId);
  let query = supabaseAdmin
    .from("expense")
    .select("id, amount, paid_at, invoice_series, invoice_number, provider:provider_id(name)")
    .eq("workspace_id", workspaceId)
    .eq("amount", amount)
    .eq("paid_at", paidAt);

  if (providerId) {
    query = query.eq("provider_id", providerId);
  }

  const { data } = await query.limit(5);
  return (data ?? []).map((r) => {
    const prov = Array.isArray(r.provider) ? r.provider[0] : r.provider;
    return {
      id: r.id,
      amount: r.amount,
      paid_at: r.paid_at,
      provider_name: (prov as { name: string } | null)?.name ?? null,
      invoice_series: r.invoice_series,
      invoice_number: r.invoice_number,
    };
  });
}

export async function createExpense(
  input: CreateExpenseInput,
): Promise<{ id?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "No autenticado" };
  await requireWorkspaceAccess(input.workspace_id);

  // 1. Resolve provider
  let providerId: string | null = null;
  try {
    providerId = await resolveProvider(input.workspace_id, input.provider_ruc, input.provider_name);
  } catch (err) {
    console.error("createExpense error:", err);
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
      stage_id: input.stage_id ?? null,
      level_id: input.level_id ?? null,
      tax_status: input.tax_status ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (expenseError) return { error: expenseError.message };

  if (input.items?.length) {
    const itemsError = await insertExpenseItems(expense.id, input.items);
    if (itemsError) return { error: itemsError };
  }

  revalidatePath(`/admin/workspaces/${input.workspace_slug}/expenses`);
  return { id: expense.id };
}

async function insertExpenseItems(
  expenseId: string,
  items: ExpenseItemInput[],
): Promise<string | null> {
  const rows = items.map((item) => ({
    expense_id: expenseId,
    material_id: item.material_id,
    brand_id: item.brand_id || null,
    unit_id: item.unit_id,
    quantity: item.quantity,
    unit_price: item.unit_price ?? null,
    subtotal: item.unit_price != null ? Math.round(item.quantity * item.unit_price) : null,
  }));

  const { error } = await supabaseAdmin.from("expense_item").insert(rows);
  return error ? error.message : null;
}

export async function getExpenseItems(expenseId: string): Promise<ExpenseItem[]> {
  await requireRowAccess("expense", expenseId);
  const { data, error } = await supabaseAdmin
    .from("expense_item")
    .select(
      "id, quantity, unit_price, subtotal, material:material_id(id, name), brand:brand_id(id, name), unit:unit_id(id, name)",
    )
    .eq("expense_id", expenseId)
    .order("created_at");

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ExpenseItem[];
}

export async function saveExpenseItems(
  expenseId: string,
  items: ExpenseItemInput[],
): Promise<{ error?: string }> {
  await requireRowAccess("expense", expenseId);
  const { error: deleteError } = await supabaseAdmin
    .from("expense_item")
    .delete()
    .eq("expense_id", expenseId);

  if (deleteError) return { error: deleteError.message };

  if (items.length) {
    const itemsError = await insertExpenseItems(expenseId, items);
    if (itemsError) return { error: itemsError };
  }

  return {};
}

export async function registerAttachment(
  expenseId: string,
  storagePath: string,
  fileName: string,
): Promise<{ error?: string }> {
  await requireStorageKeyAccess(storagePath);
  if (!storagePath.startsWith(`${storagePath.split("/")[0]}/${expenseId}/`))
    throw new AccessError();
  const { error } = await supabaseAdmin.from("expense_attachment").insert({
    expense_id: expenseId,
    storage_path: storagePath,
    file_name: fileName,
  });
  return { error: error?.message };
}

export async function deleteExpense(id: string, workspaceSlug: string): Promise<void> {
  await requireRowAccess("expense", id);
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
        Bucket: BUCKET,
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

export async function deleteAttachment(attachmentId: string): Promise<{ error?: string }> {
  try {
    const { data: attachment, error: fetchError } = await supabaseAdmin
      .from("expense_attachment")
      .select("storage_path, expense_id")
      .eq("id", attachmentId)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!attachment) throw new AccessError();
    await requireRowAccess("expense", attachment.expense_id);

    await r2.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: { Objects: [{ Key: attachment.storage_path }] },
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
    await requireStorageKeyAccess(storagePath);

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

// ─── Multipart upload actions ─────────────────────────────────────────────────
// Usa el mismo cliente r2 de @/lib/r2 — mismas credenciales CLOUDFLARE_R2_*

export async function initiateMultipartUpload(
  expenseId: string,
  workspaceSlug: string,
  fileName: string,
  contentType: string,
): Promise<{ uploadId: string; key: string }> {
  // UUID en el key para evitar colisiones si se sube el mismo nombre dos veces
  const ext = fileName.split(".").pop();
  const key = `${workspaceSlug}/${expenseId}/${crypto.randomUUID()}.${ext}`;
  await requireStorageKeyAccess(key);

  const { UploadId } = await r2.send(
    new CreateMultipartUploadCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
  );

  if (!UploadId) throw new Error("R2 no devolvió UploadId");
  return { uploadId: UploadId, key };
}

export async function getPartPresignedUrl(
  key: string,
  uploadId: string,
  partNumber: number,
): Promise<{ url: string }> {
  await requireStorageKeyAccess(key);
  const url = await getSignedUrl(
    r2,
    new UploadPartCommand({ Bucket: BUCKET, Key: key, UploadId: uploadId, PartNumber: partNumber }),
    { expiresIn: 3600 },
  );
  return { url };
}

export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: { PartNumber: number; ETag: string }[],
): Promise<void> {
  await requireStorageKeyAccess(key);
  await r2.send(
    new CompleteMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    }),
  );
}

export async function abortMultipartUpload(key: string, uploadId: string): Promise<void> {
  await requireStorageKeyAccess(key);
  await r2.send(new AbortMultipartUploadCommand({ Bucket: BUCKET, Key: key, UploadId: uploadId }));
}
