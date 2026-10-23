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

/**
 * For pages: the workspace behind `slug` if the caller may access it, else
 * null so the page can answer 404 (without revealing that it exists).
 */
export async function findAccessibleWorkspaceBySlug(slug: string) {
  const user = await requireUser();
  const { data, error } = await supabaseAdmin
    .from("workspace")
    .select("id, name, slug, created_at, created_by")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !(await accessibleWorkspaceIds(user.id)).has(data.id)) return null;
  return data;
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
 * Confirms the caller's role has at least one of the given permissions. The
 * role always comes from the database, never from the request.
 */
export async function requirePermission(...slugs: string[]) {
  const user = await requireUser();
  if (!user.roleId) throw new AccessError();
  const { data, error } = await supabaseAdmin
    .from("role_permission")
    .select("permission!inner(slug)")
    .eq("role_id", user.roleId)
    .in("permission.slug", slugs);
  if (error) throw new Error(error.message);
  if (!data?.length) throw new AccessError();
  return user;
}
