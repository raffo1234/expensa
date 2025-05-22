"use client";

import FallbackPermission from "@/components/FallbackPermission";
import CheckPermission from "./CheckPermission";
import { Permissions } from "@/types/propertyState";
import { PermissionType } from "@/types/permissionType";

export default function PermissionsPage({
  userRoleId,
  permissions,
}: {
  userRoleId: string;
  permissions: PermissionType[] | null;
}) {
  return (
    <div>
      <h1 className="mb-6 font-semibold text-lg block">Permissions</h1>
      <CheckPermission
        userRoleId={userRoleId}
        requiredPermission={Permissions.MANAGE_PERMISSIONS}
        fallback={<FallbackPermission />}
      >
        <div className="border-x border-b border-gray-200 bg-white rounded-xl">
          {permissions?.map(({ id, description, slug }) => {
            return (
              <div
                className="px-6 py-5 first:rounded-t-xl border-t border-gray-200"
                key={id}
              >
                <div className="mb-1 text-xs">{slug}</div>
                <div className="text-sm text-gray-400">{description}</div>
              </div>
            );
          })}
        </div>
      </CheckPermission>
    </div>
  );
}
