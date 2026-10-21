"use client";

import useSWR from "swr";
import React from "react";
import { rolePermissionSlugsKey } from "@/lib/rolePermissionsKey";
import { getMyPermissionSlugs } from "@/actions/admin";

function useUserPermissionsMap(userRoleId: string | null | undefined) {
  const { data: slugs, isLoading } = useSWR(
    userRoleId ? rolePermissionSlugsKey(userRoleId) : null,
    () => getMyPermissionSlugs(),
  );

  const permissionsMap = React.useMemo(
    () => new Map((slugs ?? []).map((slug) => [slug, true])),
    [slugs],
  );

  return { permissionsMap, isLoading };
}

export default useUserPermissionsMap;
