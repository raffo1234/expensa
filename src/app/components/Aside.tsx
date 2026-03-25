"use client";

import { useState } from "react";
import Image from "next/image";
import AsideMenu from "./AsideMenu";
import useSWR from "swr";
import roleFetcher from "@/fetchers/roleFetcher";
import AnimatedHamburgerButton from "./AnimatedHamburgerButton";
import { useUpsertUserSetting } from "@/hooks/useUpsertUserSetting";
import { useTranslations } from "next-intl";
import { ICON_SIZE, SWR_KEY_USER_ROLE } from "@/constants";

export default function Aside({
  userId,
  userRoleId,
  userName,
  userImage,
  isMenuContracted: initialIsMenuContracted,
}: {
  userId: string;
  userRoleId: string;
  userName: string;
  userImage: string | undefined | null;
  isMenuContracted: boolean;
}) {
  const t = useTranslations("Aside");
  const [isOpen, setIsOpen] = useState(false);
  const [isMenuContracted, setIsMenuContracted] = useState(initialIsMenuContracted);

  const { upsertSetting } = useUpsertUserSetting(userId, "is_menu_contrated");

  const { data: role } = useSWR(SWR_KEY_USER_ROLE, () => roleFetcher(userRoleId));

  const closeMenu = () => {
    setIsOpen(false);
    document.documentElement.style.overflow = "visible";
  };

  const handleOpen = () => {
    setIsOpen(true);
    document.documentElement.style.overflow = "hidden";
  };

  const handleToggle = () => (isOpen ? closeMenu() : handleOpen());

  const toggleContracted = () => {
    const next = !isMenuContracted;
    setIsMenuContracted(next);
    upsertSetting(next);
  };

  const roleName = role?.[0]?.name ?? "...";

  return (
    <div
      style={{ minHeight: "calc(100vh - 80px)" }}
      className={`${isMenuContracted ? "w-[91px]" : "lg:w-[286px]"} bg-white transition-all duration-300 flex-shrink-0 border-r border-r-gray-200`}
    >
      <div className={`flex justify-end lg:p-2 ${!isMenuContracted ? "lg:pr-5" : "lg:pr-6"}`}>
        <button
          onClick={toggleContracted}
          className="p-3 cursor-pointer hidden lg:block bg-slate-100 rounded-lg"
          type="button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={ICON_SIZE}
            height={ICON_SIZE}
            viewBox="0 0 24 24"
          >
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M9 3.5v17M3 9.4c0-2.24 0-3.36.436-4.216a4 4 0 0 1 1.748-1.748C6.04 3 7.16 3 9.4 3h5.2c2.24 0 3.36 0 4.216.436a4 4 0 0 1 1.748 1.748C21 6.04 21 7.16 21 9.4v5.2c0 2.24 0 3.36-.436 4.216a4 4 0 0 1-1.748 1.748C17.96 21 16.84 21 14.6 21H9.4c-2.24 0-3.36 0-4.216-.436a4 4 0 0 1-1.748-1.748C3 17.96 3 16.84 3 14.6z"
            />
          </svg>
        </button>
      </div>
      <AnimatedHamburgerButton isOpen={isOpen} toggleMenu={handleToggle} />
      <aside
        className={`${
          isOpen
            ? "opacity-100 visible translate-x-0"
            : "invisible opacity-0 lg:visible lg:opacity-100 lg:translate-x-0 -translate-x-2"
        } transition-all bg-white w-full h-full overflow-auto absolute left-0 top-0 lg:static pb-8 pt-8 lg:pt-0 px-5 z-30`}
      >
        <header className="mb-20">
          <div className="flex min-h-[60px] gap-4 items-center">
            {userImage ? (
              <Image
                src={userImage}
                alt={userName}
                className="rounded-full bg-neutral-200"
                height={48}
                width={48}
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-100" />
            )}
            <div
              className={`${isMenuContracted ? "lg:invisible lg:opacity-0 lg:w-0" : "lg:visible lg:opacity-100"} transition-all duration-300 truncate`}
            >
              <p className="text-sm leading-3 mb-1 text-gray-500">{t("welcome")}</p>
              <h3 className="font-semibold text-gray-700 truncate text-lg">{userName}</h3>
              <p className="text-xs text-gray-500">{roleName}</p>
            </div>
          </div>
        </header>
        <nav>
          <ul className="flex flex-col">
            <AsideMenu
              isContracted={isMenuContracted}
              closeMenu={closeMenu}
              userRoleId={userRoleId}
            />
          </ul>
        </nav>
      </aside>
    </div>
  );
}
