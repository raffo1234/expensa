"use client";

import { Popover } from "react-tiny-popover";
import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// Fly.io dashboard sidebar, measured from their UI: 40px rows, a 26px white
// icon box with a 15px duotone violet icon, 10px to the label, 16px label at
// weight 400, active row on a soft violet background.
const ITEM =
  "group flex h-10 w-full items-center gap-2.5 truncate rounded-lg px-2.5 text-base font-normal transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300";

export function menuItemClass(active: boolean) {
  return `${ITEM} ${active ? "bg-violet-100/70 text-violet-600" : "text-navy-900 hover:text-violet-600"}`;
}

export function MenuIcon({ icon, className = "" }: { icon: string; className?: string }) {
  return (
    <span className="flex size-6.5 flex-shrink-0 items-center justify-center rounded-md border border-violet-200/70 bg-white text-violet-500 shadow-[0_1px_2px_rgb(91_33_182/0.08)]">
      <Icon icon={icon} fontSize={15} className={className} aria-hidden />
    </span>
  );
}

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
      className={menuItemClass(
        href === currentPath || (href !== "/" && currentPath.startsWith(`${href}/`)),
      )}
      onClick={closeMenu}
      ref={ref}
    >
      <MenuIcon icon={iconName} />
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
