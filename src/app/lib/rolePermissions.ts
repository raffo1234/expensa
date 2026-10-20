import { supabase } from "@/lib/supabase";

export const rolePermissionSlugsKey = (roleId: string) => `role-permission-slugs-${roleId}`;

// All permission slugs granted to a role, in a single query.
export async function fetchRolePermissionSlugs(roleId: string): Promise<string[]> {
  if (!roleId) return [];
  const { data, error } = await supabase
    .from("role_permission")
    .select("permission!inner(slug)")
    .eq("role_id", roleId);
  if (error) throw error;
  return ((data ?? []) as unknown as { permission: { slug: string } }[]).map(
    (row) => row.permission.slug,
  );
}
