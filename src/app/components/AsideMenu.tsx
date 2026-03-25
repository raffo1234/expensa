"use client";

import userFetcher from "@/fetchers/userFetcher";
import { Permissions } from "@/types/propertyState";
import { Icon } from "@iconify/react/dist/iconify.js";
import { preload } from "swr";
import { adminUsersKey, ICON_SIZE } from "@/constants";
import { signOut } from "next-auth/react";
import React from "react";
import useUserPermissionsMap from "@/hooks/useUserPermissionsMap";
import AsideMenuItem from "./AsideMenuItem";
import { useTranslations } from "next-intl";

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
  const { permissionsMap, isLoading } = useUserPermissionsMap(userRoleId);
  const t = useTranslations("Menu");

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
      title: t("home"),
      iconName: "solar:home-smile-angle-broken",
    },

    ...(checkPermission(Permissions.UPLOAD_DICOM)
      ? [
          {
            href: "/admin/dicom",
            title: t("upload"),
            iconName: "solar:cloud-upload-broken",
          },
        ]
      : []),
    ...(checkPermission(Permissions.MANAGE_PACS)
      ? [
          {
            href: "/admin/pacs",
            title: t("pacs"),
            iconName: "solar:archive-down-minimlistic-linear",
          },
        ]
      : []),
    ...(checkPermission(Permissions.VIEW_DICOMS)
      ? [
          {
            href: "/admin/dicoms",
            title: t("dicoms"),
            iconName: "solar:bones-broken",
          },
        ]
      : []),
    ...(checkPermission(Permissions.VIEW_TEMPLATES)
      ? [
          {
            href: "/admin/templates",
            title: t("templates"),
            iconName: "solar:file-favourite-line-duotone",
          },
        ]
      : []),
    ...(checkPermission(Permissions.MANAGE_USERS)
      ? [
          {
            href: "/admin/users",
            title: t("users"),
            iconName: "solar:user-linear",
            onMouseEnter: () => preload(adminUsersKey, userFetcher),
          },
        ]
      : []),
    ...(checkPermission(Permissions.MANAGE_ROLES)
      ? [
          {
            href: "/admin/roles",
            title: t("roles"),
            iconName: "solar:user-check-broken",
          },
        ]
      : []),
    ...(checkPermission(Permissions.MANAGE_PERMISSIONS)
      ? [
          {
            href: "/admin/permisos",
            title: t("permissions"),
            iconName: "solar:lock-keyhole-broken",
          },
        ]
      : []),
    ...(checkPermission(Permissions.DOWNLOAD_REPORT)
      ? [
          {
            href: "/admin/reports",
            title: t("reports"),
            iconName: "solar:file-text-linear",
          },
        ]
      : []),
    ...(checkPermission(Permissions.VIEW_RESIDENTS)
      ? [
          {
            href: "/admin/residents",
            title: t("residents"),
            iconName: "solar:shield-user-outline",
          },
        ]
      : []),
    {
      href: "/admin/my-studies",
      title: t("my-studies"),
      iconName: "solar:hand-heart-linear",
    },
    ...(checkPermission(Permissions.HANDLE_SETTINGS)
      ? [
          {
            href: "/admin/settings",
            title: t("settings"),
            iconName: "solar:settings-linear",
          },
        ]
      : []),
    {
      href: "/admin/my-settings",
      title: t("my-settings"),
      iconName: "solar:settings-minimalistic-linear",
    },
  ];

  if (isLoading)
    return (
      <div className="animate-pulse flex flex-col gap-1">
        <div className="h-[43px] w-full lg:w-[51px] rounded-xl bg-gray-100"></div>
        <div className="h-[43px] w-full lg:w-[51px] rounded-xl bg-gray-100"></div>
        <div className="h-[43px] w-full lg:w-[51px] rounded-xl bg-gray-100"></div>
        <div className="h-[43px] w-full lg:w-[51px] rounded-xl bg-gray-100"></div>
      </div>
    );

  return (
    <>
      {pages.map((page) => (
        <li key={page.href}>
          <AsideMenuItem page={page} closeMenu={closeMenu} isContracted={isContracted} />
        </li>
      ))}
      <li>
        <button
          onClick={() => signOut()}
          className="hover:text-rose-400 cursor-pointer rounded-xl py-3 px-4 gap-3.5 flex items-center transition-colors duration-300"
        >
          <Icon icon="solar:inbox-out-linear" fontSize={ICON_SIZE} className="-rotate-90" />
          <span className={isContracted ? "lg:hidden" : ""}>{t("sign-out")}</span>
        </button>
      </li>
    </>
  );
}
