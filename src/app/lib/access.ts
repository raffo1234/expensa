import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getCurrentUser } from "@/lib/getCurrentUser";

// Server-side access checks. Server actions and API routes are public HTTP
// endpoints: anyone can call them with any arguments, so every one of them must
// confirm who is calling and that the data they touch is theirs.
//
// A user can access a workspace they created or one they were assigned to
// (user_workspace) — the same rule the workspace and summary pages use.

export class AccessError extends Error {
  constructor(message = "No tienes acceso a este recurso") {
    super(message);
    this.name = "AccessError";
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AccessError("No autenticado");
  return user;
}

const accessibleWorkspaceIds = cache(async (userId: string): Promise<Set<string>> => {
  const [owned, assigned] = await Promise.all([
    supabaseAdmin.from("workspace").select("id").eq("created_by", userId),
    supabaseAdmin.from("user_workspace").select("workspace_id").eq("user_id", userId),
  ]);
  if (owned.error) throw new Error(owned.error.message);
  if (assigned.error) throw new Error(assigned.error.message);
  return new Set([
    ...(owned.data ?? []).map((w) => w.id as string),
    ...(assigned.data ?? []).map((w) => w.workspace_id as string),
  ]);
});

export async function getAccessibleWorkspaceIds(): Promise<string[]> {
  const user = await requireUser();
  return [...(await accessibleWorkspaceIds(user.id))];
}

export async function requireWorkspaceAccess(workspaceId: string | null | undefined) {
  const user = await requireUser();
  if (!workspaceId || !(await accessibleWorkspaceIds(user.id)).has(workspaceId)) {
    throw new AccessError();
  }
  return user;
}

export async function requireWorkspaceAccessBySlug(slug: string) {
  const { data, error } = await supabaseAdmin
    .from("workspace")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  await requireWorkspaceAccess(data?.id);
  return data!;
}

type WorkspaceScopedTable = "expense" | "material" | "brand" | "unit" | "category" | "provider";

/** Confirms the caller can access the workspace that owns this row. */
export async function requireRowAccess(table: WorkspaceScopedTable, id: string) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("workspace_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return requireWorkspaceAccess(data?.workspace_id as string | undefined);
}

/**
 * Attachment keys are `<workspace slug>/<expense id>/<file>`. Confirms the key
 * belongs to an expense the caller can access and that the slug matches that
 * expense's workspace, so a key can't point into someone else's files.
 */
export async function requireStorageKeyAccess(key: string) {
  const [slug, expenseId, file] = key.split("/");
  if (!slug || !expenseId || !file || key.includes("..")) throw new AccessError();

  const { data, error } = await supabaseAdmin
    .from("expense")
    .select("workspace_id, workspace:workspace_id(slug)")
    .eq("id", expenseId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const workspace = (Array.isArray(data?.workspace) ? data?.workspace[0] : data?.workspace) as
    | { slug: string }
    | null
    | undefined;
  if (!data || workspace?.slug !== slug) throw new AccessError();
  return requireWorkspaceAccess(data.workspace_id as string);
}
