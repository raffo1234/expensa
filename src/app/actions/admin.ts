"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fetchRolePermissionSlugs } from "@/lib/rolePermissions";
import { AccessError, requirePermission, requireUser } from "@/lib/access";
import { Permissions } from "@/types/propertyState";
import type { UserType } from "@/types/userType";
import { UserStateEnum } from "@/enums/userStatesEnum";

// Administration (users, roles, permissions, settings) and the signed-in
// user's own data. Everything that used to be read or written from the browser
// with the public database key now goes through here, with the caller's
// session and role permissions checked on the server.

const throwIf = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

// ─── Current user ─────────────────────────────────────────────────────────────

/** Permission slugs of the caller's own role (never a role id sent by the client). */
export async function getMyPermissionSlugs(): Promise<string[]> {
  const user = await requireUser();
  return user.roleId ? fetchRolePermissionSlugs(user.roleId) : [];
}

export async function getMyRoleName(): Promise<{ name: string }[]> {
  const user = await requireUser();
  return user.roleName ? [{ name: user.roleName }] : [];
}

export async function getMySetting(settingKey: string): Promise<boolean | null> {
  const user = await requireUser();
  const { data, error } = await supabaseAdmin
    .from("user_setting")
    .select("setting_value")
    .eq("user_id", user.id)
    .eq("setting_key", settingKey)
    .maybeSingle();
  throwIf(error);
  return data ? data.setting_value === "true" : null;
}

export async function setMySetting(
  settingKey: string,
  value: boolean,
): Promise<{ error?: string }> {
  const user = await requireUser();
  const { error } = await supabaseAdmin
    .from("user_setting")
    .upsert(
      { user_id: user.id, setting_key: settingKey, setting_value: String(value) },
      { onConflict: "user_id,setting_key" },
    );
  return error ? { error: error.message } : {};
}

// ─── Global settings ──────────────────────────────────────────────────────────

export async function getGlobalSetting(slug: string): Promise<string | null> {
  await requireUser();
  const { data, error } = await supabaseAdmin
    .from("global_settings")
    .select("value")
    .eq("slug", slug)
    .maybeSingle();
  throwIf(error);
  return data?.value ?? null;
}

export async function updateGlobalSetting(
  slug: string,
  value: string,
): Promise<{ error?: string }> {
  await requirePermission(Permissions.HANDLE_SETTINGS);
  const { error } = await supabaseAdmin.from("global_settings").update({ value }).eq("slug", slug);
  return error ? { error: error.message } : {};
}

// ─── Roles & permissions ──────────────────────────────────────────────────────

export async function listPermissions(orderBy: "name" | "created_at" = "name") {
  await requirePermission(Permissions.MANAGE_ROLES, Permissions.MANAGE_PERMISSIONS);
  const { data, error } = await supabaseAdmin
    .from("permission")
    .select("*")
    .order(orderBy, { ascending: orderBy === "name" });
  throwIf(error);
  return data ?? [];
}

export async function listRoles() {
  await requirePermission(
    Permissions.MANAGE_ROLES,
    Permissions.MANAGE_USERS,
    Permissions.HANDLE_SETTINGS,
  );
  const { data, error } = await supabaseAdmin
    .from("role")
    .select("*")
    .order("name", { ascending: true });
  throwIf(error);
  return data ?? [];
}

export async function roleHasPermission(roleId: string, permissionId: string): Promise<number> {
  await requirePermission(Permissions.MANAGE_ROLES);
  const { count, error } = await supabaseAdmin
    .from("role_permission")
    .select("role_id", { count: "exact", head: true })
    .eq("role_id", roleId)
    .eq("permission_id", permissionId);
  throwIf(error);
  return count ?? 0;
}

export async function setRolePermission(
  roleId: string,
  permissionId: string,
  enabled: boolean,
): Promise<{ error?: string }> {
  await requirePermission(Permissions.MANAGE_ROLES);
  const { error } = enabled
    ? await supabaseAdmin
        .from("role_permission")
        .insert({ role_id: roleId, permission_id: permissionId })
    : await supabaseAdmin
        .from("role_permission")
        .delete()
        .eq("role_id", roleId)
        .eq("permission_id", permissionId);
  return error ? { error: error.message } : {};
}

export async function createRole(input: { name: string; description?: string | null }) {
  await requirePermission(Permissions.MANAGE_ROLES);
  const { error } = await supabaseAdmin
    .from("role")
    .insert({ name: input.name, description: input.description ?? null });
  return error ? { error: error.message } : {};
}

export async function deleteRole(roleId: string): Promise<{ error?: string }> {
  await requirePermission(Permissions.MANAGE_ROLES);
  const { error } = await supabaseAdmin.from("role").delete().eq("id", roleId);
  return error ? { error: error.message } : {};
}

// ─── Users ────────────────────────────────────────────────────────────────────

const USER_COLUMNS = `id, image_url, first_name, last_name, email, role_id, archived_at, created_at, role(id, name)`;

export async function listAllUsers(): Promise<UserType[]> {
  await requirePermission(Permissions.MANAGE_USERS);
  const { data, error } = await supabaseAdmin
    .from("user")
    .select(USER_COLUMNS)
    .order("created_at", { ascending: false });
  throwIf(error);
  return (data ?? []) as unknown as UserType[];
}

export type UserListOptions = {
  archivedFilter?: UserStateEnum | Date | string;
  search?: string;
};

export async function listUsersPage(page: number, pageSize: number, options?: UserListOptions) {
  await requirePermission(Permissions.MANAGE_USERS);
  const from = page * pageSize;
  let query = supabaseAdmin
    .from("user")
    .select(USER_COLUMNS, { count: "exact" })
    .range(from, from + pageSize - 1)
    .order("created_at", { ascending: false });

  const filter = options?.archivedFilter;
  if (filter === UserStateEnum.ACTIVE) query = query.is("archived_at", null);
  else if (filter === UserStateEnum.ARCHIVED) query = query.not("archived_at", "is", null);
  else if (filter instanceof Date) query = query.gte("archived_at", filter.toISOString());
  else if (typeof filter === "string") query = query.gte("archived_at", filter);
  else query = query.is("archived_at", null);

  const term = options?.search?.replace(/[,()*%\\]/g, " ").trim();
  if (term) {
    query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`);
  }

  const { data, count, error } = await query;
  throwIf(error);
  return { data: (data ?? []) as unknown as UserType[], count };
}

export async function getUserById(userId: string): Promise<UserType | null> {
  const caller = await requireUser();
  if (caller.id !== userId) await requirePermission(Permissions.MANAGE_USERS);
  const { data, error } = await supabaseAdmin
    .from("user")
    .select(`*, role(id, name)`)
    .eq("id", userId)
    .maybeSingle();
  throwIf(error);
  return data as UserType | null;
}

// Only these columns can be changed from the admin screens.
const EDITABLE_USER_FIELDS = [
  "role_id",
  "archived_at",
  "first_name",
  "last_name",
] as const;
type EditableUserField = (typeof EDITABLE_USER_FIELDS)[number];

export async function updateUserFields(
  userId: string,
  patch: Partial<Record<EditableUserField, string | Date | null>>,
): Promise<{ error?: string }> {
  await requirePermission(Permissions.MANAGE_USERS);
  const update = Object.fromEntries(
    Object.entries(patch).filter(([k]) => (EDITABLE_USER_FIELDS as readonly string[]).includes(k)),
  );
  if (!Object.keys(update).length) return {};
  const { error } = await supabaseAdmin.from("user").update(update).eq("id", userId);
  return error ? { error: error.message } : {};
}

export async function deleteUser(userId: string): Promise<{ error?: string }> {
  const caller = await requirePermission(Permissions.MANAGE_USERS);
  if (caller.id === userId) throw new AccessError("No puedes eliminar tu propio usuario");
  const { error } = await supabaseAdmin.from("user").delete().eq("id", userId);
  return error ? { error: error.message } : {};
}

// ─── Workspace assignment ─────────────────────────────────────────────────────

export async function listAllWorkspaces(): Promise<{ id: string; name: string }[]> {
  await requirePermission(Permissions.MANAGE_USERS);
  const { data, error } = await supabaseAdmin.from("workspace").select("id, name").order("name");
  throwIf(error);
  return data ?? [];
}

export async function getUserWorkspaceIds(userId: string): Promise<string[]> {
  await requirePermission(Permissions.MANAGE_USERS);
  const { data, error } = await supabaseAdmin
    .from("user_workspace")
    .select("workspace_id")
    .eq("user_id", userId);
  throwIf(error);
  return (data ?? []).map((r) => r.workspace_id as string);
}

export async function setUserWorkspace(
  userId: string,
  workspaceId: string,
  assigned: boolean,
): Promise<{ error?: string }> {
  await requirePermission(Permissions.MANAGE_USERS);
  const { error } = assigned
    ? await supabaseAdmin
        .from("user_workspace")
        .insert({ user_id: userId, workspace_id: workspaceId })
    : await supabaseAdmin
        .from("user_workspace")
        .delete()
        .eq("user_id", userId)
        .eq("workspace_id", workspaceId);
  return error ? { error: error.message } : {};
}
