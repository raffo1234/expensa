"use server";

import { getCurrentUser } from "@/lib/getCurrentUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";

export async function createWorkspace(name: string, slug: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabaseAdmin
    .from("workspace")
    .insert({ name, slug, created_by: user.id })
    .select("id, name, slug, created_at")
    .single();

  if (error) {
    throw new Error(error.code === "23505" ? "El slug ya está en uso" : error.message);
  }

  revalidatePath("/admin/workspaces");
  return data;
}
