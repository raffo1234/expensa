"use client";

import { supabase } from "@/lib/supabase";
import useSWR from "swr";

interface Permission {
  id: string;
  slug: string;
}

const permissionsFetcher = async (slugs: string[]): Promise<Permission[] | null> => {
  if (slugs.length === 0) {
    return [];
  }
  const { data, error } = await supabase.from("permission").select("id, slug").in("slug", slugs);

  if (error) {
    console.error(`Error fetching permissions for slugs "${slugs.join(", ")}":`, error);
    throw error;
  }
  return data;
};

const rolePermissionsCheckFetcher = async (
  roleId: string,
  permissionIds: string[],
): Promise<number | null> => {
  if (!roleId || permissionIds.length === 0) {
    console.warn("roleId is missing or no permissionIds provided for rolePermissionsCheckFetcher.");
    return 0;
  }

  const { count, error } = await supabase
    .from("role_permission")
    .select("role_id, permission_id", { count: "exact", head: true })
    .eq("role_id", roleId)
    .in("permission_id", permissionIds);

  if (error) {
    console.error(
      `Error checking role permissions for roleId "${roleId}" and permissionIds "${permissionIds.join(", ")}":`,
      error,
    );
    throw error;
  }
  return count;
};

function useCheckPermission(
  userRoleId: string | null | undefined,
  requiredPermissionSlugs: string | string[],
) {
  const slugsArray = Array.isArray(requiredPermissionSlugs)
    ? requiredPermissionSlugs
    : [requiredPermissionSlugs];

  const { data: permissions, isLoading: isLoadingPermissions } = useSWR<Permission[] | null>(
    slugsArray.length > 0 ? `permissions-${slugsArray.join(",")}` : null,
    () => permissionsFetcher(slugsArray),
  );

  const permissionIds = permissions?.map((p) => p.id).filter(Boolean) as string[] | undefined;

  const { data: permissionsCount, isLoading: isLoadingPermissionsCount } = useSWR<number | null>(
    userRoleId != null && permissionIds && permissionIds.length > 0
      ? `role-permissions-check-${userRoleId}-${permissionIds.join(",")}`
      : null,
    () => rolePermissionsCheckFetcher(userRoleId!, permissionIds!),
  );

  const isLoading = isLoadingPermissions || isLoadingPermissionsCount;

  const hasPermission = userRoleId != null && !!(permissionsCount && permissionsCount > 0);

  return {
    permissions,
    hasPermission,
    isLoading,
  };
}

export default useCheckPermission;
