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
    ...(checkPermission(Permissions.VIEW_DASHBOARD)
      ? [
          {
            href: "/admin/dashboard",
            title: t("dashboard"),
            iconName: "solar:graph-up-outline",
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
    ...(checkPermission(Permissions.HANDLE_WORKSPACES)
      ? [
          {
            href: "/admin/workspaces",
            title: t("my-workspaces"),
            iconName: "solar:wallet-2-linear",
          },
        ]
      : []),
    ...(checkPermission(Permissions.VIEW_EXPENSES_SUMMARY)
      ? [
          {
            href: "/admin/summary",
            title: t("summary"),
            iconName: "solar:document-text-linear",
          },
        ]
      : []),
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
          className="group text-gray-800 hover:text-violet-800 hover:bg-violet-100/60 truncate cursor-pointer rounded-lg w-full p-1 pr-3 gap-3.5 flex items-center text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
        >
          <span className="transition-all duration-200 group-hover:border-violet-300 group-hover:shadow-sm p-1.5 bg-gradient-to-b text-violet-800 lg:from-white/75 lg:to-violet-100/75 rounded-lg bg-violet-100 border border-violet-200">
            <Icon icon="solar:inbox-out-linear" fontSize={ICON_SIZE} className="-rotate-90" />
          </span>
          <span className={isContracted ? "lg:hidden" : ""}>{t("sign-out")}</span>
        </button>
      </li>
    </>
  );
}
