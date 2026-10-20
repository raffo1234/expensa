"use client";

import useSWR from "swr";
import React from "react";
import { fetchRolePermissionSlugs, rolePermissionSlugsKey } from "@/lib/rolePermissions";

function useUserPermissionsMap(userRoleId: string | null | undefined) {
  const { data: slugs, isLoading } = useSWR(
    userRoleId ? rolePermissionSlugsKey(userRoleId) : null,
    () => fetchRolePermissionSlugs(userRoleId!),
  );

  const permissionsMap = React.useMemo(
    () => new Map((slugs ?? []).map((slug) => [slug, true])),
    [slugs],
  );

  return { permissionsMap, isLoading };
}

export default useUserPermissionsMap;
