"use client";

import userFetcher from "@/fetchers/userFetcher";
import { Permissions } from "@/types/propertyState";
import { preload } from "swr";
import { adminUsersKey } from "@/constants";
import { signOut } from "next-auth/react";
import React from "react";
import useUserPermissionsMap from "@/hooks/useUserPermissionsMap";
import AsideMenuItem, { MenuIcon, menuItemClass } from "./AsideMenuItem";
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

  const item = (
    allowed: boolean,
    href: string,
    title: string,
    iconName: string,
    extra?: Partial<MenuItem>,
  ): MenuItem[] => (allowed ? [{ href, title, iconName, ...extra }] : []);

  // Grouped like Fly.io's sidebar; a group with no allowed items is hidden.
  const groups: { label?: string; items: MenuItem[] }[] = [
    { items: item(true, "/", t("home"), "solar:home-smile-angle-bold-duotone") },
    {
      label: t("group-expenses"),
      items: [
        ...item(
          checkPermission(Permissions.HANDLE_WORKSPACES),
          "/admin/workspaces",
          t("my-workspaces"),
          "solar:wallet-2-bold-duotone",
        ),
        ...item(
          checkPermission(Permissions.VIEW_EXPENSES_SUMMARY),
          "/admin/summary",
          t("summary"),
          "solar:document-text-bold-duotone",
        ),
        ...item(
          checkPermission(Permissions.VIEW_DASHBOARD),
          "/admin/dashboard",
          t("dashboard"),
          "solar:graph-up-bold-duotone",
        ),
      ],
    },
    {
      label: t("group-admin"),
      items: [
        ...item(
          checkPermission(Permissions.MANAGE_USERS),
          "/admin/users",
          t("users"),
          "solar:users-group-rounded-bold-duotone",
          { onMouseEnter: () => preload(adminUsersKey, userFetcher) },
        ),
        ...item(
          checkPermission(Permissions.MANAGE_ROLES),
          "/admin/roles",
          t("roles"),
          "solar:user-check-bold-duotone",
        ),
        ...item(
          checkPermission(Permissions.MANAGE_PERMISSIONS),
          "/admin/permissions",
          t("permissions"),
          "solar:lock-keyhole-bold-duotone",
        ),
        ...item(
          checkPermission(Permissions.HANDLE_SETTINGS),
          "/admin/settings",
          t("settings"),
          "solar:settings-bold-duotone",
        ),
      ],
    },
    {
      label: t("group-account"),
      items: item(true, "/admin/my-settings", t("my-settings"), "solar:tuning-2-bold-duotone"),
    },
  ];

  if (isLoading)
    return (
      <div className="flex flex-col">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex h-10 items-center gap-2.5 px-2.5">
            <div className="size-6.5 flex-shrink-0 animate-pulse rounded-md bg-navy-100" />
            <div
              className={`h-3.5 w-28 animate-pulse rounded bg-navy-100 ${isContracted ? "lg:hidden" : ""}`}
            />
          </div>
        ))}
      </div>
    );

  return (
    <>
      {groups
        .filter((group) => group.items.length > 0)
        .map((group, gi) => (
          <React.Fragment key={group.label ?? gi}>
            {group.label && (
              <li aria-hidden={isContracted || undefined}>
                {/* Section label; a thin divider takes its place when the menu is contracted. */}
                <p
                  className={`px-2.5 pt-6 pb-2 text-xs font-book uppercase tracking-[0.08em] text-navy-400 ${
                    isContracted ? "lg:hidden" : ""
                  }`}
                >
                  {group.label}
                </p>
                {isContracted && (
                  <span className="mx-2.5 my-3 hidden border-t border-navy-100 lg:block" />
                )}
              </li>
            )}
            {group.items.map((page) => (
              <li key={page.href}>
                <AsideMenuItem page={page} closeMenu={closeMenu} isContracted={isContracted} />
              </li>
            ))}
          </React.Fragment>
        ))}
      <li className="mt-1">
        <button type="button" onClick={() => signOut()} className={menuItemClass(false)}>
          <MenuIcon icon="solar:logout-2-bold-duotone" />
          <span className={isContracted ? "lg:hidden" : ""}>{t("sign-out")}</span>
        </button>
      </li>
    </>
  );
}
