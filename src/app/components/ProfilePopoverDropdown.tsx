"use client";

import { ICON_SIZE } from "@/constants";
import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";
import RoleName from "./RoleName";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { useRef, useState } from "react";
import { useClickOutside } from "@/hooks/useClickOutside";

type NavItem = {
  href: string;
  icon: string;
  label: string;
};

const navItemClassName = "py-2 px-6 hover:bg-gray-50 flex items-center gap-3.5";

export default function ProfilePopoverDropdown({
  userImage,
  userName,
  userRole,
  userEmail,
}: {
  userImage: string | null | undefined;
  userName: string | null | undefined;
  userRole: string | null | undefined;
  userEmail: string | null | undefined;
}) {
  const t = useTranslations("Popover");
  const [isOpen, setIsOpen] = useState(false);
  const togglePopover = () => setIsOpen((next) => !next);

  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, () => setIsOpen(false), isOpen);

  const navItems: NavItem[] = [
    { href: "/", icon: "solar:home-smile-angle-broken", label: t("home") },
    { href: "/admin/profile", icon: "solar:user-linear", label: t("profile") },
    { href: "/admin/workspaces", icon: "solar:wallet-2-linear", label: "Workspaces" },
  ];

  return (
    <div className="flex items-center gap-4 relative z-30">
      <button
        type="button"
        onClick={togglePopover}
        className="relative cursor-pointer w-12 h-12 bg-gray-100 rounded-full"
      >
        {userImage ? (
          <Image
            src={userImage}
            className="rounded-full object-cover"
            width={48}
            height={48}
            alt={userName ?? ""}
            priority={true}
            quality={70}
          />
        ) : null}
        <div className="w-3 h-3 absolute top-9 right-0 rounded-full bg-green-400 border-2 border-white" />
      </button>
      <div
        ref={containerRef}
        className={`${isOpen ? "translate-y-0 visible opacity-100" : "opacity-0 invisible translate-y-2"} pt-2 transition-all duration-300 absolute top-full -right-3`}
      >
        <ul className="bg-white shadow-lg rounded-lg w-[300px] border border-gray-100">
          <li className="py-6 text-center">
            <div className="relative w-12 h-12 mb-4 mx-auto">
              {userImage && userImage ? (
                <Image
                  src={userImage}
                  className="rounded-full object-cover w-full h-full"
                  alt={userName ?? ""}
                  width={48}
                  height={48}
                  priority={false}
                />
              ) : null}
              <div className="w-3 h-3 absolute top-9 right-0 rounded-full bg-green-400 border-2 border-white" />
            </div>
            <p className="text-center text-sm font-semibold w-full mb-0.5">{userName}</p>
            <p className="text-slate-500 text-xs mb-2">{userEmail}</p>
            {userRole ? <RoleName roleName={userRole} /> : null}
          </li>
          {navItems.map(({ href, icon, label }) => (
            <li key={href}>
              <Link href={href} onClick={togglePopover} title={label} className={navItemClassName}>
                <Icon icon={icon} fontSize={ICON_SIZE} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </li>
          ))}
          <li className="border-t border-gray-100">
            <button
              onClick={() => signOut()}
              className="hover:text-red-500 cursor-pointer w-full px-6 py-4 flex items-center gap-3.5 text-left transition-colors duration-300"
            >
              <Icon
                icon="solar:inbox-out-linear"
                className="-rotate-90"
                fontSize={ICON_SIZE}
                aria-hidden="true"
              />
              <span>{t("sign-out")}</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
