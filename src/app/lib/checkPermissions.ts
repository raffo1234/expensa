import { supabase } from "@/lib/supabase";

export const checkPermissions = async (
  roleId: string,
  slugs: string[],
): Promise<Record<string, boolean>> => {
  if (!roleId || slugs.length === 0) return {};

  // One round trip: only the requested permissions this role actually has.
  const { data } = await supabase
    .from("role_permission")
    .select("permission!inner(slug)")
    .eq("role_id", roleId)
    .in("permission.slug", slugs);

  const granted = new Set(
    ((data ?? []) as unknown as { permission: { slug: string } }[]).map((r) => r.permission.slug),
  );

  return Object.fromEntries(slugs.map((s) => [s, granted.has(s)]));
};
