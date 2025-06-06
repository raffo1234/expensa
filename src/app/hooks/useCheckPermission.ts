"use client";

import { supabase } from "@/lib/supabase";
import useSWR from "swr";

const permissionFetcher = async (slug: string) => {
  const { data, error } = await supabase
    .from("permission")
    .select("id")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  return data;
};

const rolePermissionFetcher = async (roleId: string, permissionId: string) => {
  const { count, error } = await supabase
    .from("role_permission")
    .select("role_id, permission_id", { count: "exact", head: true })
    .eq("role_id", roleId)
    .eq("permission_id", permissionId);
  if (error) throw error;
  return count;
};

function useCheckPermission(userRoleId: string, requiredPermission: string) {
  const { data: permission, isLoading: isLoadingPermission } = useSWR(
    `permission-${requiredPermission}`,
    () => permissionFetcher(requiredPermission)
  );

  const { data: permissionsCount, isLoading: isLoadingPermissionsCount } =
    useSWR(`role-permission-${userRoleId}-${permission?.id}`, () =>
      permission ? rolePermissionFetcher(userRoleId, permission.id) : null
    );

  const isLoading = isLoadingPermission || isLoadingPermissionsCount;

  return {
    permission,
    hasPermission: !!(permissionsCount && permissionsCount > 0),
    isLoading,
  };
}

export default useCheckPermission;
