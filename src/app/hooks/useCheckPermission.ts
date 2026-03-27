"use client";

import { checkPermissions } from "@/lib/checkPermissions";
import useSWR from "swr";

function useCheckPermission(
  userRoleId: string | null | undefined,
  requiredPermissionSlugs: string | string[],
) {
  const slugs = Array.isArray(requiredPermissionSlugs)
    ? requiredPermissionSlugs
    : [requiredPermissionSlugs];

  const { data, isLoading } = useSWR(
    userRoleId && slugs.length > 0 ? `role-permissions-${userRoleId}-${slugs.join(",")}` : null,
    () => checkPermissions(userRoleId!, slugs),
  );

  return {
    hasPermission: slugs.every((s) => data?.[s] === true),
    isLoading,
  };
}

export default useCheckPermission;
