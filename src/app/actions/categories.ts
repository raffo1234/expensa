"use server";

import { Permissions } from "@/types/propertyState";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requirePermission, requireRowAccess, requireWorkspaceAccess } from "@/lib/access";

type CategoryInput = {
  workspace_id: string;
  name: string;
  color?: string | null;
};

export async function createCategory(
  input: CategoryInput,
): Promise<{ category?: { id: string; name: string; color: string | null }; error?: string }> {
  await requireWorkspaceAccess(input.workspace_id);
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
  await requireRowAccess("category", id);
  const { error } = await supabaseAdmin
    .from("category")
    .update({ name: input.name.trim(), color: input.color ?? null })
    .eq("id", id);

  if (error) return { error: error.message };
  return {};
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  await requireRowAccess("category", id);
  const { error } = await supabaseAdmin.from("category").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}

/**
 * Whether expenses in this category need a guía de remisión (pasajes,
 * servicios... don't). Admins only: it switches the control off for a whole
 * category.
 */
export async function setCategoryRequiresGuide(
  categoryId: string,
  requiresGuide: boolean,
): Promise<{ error?: string }> {
  try {
    await Promise.all([
      requireRowAccess("category", categoryId),
      requirePermission(Permissions.EXEMPT_GUIDE),
    ]);
    const { error } = await supabaseAdmin
      .from("category")
      .update({ requires_guide: requiresGuide })
      .eq("id", categoryId);
    if (error) throw new Error(error.message);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo guardar" };
  }
}
