"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type Material = { id: string; name: string };

export async function getMaterials(workspaceId: string): Promise<Material[]> {
  const { data, error } = await supabaseAdmin
    .from("material")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createMaterial({
  workspace_id,
  name,
}: {
  workspace_id: string;
  name: string;
}): Promise<{ material?: Material; error?: string }> {
  const { data, error } = await supabaseAdmin
    .from("material")
    .upsert(
      { workspace_id, name: name.trim() },
      { onConflict: "workspace_id,name", ignoreDuplicates: false },
    )
    .select("id, name")
    .single();

  if (error) return { error: error.message };
  return { material: data };
}

export async function updateMaterial(
  id: string,
  input: { name: string },
): Promise<{ error?: string }> {
  const { error } = await supabaseAdmin
    .from("material")
    .update({ name: input.name.trim() })
    .eq("id", id);

  if (error) return { error: error.message };
  return {};
}

export async function deleteMaterial(id: string): Promise<{ error?: string }> {
  const { error } = await supabaseAdmin.from("material").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export type MaterialReportRow = {
  id: string;
  expense_id: string;
  paid_at: string;
  currency: string;
  quantity: number;
  unit_price: number | null;
  subtotal: number | null;
  material: { id: string; name: string };
  brand: { id: string; name: string } | null;
  unit: { id: string; name: string };
  level: { id: string; name: string } | null;
};

export async function getMaterialsReport(workspaceId: string): Promise<MaterialReportRow[]> {
  const { data, error } = await supabaseAdmin
    .from("expense_item")
    .select(
      `id, expense_id, quantity, unit_price, subtotal,
       material:material_id(id, name),
       brand:brand_id(id, name),
       unit:unit_id(id, name),
       expense:expense_id!inner(workspace_id, paid_at, currency, level:level_id(id, name))`,
    )
    .eq("expense.workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    expense_id: string;
    quantity: number;
    unit_price: number | null;
    subtotal: number | null;
    material: { id: string; name: string };
    brand: { id: string; name: string } | null;
    unit: { id: string; name: string };
    expense: {
      workspace_id: string;
      paid_at: string;
      currency: string;
      level: { id: string; name: string } | null;
    };
  };

  return ((data ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
    expense_id: row.expense_id,
    paid_at: row.expense.paid_at,
    currency: row.expense.currency,
    quantity: row.quantity,
    unit_price: row.unit_price,
    subtotal: row.subtotal,
    material: row.material,
    brand: row.brand,
    unit: row.unit,
    level: row.expense.level,
  }));
}
