"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireRowAccess, requireWorkspaceAccess } from "@/lib/access";

export type Brand = { id: string; name: string };

export async function getBrands(workspaceId: string): Promise<Brand[]> {
  await requireWorkspaceAccess(workspaceId);
  const { data, error } = await supabaseAdmin
    .from("brand")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createBrand({
  workspace_id,
  name,
}: {
  workspace_id: string;
  name: string;
}): Promise<{ brand?: Brand; error?: string }> {
  await requireWorkspaceAccess(workspace_id);
  const { data, error } = await supabaseAdmin
    .from("brand")
    .upsert(
      { workspace_id, name: name.trim() },
      { onConflict: "workspace_id,name", ignoreDuplicates: false },
    )
    .select("id, name")
    .single();

  if (error) return { error: error.message };
  return { brand: data };
}

export async function updateBrand(
  id: string,
  input: { name: string },
): Promise<{ error?: string }> {
  await requireRowAccess("brand", id);
  const { error } = await supabaseAdmin
    .from("brand")
    .update({ name: input.name.trim() })
    .eq("id", id);

  if (error) return { error: error.message };
  return {};
}

export async function deleteBrand(id: string): Promise<{ error?: string }> {
  await requireRowAccess("brand", id);
  const { error } = await supabaseAdmin.from("brand").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}
