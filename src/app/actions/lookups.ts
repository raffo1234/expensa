"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireWorkspaceAccess, requireWorkspaceAccessBySlug } from "@/lib/access";

// Workspace lists used by the expense forms and filters, read on the server
// after checking the caller can access the workspace.

async function rows<T>(
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getWorkspaceBySlug(slug: string) {
  return requireWorkspaceAccessBySlug(slug);
}

export async function getCategories(workspaceId: string) {
  await requireWorkspaceAccess(workspaceId);
  return rows<{ id: string; name: string; color: string | null }>(
    supabaseAdmin
      .from("category")
      .select("id, name, color")
      .eq("workspace_id", workspaceId)
      .order("name"),
  );
}

export async function getProviders(workspaceId: string) {
  await requireWorkspaceAccess(workspaceId);
  return rows<{ id: string; name: string; ruc: string }>(
    supabaseAdmin
      .from("provider")
      .select("id, name, ruc")
      .eq("workspace_id", workspaceId)
      .order("name"),
  );
}

export async function getStages(workspaceId: string) {
  await requireWorkspaceAccess(workspaceId);
  return rows<{ id: string; name: string; order: number; color: string | null }>(
    supabaseAdmin
      .from("stage")
      .select("id, name, order, color")
      .eq("workspace_id", workspaceId)
      .order("order"),
  );
}

export async function getLevels(workspaceId: string) {
  await requireWorkspaceAccess(workspaceId);
  return rows<{ id: string; name: string; order: number }>(
    supabaseAdmin
      .from("level")
      .select("id, name, order")
      .eq("workspace_id", workspaceId)
      .order("order"),
  );
}

const EXPENSE_EDIT_COLUMNS = `
  id, amount, currency, issued_at, paid_at, payment_method, notes, created_at, invoice_series, invoice_number, tax_status,
  provider:provider_id(id, name),
  category:category_id(id, name, color),
  stage:stage_id(id, name, color),
  level:level_id(id, name),
  expense_attachment(id, file_name, storage_path)
`;

export async function getExpenseForEdit(expenseId: string, workspaceId: string) {
  await requireWorkspaceAccess(workspaceId);
  const { data, error } = await supabaseAdmin
    .from("expense")
    .select(EXPENSE_EDIT_COLUMNS)
    .eq("id", expenseId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
