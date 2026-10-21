"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireWorkspaceAccess } from "@/lib/access";

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
