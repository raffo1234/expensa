"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireRowAccess, requireWorkspaceAccess } from "@/lib/access";

export async function createProvider({
  workspace_id,
  name,
  ruc,
}: {
  workspace_id: string;
  name: string;
  ruc: string;
}): Promise<{ provider?: { id: string; name: string; ruc: string }; error?: string }> {
  await requireWorkspaceAccess(workspace_id);
  const { data, error } = await supabaseAdmin
    .from("provider")
    .insert({ workspace_id, name, ruc })
    .select("id, name, ruc")
    .single();

  if (error) return { error: error.message };
  return { provider: data };
}

export type ProviderRecord = {
  id: string;
  workspace_id: string;
  ruc: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export async function listProviders(workspaceId: string): Promise<ProviderRecord[]> {
  await requireWorkspaceAccess(workspaceId);
  const { data, error } = await supabaseAdmin
    .from("provider")
    .select("id, workspace_id, ruc, name, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function findProviderByRuc(
  workspaceId: string,
  ruc: string,
): Promise<{ id: string; name: string; ruc: string } | null> {
  await requireWorkspaceAccess(workspaceId);
  const { data } = await supabaseAdmin
    .from("provider")
    .select("id, name, ruc")
    .eq("workspace_id", workspaceId)
    .eq("ruc", ruc)
    .maybeSingle();
  return data;
}

export async function updateProvider(
  id: string,
  input: { ruc: string; name: string },
): Promise<{ error?: string }> {
  await requireRowAccess("provider", id);
  const { error } = await supabaseAdmin
    .from("provider")
    .update({ ruc: input.ruc, name: input.name })
    .eq("id", id);
  return error ? { error: error.message } : {};
}

export async function deleteProvider(id: string): Promise<{ error?: string }> {
  await requireRowAccess("provider", id);
  const { error } = await supabaseAdmin.from("provider").delete().eq("id", id);
  return error ? { error: error.message } : {};
}
