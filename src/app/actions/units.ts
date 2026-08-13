"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type Unit = { id: string; name: string };

export async function getUnits(workspaceId: string): Promise<Unit[]> {
  const { data, error } = await supabaseAdmin
    .from("unit")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createUnit({
  workspace_id,
  name,
}: {
  workspace_id: string;
  name: string;
}): Promise<{ unit?: Unit; error?: string }> {
  const { data, error } = await supabaseAdmin
    .from("unit")
    .upsert(
      { workspace_id, name: name.trim() },
      { onConflict: "workspace_id,name", ignoreDuplicates: false },
    )
    .select("id, name")
    .single();

  if (error) return { error: error.message };
  return { unit: data };
}

export async function updateUnit(
  id: string,
  input: { name: string },
): Promise<{ error?: string }> {
  const { error } = await supabaseAdmin
    .from("unit")
    .update({ name: input.name.trim() })
    .eq("id", id);

  if (error) return { error: error.message };
  return {};
}

export async function deleteUnit(id: string): Promise<{ error?: string }> {
  const { error } = await supabaseAdmin.from("unit").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}
