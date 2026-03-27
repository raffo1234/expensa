"use client";

import { checkPermissions } from "@/lib/checkPermissions";
import useSWR from "swr";
import { Permissions } from "@/types/propertyState";

export function useCheckPermissionsMap(roleIds: string[], permission: Permissions) {
  const uniqueRoleIds = [...new Set(roleIds)];

  const { data, isLoading } = useSWR(
    uniqueRoleIds.length > 0
      ? `role-permissions-map-${uniqueRoleIds.join(",")}-${permission}`
      : null,
    () =>
      Promise.all(
        uniqueRoleIds.map((roleId) =>
          checkPermissions(roleId, [permission]).then((result) => ({
            roleId,
            hasPermission: result?.[permission] === true,
          })),
        ),
      ).then((results) =>
        Object.fromEntries(results.map(({ roleId, hasPermission }) => [roleId, hasPermission])),
      ),
  );

  return {
    permissionsMap: data ?? ({} as Record<string, boolean>),
    isLoading,
  };
}
