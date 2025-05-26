"use client";

import { usePathname } from "next/navigation";
import useCheckPermission from "@/hooks/useCheckPermission";
import { Permissions } from "@/types/propertyState";
import Link from "next/link";
import { Icon } from "@iconify/react/dist/iconify.js";

export default function AsideMenu({
  userRoleId,
  closeMenu,
}: {
  userRoleId: string;
  closeMenu: () => void;
}) {
  const currentPath = usePathname();

  const {
    hasPermission: hasRolesPermission,
    isLoading: isLoadingRolesPermission,
  } = useCheckPermission(userRoleId, Permissions.MANAGE_ROLES);
  const {
    hasPermission: hasUsersPermission,
    isLoading: isLoadingUsersPermission,
  } = useCheckPermission(userRoleId, Permissions.MANAGE_USERS);
  const {
    hasPermission: hasPermissionsPermission,
    isLoading: isLoadingPermissionsPermission,
  } = useCheckPermission(userRoleId, Permissions.MANAGE_PERMISSIONS);
  const {
    hasPermission: hasDownloadReportPermission,
    isLoading: isLoadingDownloadReportPermission,
  } = useCheckPermission(userRoleId, Permissions.DOWNLOAD_REPORT);
  const {
    hasPermission: hasViewTemplatesPermission,
    isLoading: isLoadingHasViewTemplatesPermission,
  } = useCheckPermission(userRoleId, Permissions.VIEW_TEMPLATES);
  const {
    hasPermission: hasViewDicomsPermission,
    isLoading: isLoadingHasViewDicomsPermission,
  } = useCheckPermission(userRoleId, Permissions.VIEW_DICOMS);
  const {
    hasPermission: hasUploadDicomPermission,
    isLoading: isLoadingUloadDicomPermission,
  } = useCheckPermission(userRoleId, Permissions.UPLOAD_DICOM);

  const pages = [
    ...(hasUploadDicomPermission
      ? [
          {
            href: "/admin/dicom",
            title: "Upload Files",
            iconName: "solar:cloud-upload-broken",
          },
        ]
      : []),
    ...(hasViewDicomsPermission
      ? [
          {
            href: "/admin/dicoms",
            title: "Dicoms",
            iconName: "solar:bones-broken",
          },
        ]
      : []),
    ...(hasViewTemplatesPermission
      ? [
          {
            href: "/admin/templates",
            title: "Templates",
            iconName: "solar:file-favourite-line-duotone",
          },
        ]
      : []),
    ...(hasUsersPermission
      ? [
          {
            href: "/admin/users",
            title: "Users",
            iconName: "solar:user-linear",
          },
        ]
      : []),
    ...(hasRolesPermission
      ? [
          {
            href: "/admin/roles",
            title: "Roles",
            iconName: "solar:user-check-broken",
          },
        ]
      : []),
    ...(hasPermissionsPermission
      ? [
          {
            href: "/admin/permisos",
            title: "Permissions",
            iconName: "solar:lock-keyhole-broken",
          },
        ]
      : []),
    ...(hasDownloadReportPermission
      ? [
          {
            href: "/admin/reports",
            title: "Reports",
            iconName: "solar:file-text-linear",
          },
        ]
      : []),
  ];

  const isLoading =
    isLoadingRolesPermission ||
    isLoadingUsersPermission ||
    isLoadingPermissionsPermission ||
    isLoadingDownloadReportPermission ||
    isLoadingHasViewTemplatesPermission ||
    isLoadingHasViewDicomsPermission ||
    isLoadingUloadDicomPermission;

  if (isLoading)
    return (
      <div className="animate-pulse flex flex-col gap-1">
        <div className="h-12 rounded-xl w-full bg-gray-100"></div>
        <div className="h-12 rounded-xl w-full bg-gray-100"></div>
        <div className="h-12 rounded-xl w-full bg-gray-100"></div>
        <div className="h-12 rounded-xl w-full bg-gray-100"></div>
      </div>
    );

  return pages.map(({ href, title, iconName }) => (
    <li key={href}>
      <Link
        href={href}
        title={title}
        className={`${
          href === currentPath ? "bg-gray-100" : "hover:bg-gray-50"
        }  rounded-xl py-3 px-4 gap-3.5 flex items-center transition-colors duration-300 `}
        onClick={closeMenu}
      >
        <Icon icon={iconName} fontSize={21} />
        <span>{title}</span>
      </Link>
    </li>
  ));
}
