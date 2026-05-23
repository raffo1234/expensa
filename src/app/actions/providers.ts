"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function createProvider({
  workspace_id,
  name,
  ruc,
}: {
  workspace_id: string;
  name: string;
  ruc: string;
}): Promise<{ provider?: { id: string; name: string; ruc: string }; error?: string }> {
  const { data, error } = await supabaseAdmin
    .from("provider")
    .insert({ workspace_id, name, ruc })
    .select("id, name, ruc")
    .single();

  if (error) return { error: error.message };
  return { provider: data };
}
