import { supabase } from "@/lib/supabase";

export const checkPermissions = async (
    roleId: string,
    slugs: string[]
): Promise<Record<string, boolean>> => {
    if (!roleId || slugs.length === 0) return {};

    const { data: permissions } = await supabase
        .from("permission")
        .select("id, slug")
        .in("slug", slugs);

    if (!permissions?.length) return Object.fromEntries(slugs.map((s) => [s, false]));

    const permissionIds = permissions.map((p) => p.id);

    const { data: rolePermissions } = await supabase
        .from("role_permission")
        .select("permission_id")
        .eq("role_id", roleId)
        .in("permission_id", permissionIds);

    const grantedIds = new Set(rolePermissions?.map((rp) => rp.permission_id));

    return Object.fromEntries(
        permissions.map((p) => [p.slug, grantedIds.has(p.id)])
    );
};