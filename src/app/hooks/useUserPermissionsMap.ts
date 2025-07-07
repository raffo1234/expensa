"use client";

import { supabase } from "@/lib/supabase";
import useSWR from "swr";
import React from "react";

interface Permission {
  id: string;
  slug: string;
}

interface RolePermission {
  permission_id: string;
}

const allPermissionsFetcher = async (): Promise<Permission[] | null> => {
  const { data, error } = await supabase.from("permission").select("id, slug");
  if (error) {
    throw error;
  }
  return data;
};

const rolePermissionsIdsFetcher = async (roleId: string): Promise<RolePermission[] | null> => {
  if (!roleId) {
    return [];
  }
  const { data, error } = await supabase
    .from("role_permission")
    .select("permission_id")
    .eq("role_id", roleId);

  if (error) {
    throw error;
  }
  return data;
};

function useUserPermissionsMap(userRoleId: string | null | undefined) {
  const { data: allPermissions, isLoading: isLoadingAllPermissions } = useSWR<Permission[] | null>(
    "all-permissions-list",
    allPermissionsFetcher,
  );

  const { data: userRolePermissions, isLoading: isLoadingUserRolePermissions } = useSWR<
    RolePermission[] | null
  >(userRoleId != null ? `role-permissions-for-${userRoleId}` : null, () =>
    rolePermissionsIdsFetcher(userRoleId!),
  );

  const isLoading = isLoadingAllPermissions || isLoadingUserRolePermissions;

  const permissionsMap = React.useMemo(() => {
    const map = new Map<string, boolean>();

    if (userRoleId == null || !allPermissions || !userRolePermissions) {
      if (allPermissions) {
        allPermissions.forEach((p) => map.set(p.slug, false));
      }
      return map;
    }

    const possessedPermissionIds = new Set(userRolePermissions.map((rp) => rp.permission_id));

    allPermissions.forEach((p) => {
      map.set(p.slug, possessedPermissionIds.has(p.id));
    });

    return map;
  }, [userRoleId, allPermissions, userRolePermissions]);

  return {
    permissionsMap,
    isLoading,
  };
}

export default useUserPermissionsMap;
