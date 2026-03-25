"use client";

import CheckPermission from "./CheckPermission";
import { Permissions } from "@/types/propertyState";
import { PermissionType } from "@/types/permissionType";
import NoAccess from "./NoAccess";
import SkeletonPermissionsPage from "./SkeletonPermissionsPage";
import useSWR from "swr";
import { SWR_KEY_PERMISSIONS } from "@/constants";
import permissionsFetcher from "@/fetchers/permissionsFetcher";

export default function PermissionsPage({
  userRoleId,
  permissions: fallbackPermissions,
}: {
  userRoleId: string;
  permissions: PermissionType[] | null;
}) {
  const { data: permissions } = useSWR<PermissionType[] | null>(
    SWR_KEY_PERMISSIONS,
    permissionsFetcher,
    { fallbackData: fallbackPermissions },
  );

  return (
    <CheckPermission
      userRoleId={userRoleId}
      requiredPermission={Permissions.MANAGE_PERMISSIONS}
      fallback={<NoAccess />}
      loadingComponent={<SkeletonPermissionsPage />}
    >
      <div className="border-x border-b border-gray-200 bg-white rounded-xl">
        {permissions?.map(({ id, description, slug }) => (
          <div className="px-6 py-5 first:rounded-t-xl border-t border-gray-200" key={id}>
            <div className="mb-1 text-xs">{slug}</div>
            <div className="text-sm text-gray-400">{description}</div>
          </div>
        ))}
      </div>
    </CheckPermission>
  );
}
