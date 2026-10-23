import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { auth } from "@/lib/auth";

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
  return requireAccess({ workspaceId: workspaceId ?? null });
}

/**
 * For pages: the workspace behind `slug` if the caller may access it, else
 * null so the page can answer 404 (without revealing that it exists).
 */
export async function findAccessibleWorkspaceBySlug(slug: string) {
  const session = await auth();
  const sessionUserId = session?.user?.id;
  if (!sessionUserId) throw new AccessError("No autenticado");
  // User, project and the user's projects are looked up side by side.
  const [user, { data, error }, ids] = await Promise.all([
    getCurrentUser(),
    supabaseAdmin
      .from("workspace")
      .select("id, name, slug, created_at, created_by")
      .eq("slug", slug)
      .maybeSingle(),
    accessibleWorkspaceIds(sessionUserId),
  ]);
  if (!user || user.id !== sessionUserId) throw new AccessError("No autenticado");
  if (error) throw new Error(error.message);
  if (!data || !ids.has(data.id)) return null;
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

/**
 * Confirms the caller can access the workspace that owns this row. The row's
 * workspace, the user and the user's projects are looked up side by side.
 */
export async function requireRowAccess(table: WorkspaceScopedTable, id: string) {
  const session = await auth();
  const sessionUserId = session?.user?.id;
  if (!sessionUserId) throw new AccessError("No autenticado");
  const [{ data, error }, user, ids] = await Promise.all([
    supabaseAdmin.from(table).select("workspace_id").eq("id", id).maybeSingle(),
    getCurrentUser(),
    accessibleWorkspaceIds(sessionUserId),
  ]);
  if (error) throw new Error(error.message);
  if (!user || user.id !== sessionUserId) throw new AccessError("No autenticado");
  const workspaceId = data?.workspace_id as string | undefined;
  if (!workspaceId || !ids.has(workspaceId)) throw new AccessError();
  return user;
}

/**
 * Confirms the caller's role has at least one of the given permissions. The
 * role always comes from the database, never from the request.
 */
export async function requirePermission(...slugs: string[]) {
  return requireAccess({ permissions: slugs });
}

/** True if the role has at least one of these permissions. */
async function roleHasAny(roleId: string, slugs: string[]): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("role_permission")
    .select("permission!inner(slug)")
    .eq("role_id", roleId)
    .in("permission.slug", slugs)
    .limit(1);
  if (error) throw new Error(error.message);
  return !!data?.length;
}

/**
 * One check for who's calling, the project they touch and the permission they
 * need. The lookups run side by side (one database round trip instead of
 * three in a row), which is most of a list page's load time.
 *
 * The role used is always the one in the database: the session's copy only
 * lets the permission lookup start early, and is re-checked against the
 * database role when they differ (e.g. right after a role change).
 */
export async function requireAccess({
  workspaceId,
  permissions,
}: {
  /** Pass to require access to this project (null always fails). */
  workspaceId?: string | null;
  permissions?: string[];
} = {}) {
  const session = await auth();
  const sessionUserId = session?.user?.id;
  if (!sessionUserId) throw new AccessError("No autenticado");
  const sessionRoleId = (session.user as { role_id?: string | null }).role_id ?? null;

  const checkWorkspace = workspaceId !== undefined;
  const checkPermissions = !!permissions?.length;

  const [user, workspaceIds, sessionRoleAllowed] = await Promise.all([
    getCurrentUser(),
    checkWorkspace ? accessibleWorkspaceIds(sessionUserId) : null,
    checkPermissions && sessionRoleId ? roleHasAny(sessionRoleId, permissions!) : null,
  ]);

  if (!user || user.id !== sessionUserId) throw new AccessError("No autenticado");
  if (checkWorkspace && (!workspaceId || !workspaceIds!.has(workspaceId))) {
    throw new AccessError();
  }
  if (checkPermissions) {
    if (!user.roleId) throw new AccessError();
    const allowed =
      user.roleId === sessionRoleId
        ? sessionRoleAllowed
        : await roleHasAny(user.roleId, permissions!);
    if (!allowed) throw new AccessError();
  }
  return user;
}
