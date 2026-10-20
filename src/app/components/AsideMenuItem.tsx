"use client";

import { Popover } from "react-tiny-popover";
import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ICON_SIZE, STYLED_ICON_CLASS } from "@/constants";

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
      className={`${
        href === currentPath
          ? "text-purple-800 bg-purple-100 ring-1 ring-inset ring-purple-200"
          : "text-gray-800 hover:text-purple-800 hover:bg-purple-100/60"
      } group truncate rounded-lg w-full p-1 pr-3 gap-3.5 flex items-center text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300`}
      onClick={closeMenu}
      ref={ref}
    >
      <span
        className={`${STYLED_ICON_CLASS} transition-all duration-200 group-hover:border-purple-300 group-hover:shadow-sm`}
      >
        <Icon icon={iconName} fontSize={ICON_SIZE} className="flex-shrink-0" />
      </span>
      <span
        className={`${isContracted ? "lg:invisible lg:opacity-0 lg:w-0" : "lg:visible lg:opacity-100"} transition-all duration-400 overflow-hidden truncate`}
      >
        {title}
      </span>
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

  return (
    <Popover
      isOpen={isContracted && isPopoverOpen}
      positions={["right"]}
      padding={12}
      content={
        <div
          className={`${isPopoverOpen ? "opacity-100 -translate-x-2" : "opacity-0 -translate-x-4"} pointer-events-none px-4 py-1 bg-slate-800 text-white rounded-lg hidden lg:block transition-all duration-300 ease-in-out text-xs font-semibold`}
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
  );
}
