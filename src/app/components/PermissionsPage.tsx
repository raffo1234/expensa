"use client";

import CheckPermission from "./CheckPermission";
import { Permissions } from "@/types/propertyState";
import { PermissionType } from "@/types/permissionType";
import NoAccess from "./NoAccess";
import SkeletonPermissionsPage from "./SkeletonPermissionsPage";
import useSWR from "swr";
import { SWR_KEY_PERMISSIONS } from "@/constants";
import permissionsFetcher from "@/fetchers/permissionsFetcher";
import { Icon } from "@iconify/react/dist/iconify.js";

const getPermissionIcon = (slug: string): string => {
  const s = slug.toLowerCase();
  if (s.includes("delete")) return "solar:trash-bin-minimalistic-linear";
  if (s.includes("view") || s.includes("show")) return "solar:eye-linear";
  if (s.includes("email")) return "solar:letter-linear";
  if (s.includes("upload")) return "solar:upload-linear";
  if (s.includes("store") || s.includes("cloud")) return "solar:cloud-storage-linear";
  if (s.includes("settings") || s.includes("handle")) return "solar:settings-linear";
  if (s.includes("assign")) return "solar:user-plus-linear";
  if (s.includes("switch")) return "solar:transfer-horizontal-linear";
  if (s.includes("manage")) return "solar:shield-keyhole-linear";
  if (s.includes("resident")) return "solar:users-group-rounded-linear";
  return "solar:lock-keyhole-linear";
};

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
        {permissions?.map(({ id, description, slug, name }) => (
          <div
            key={id}
            className="px-6 py-4 first:rounded-t-xl last:rounded-b-xl border-t border-gray-200 flex items-start gap-4 hover:bg-gray-50 transition-colors duration-200"
          >
            <div className="mt-0.5 w-[34px] h-[34px] p-2 rounded-lg bg-gray-100 flex-shrink-0">
              <Icon icon={getPermissionIcon(slug)} fontSize={18} className="text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-medium text-sm text-gray-800">{name}</span>
                <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">
                  {slug}
                </span>
              </div>
              <p className="text-sm text-gray-400 leading-snug">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </CheckPermission>
  );
}
