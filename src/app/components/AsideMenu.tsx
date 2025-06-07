"use client";

import userFetcher from "@/fetchers/userFetcher";
import { usePathname } from "next/navigation";
import useCheckPermission from "@/hooks/useCheckPermission";
import { Permissions } from "@/types/propertyState";
import Link from "next/link";
import { Icon } from "@iconify/react/dist/iconify.js";
import { preload } from "swr";

export default function AsideMenu({
  userRoleId,
  closeMenu,
}: {
  userRoleId: string;
  closeMenu: () => void;
}) {
  const currentPath = usePathname();

  const { hasPermission: hasRolesPermission } = useCheckPermission(
    userRoleId,
    Permissions.MANAGE_ROLES
  );
  const { hasPermission: hasUsersPermission } = useCheckPermission(
    userRoleId,
    Permissions.MANAGE_USERS
  );
  const { hasPermission: hasPermissionsPermission } = useCheckPermission(
    userRoleId,
    Permissions.MANAGE_PERMISSIONS
  );
  const { hasPermission: hasDownloadReportPermission } = useCheckPermission(
    userRoleId,
    Permissions.DOWNLOAD_REPORT
  );
  const { hasPermission: hasViewTemplatesPermission } = useCheckPermission(
    userRoleId,
    Permissions.VIEW_TEMPLATES
  );
  const { hasPermission: hasViewDicomsPermission } = useCheckPermission(
    userRoleId,
    Permissions.VIEW_DICOMS
  );
  const { hasPermission: hasUploadDicomPermission, isLoading } =
    useCheckPermission(userRoleId, Permissions.UPLOAD_DICOM);

  const pages = [
    {
      href: "/",
      title: "Home",
      iconName: "solar:home-smile-angle-broken",
    },

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
    {
      href: "/admin/residents",
      title: "Residents",
      iconName: "solar:shield-user-outline",
    },
  ];

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
        onMouseEnter={() => preload("users", userFetcher)}
        className={`${
          href === currentPath
            ? "bg-gray-100 font-semibold"
            : "hover:bg-gray-50"
        }  rounded-xl py-3 px-4 gap-3.5 flex items-center transition-colors duration-300 `}
        onClick={closeMenu}
      >
        <Icon
          icon={iconName}
          fontSize={21}
          className={`${href === currentPath ? "text-rose-400" : ""}`}
        />
        <span>{title}</span>
      </Link>
    </li>
  ));
}
