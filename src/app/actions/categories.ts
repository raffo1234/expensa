"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type CategoryInput = {
  workspace_id: string;
  name: string;
  color?: string | null;
};

export async function createCategory(
  input: CategoryInput,
): Promise<{ category?: { id: string; name: string; color: string | null }; error?: string }> {
  const { data, error } = await supabaseAdmin
    .from("category")
    .insert({
      workspace_id: input.workspace_id,
      name: input.name.trim(),
      color: input.color ?? null,
    })
    .select("id, name, color")
    .single();

  if (error) return { error: error.message };
  return { category: data };
}

export async function updateCategory(
  id: string,
  input: { name: string; color?: string | null },
): Promise<{ error?: string }> {
  const { error } = await supabaseAdmin
    .from("category")
    .update({ name: input.name.trim(), color: input.color ?? null })
    .eq("id", id);

  if (error) return { error: error.message };
  return {};
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  const { error } = await supabaseAdmin.from("category").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}
