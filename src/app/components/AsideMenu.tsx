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
    // ...(checkPermission(Permissions.MANAGE_PACS)
    //   ? [
    //       {
    //         href: "/admin/pacs",
    //         title: t("pacs"),
    //         iconName: "solar:archive-down-minimlistic-linear",
    //       },
    //     ]
    //   : []),
    ...(checkPermission(Permissions.MANAGE_PACS)
      ? [
          {
            href: "/admin/studies",
            title: "PACS",
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
            href: "/admin/permissions",
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
      href: "/admin/workspaces",
      title: t("my-workspaces"),
      iconName: "solar:wallet-2-linear",
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
      <div className="flex flex-col gap-1">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className={`h-[43px] w-full ${isContracted ? "lg:w-[51px]" : "w-auto"} rounded-xl bg-gray-100 animate-pulse`}
          />
        ))}
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
          className="hover:text-rose-400 w-full text-sm font-semibold hover:bg-purple-100 cursor-pointer rounded-xl p-2 gap-3.5 text-purple-800 flex items-center transition-colors duration-300"
        >
          <span className="p-2 bg-gradient-to-b hover:bg-purple-100 text-purple-800 lg:from-white/75 lg:to-purple-100/75 rounded-lg bg-purple-100 border border-purple-200">
            <Icon icon="solar:inbox-out-linear" fontSize={ICON_SIZE} className="-rotate-90" />
          </span>
          <span className={isContracted ? "lg:hidden" : ""}>{t("sign-out")}</span>
        </button>
      </li>
    </>
  );
}
