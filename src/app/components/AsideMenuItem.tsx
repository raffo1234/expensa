"use client";

import { Popover } from "react-tiny-popover";
import { ICON_SIZE } from "@/constants";
import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PageLink = {
  href: string;
  title: string;
  iconName: string;
  onMouseEnter?: () => void | undefined;
};

const MenuItemLink = React.forwardRef<
  HTMLAnchorElement,
  {
    page: PageLink;
    closeMenu: () => void;
    isContracted: boolean;
    openPopover: () => void;
    closePopover: () => void;
  }
>(({ page, closeMenu, isContracted, openPopover, closePopover }, ref) => {
  const { href, title, iconName, onMouseEnter } = page;
  const currentPath = usePathname();
  const router = useRouter();

  const handleMouseEnter = () => {
    openPopover();
    if (onMouseEnter) onMouseEnter();
  };

  useEffect(() => {
    router.prefetch(href);
  }, [href]);

  return (
    <Link
      href={href}
      title={title}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={closePopover}
      className={`${href === currentPath ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"
        } rounded-xl py-3 px-4 gap-3.5 flex items-center transition-colors duration-300 `}
      onClick={closeMenu}
      ref={ref}
    >
      <Icon
        icon={iconName}
        fontSize={ICON_SIZE}
        className={`${href === currentPath ? "text-rose-400" : ""}`}
      />
      <span className={isContracted ? "lg:hidden" : ""}>{title}</span>
    </Link>
  );
});

MenuItemLink.displayName = "MenuItemLink";

export default function AsideMenuItem({
  isContracted,
  page,
  closeMenu,
}: {
  isContracted: boolean;
  page: PageLink;
  closeMenu: () => void;
}) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return isContracted ? (
    <Popover
      isOpen={true}
      positions={["right"]}
      padding={12}
      content={
        <div
          className={`${isPopoverOpen ? "opacity-100 -translate-x-2" : "opacity-0 -translate-x-4"} pointer-events-none px-4 py-1 bg-slate-800 text-white rounded-lg transition-all duration-300 ease-in-out`}
        >
          {page.title}
        </div>
      }
    >
      <MenuItemLink
        openPopover={() => setIsPopoverOpen(true)}
        closePopover={() => setIsPopoverOpen(false)}
        closeMenu={closeMenu}
        page={page}
        isContracted={isContracted}
      />
    </Popover>
  ) : (
    <MenuItemLink
      openPopover={() => setIsPopoverOpen(true)}
      closePopover={() => setIsPopoverOpen(false)}
      closeMenu={closeMenu}
      page={page}
      isContracted={isContracted}
    />
  );
}
