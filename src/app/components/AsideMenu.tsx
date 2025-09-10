"use client";

import userFetcher from "@/fetchers/userFetcher";
import { usePathname } from "next/navigation";
import { Permissions } from "@/types/propertyState";
import Link from "next/link";
import { Icon } from "@iconify/react/dist/iconify.js";
import { preload } from "swr";
import { adminUsersKey, ICON_SIZE } from "@/constants";
import { signOut } from "next-auth/react";
import React from "react";
import useUserPermissionsMap from "@/hooks/useUserPermissionsMap";

interface MenuItem {
  href: string;
  title: string;
  iconName: string;
  permissionSlug?: Permissions | Permissions[];
  onMouseEnter?: () => void;
}

export default function AsideMenu({
  userRoleId,
  closeMenu,
  isContracted,
}: {
  userRoleId: string | null | undefined;
  closeMenu: () => void;
  isContracted: boolean;
}) {
  const currentPath = usePathname();

  const { permissionsMap, isLoading } = useUserPermissionsMap(userRoleId);

  const checkPermission = React.useCallback(
    (slug: Permissions | Permissions[]) => {
      if (userRoleId == null) return false;
      const slugsToCheck = Array.isArray(slug) ? slug : [slug];
      return slugsToCheck.some((s) => permissionsMap.get(s) === true);
    },
    [userRoleId, permissionsMap],
  );

  const pages: MenuItem[] = [
    {
      href: "/",
      title: "Home",
      iconName: "solar:home-smile-angle-broken",
    },

    ...(checkPermission(Permissions.UPLOAD_DICOM)
      ? [
          {
            href: "/admin/dicom",
            title: "Upload Files",
            iconName: "solar:cloud-upload-broken",
          },
        ]
      : []),
    ...(checkPermission(Permissions.MANAGE_PACS)
      ? [
          {
            href: "/admin/pacs",
            title: "Pacs",
            iconName: "solar:archive-down-minimlistic-linear",
          },
        ]
      : []),
    ...(checkPermission(Permissions.VIEW_DICOMS)
      ? [
          {
            href: "/admin/dicoms",
            title: "Dicoms",
            iconName: "solar:bones-broken",
          },
        ]
      : []),
    ...(checkPermission(Permissions.VIEW_TEMPLATES)
      ? [
          {
            href: "/admin/templates",
            title: "Templates",
            iconName: "solar:file-favourite-line-duotone",
          },
        ]
      : []),
    ...(checkPermission(Permissions.MANAGE_USERS)
      ? [
          {
            href: "/admin/users",
            title: "Users",
            iconName: "solar:user-linear",
            onMouseEnter: () => preload(adminUsersKey, userFetcher),
          },
        ]
      : []),
    ...(checkPermission(Permissions.MANAGE_ROLES)
      ? [
          {
            href: "/admin/roles",
            title: "Roles",
            iconName: "solar:user-check-broken",
          },
        ]
      : []),
    ...(checkPermission(Permissions.MANAGE_PERMISSIONS)
      ? [
          {
            href: "/admin/permisos",
            title: "Permissions",
            iconName: "solar:lock-keyhole-broken",
          },
        ]
      : []),
    ...(checkPermission(Permissions.DOWNLOAD_REPORT)
      ? [
          {
            href: "/admin/reports",
            title: "Reports",
            iconName: "solar:file-text-linear",
          },
        ]
      : []),
    ...(checkPermission(Permissions.VIEW_RESIDENTS)
      ? [
          {
            href: "/admin/residents",
            title: "Residents",
            iconName: "solar:shield-user-outline",
          },
        ]
      : []),
    {
      href: "/admin/my-studies",
      title: "My studies",
      iconName: "solar:hand-heart-linear",
    },
    ...(checkPermission(Permissions.HANDLE_SETTINGS)
      ? [
          {
            href: "/admin/settings",
            title: "Settings",
            iconName: "solar:settings-linear",
          },
        ]
      : []),
    {
      href: "/admin/my-settings",
      title: "My Settings",
      iconName: "solar:settings-minimalistic-linear",
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

  return (
    <>
      {pages.map(({ href, title, iconName, onMouseEnter }) => (
        <li key={href}>
          <Link
            href={href}
            title={title}
            onMouseEnter={onMouseEnter}
            className={`${
              href === currentPath ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"
            } rounded-xl py-3 px-4 gap-3.5 flex items-center transition-colors duration-300 `}
            onClick={closeMenu}
          >
            <Icon
              icon={iconName}
              fontSize={ICON_SIZE}
              className={`${href === currentPath ? "text-rose-400" : ""}`}
            />
            <span className={isContracted ? "lg:hidden" : ""}>{title}</span>
          </Link>
        </li>
      ))}
      <li>
        <button
          onClick={() => signOut()}
          className="hover:text-rose-400 cursor-pointer rounded-xl py-3 px-4 gap-3.5 flex items-center transition-colors duration-300"
        >
          <Icon icon="solar:inbox-out-linear" fontSize={ICON_SIZE} className="-rotate-90" />
          <span className={isContracted ? "lg:hidden" : ""}>Sign Out</span>
        </button>
      </li>
    </>
  );
}
