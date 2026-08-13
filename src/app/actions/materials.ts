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
