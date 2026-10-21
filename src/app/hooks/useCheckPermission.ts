"use client";

import useSWR from "swr";
import { rolePermissionSlugsKey } from "@/lib/rolePermissionsKey";
import { getMyPermissionSlugs } from "@/actions/admin";

function useCheckPermission(
  userRoleId: string | null | undefined,
  requiredPermissionSlugs: string | string[],
) {
  const slugs = Array.isArray(requiredPermissionSlugs)
    ? requiredPermissionSlugs
    : [requiredPermissionSlugs];

  // Shares one cached list per role with the menu (prefilled by the admin layout),
  // so most checks resolve without a network request.
  const { data: granted, isLoading } = useSWR(
    userRoleId && slugs.length > 0 ? rolePermissionSlugsKey(userRoleId) : null,
    () => getMyPermissionSlugs(),
  );

  return {
    hasPermission: !!granted && slugs.every((s) => granted.includes(s)),
    isLoading,
  };
}

export default useCheckPermission;
