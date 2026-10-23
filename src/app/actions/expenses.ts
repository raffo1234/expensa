"use server";

import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  AccessError,
  requirePermission,
  requireRowAccess,
  requireUser,
  requireWorkspaceAccess,
} from "@/lib/access";
import { Permissions } from "@/types/propertyState";
import { createUploadToken, verifyUploadToken } from "@/lib/uploadToken";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { revalidatePath } from "next/cache";
import { r2, BUCKET } from "@/lib/r2";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  await requirePermission(Permissions.CREATE_EXPENSE);
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

export type ExpenseUpdate = {
  provider_id: string | null;
  amount: number;
  currency: string;
  issued_at: string | null;
  paid_at: string;
  payment_method: string | null;
  tax_status: "con_igv" | "sin_igv" | "sin_comprobante" | null;
  notes: string | null;
  category_id: string | null;
  invoice_series: string | null;
  invoice_number: string | null;
  stage_id: string | null;
  level_id: string | null;
};

export async function updateExpense(
  expenseId: string,
  patch: ExpenseUpdate,
): Promise<{ error?: string }> {
  await requireRowAccess("expense", expenseId);
  // Only these columns can change; workspace and creator stay fixed.
  const { error } = await supabaseAdmin
    .from("expense")
    .update({
      provider_id: patch.provider_id,
      amount: patch.amount,
      currency: patch.currency,
      issued_at: patch.issued_at,
      paid_at: patch.paid_at,
      payment_method: patch.payment_method,
      tax_status: patch.tax_status,
      notes: patch.notes,
      category_id: patch.category_id,
      invoice_series: patch.invoice_series,
      invoice_number: patch.invoice_number,
      stage_id: patch.stage_id,
      level_id: patch.level_id,
    })
    .eq("id", expenseId);
  return error ? { error: error.message } : {};
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

// ─── Attachment uploads ───────────────────────────────────────────────────────
// The server picks the storage key from database values and returns a signed
// upload token; later steps only accept that token, never a path from the client.

// File types an attachment may have, and the extension the server stores them
// with. Anything else (HTML, SVG, scripts…) is rejected so it can never be served
// back from our domain.
const ALLOWED_ATTACHMENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// 5 MB parts (see PART_SIZE in the forms) × 200 = 1 GB per file at most.
const MAX_UPLOAD_PARTS = 200;

async function verifiedUpload(token: string) {
  const user = await requireUser();
  const payload = verifyUploadToken(token, user.id);
  if (!payload) throw new AccessError("Subida no válida o caducada");
  await requireRowAccess("expense", payload.expenseId);
  return payload;
}

export async function initiateMultipartUpload(
  expenseId: string,
  contentType: string,
): Promise<{ token: string }> {
  const user = await requireRowAccess("expense", expenseId);
  const ext = ALLOWED_ATTACHMENT_TYPES[contentType];
  if (!ext) throw new AccessError("Tipo de archivo no permitido");

  // The workspace slug comes from the database, not from the request.
  const { data: expense, error } = await supabaseAdmin
    .from("expense")
    .select("workspace:workspace_id(slug)")
    .eq("id", expenseId)
    .single();
  if (error) throw new Error(error.message);
  const workspace = (
    Array.isArray(expense.workspace) ? expense.workspace[0] : expense.workspace
  ) as { slug: string } | null;
  if (!workspace?.slug) throw new Error("Proyecto no encontrado");

  const key = `${workspace.slug}/${expenseId}/${crypto.randomUUID()}.${ext}`;
  const { UploadId } = await r2.send(
    new CreateMultipartUploadCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
  );
  if (!UploadId) throw new Error("R2 no devolvió UploadId");

  return { token: createUploadToken({ key, uploadId: UploadId, expenseId, userId: user.id }) };
}

export async function getPartPresignedUrl(
  token: string,
  partNumber: number,
): Promise<{ url: string }> {
  const { key, uploadId } = await verifiedUpload(token);
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > MAX_UPLOAD_PARTS) {
    throw new AccessError("Archivo demasiado grande");
  }
  const url = await getSignedUrl(
    r2,
    new UploadPartCommand({ Bucket: BUCKET, Key: key, UploadId: uploadId, PartNumber: partNumber }),
    { expiresIn: 3600 },
  );
  return { url };
}

export async function completeMultipartUpload(
  token: string,
  parts: { PartNumber: number; ETag: string }[],
): Promise<void> {
  const { key, uploadId } = await verifiedUpload(token);
  await r2.send(
    new CompleteMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    }),
  );
}

export async function abortMultipartUpload(token: string): Promise<void> {
  const { key, uploadId } = await verifiedUpload(token);
  await r2.send(new AbortMultipartUploadCommand({ Bucket: BUCKET, Key: key, UploadId: uploadId }));
}

export async function registerAttachment(
  token: string,
  fileName: string,
): Promise<{ error?: string }> {
  const { key, expenseId } = await verifiedUpload(token);

  // A token registers its file once; replaying it must not create duplicates.
  const { data: existing } = await supabaseAdmin
    .from("expense_attachment")
    .select("id")
    .eq("storage_path", key)
    .maybeSingle();
  if (existing) return {};

  const { error } = await supabaseAdmin.from("expense_attachment").insert({
    expense_id: expenseId,
    storage_path: key,
    // Display name only; trimmed and stripped of path separators.
    file_name: fileName.replace(/[\\/]/g, "_").slice(0, 200),
  });
  return { error: error?.message };
}
