"use client";

import { useState } from "react";
import Image from "next/image";
import AsideMenu from "./AsideMenu";
import useSWR from "swr";
import roleFetcher from "@/fetchers/roleFetcher";
import AnimatedHamburgerButton from "./AnimatedHamburgerButton";
import { useUpsertUserSetting } from "@/hooks/useUpsertUserSetting";

export default function Aside({
  userId,
  userRoleId,
  userName,
  userImage,
}: {
  userId: string;
  userRoleId: string;
  userName: string;
  userImage: string | undefined | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { settingValue: isMenuContracted, upsertSetting } = useUpsertUserSetting(
    userId,
    "is_menu_contrated",
  );
  const { data: role } = useSWR("user-role", () => roleFetcher(userRoleId));

  const closeMenu = () => {
    setIsOpen(false);
    const documentElement = document.documentElement;
    documentElement.style.overflow = "visible";
  };

  const handleToggle = () => {
    if (isOpen) {
      closeMenu();
    } else {
      handleOpen();
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    const documentElement = document.documentElement;
    documentElement.style.overflow = "hidden";
  };

  const toggleContracted = () => {
    upsertSetting(!isMenuContracted);
  };

  const roleName = role ? role[0]?.name : "...";

  return (
    <div className={`${isMenuContracted ? "w-auto" : "lg:w-[286px]"} bg-white transition-all duration-300 flex-shrink-0 border-r border-r-gray-200`}>
      <div className="flex justify-end lg:p-2">
        <button
          onClick={toggleContracted}
          className="p-3 hidden lg:block bg-slate-100 rounded-lg"
          type="button"
        >
          <svg
            className={isMenuContracted ? "rotate-180" : ""}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M19 11H7.14l3.63-4.36a1 1 0 1 0-1.54-1.28l-5 6a1 1 0 0 0-.09.15c0 .05 0 .08-.07.13A1 1 0 0 0 4 12a1 1 0 0 0 .07.36c0 .05 0 .08.07.13a1 1 0 0 0 .09.15l5 6A1 1 0 0 0 10 19a1 1 0 0 0 .64-.23a1 1 0 0 0 .13-1.41L7.14 13H19a1 1 0 0 0 0-2"
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
          <div className="flex gap-4 items-center">
            {userImage ? (
              <Image
                src={userImage}
                alt={userName}
                className="rounded-full bg-neutral-200"
                height={48}
                width={48}
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-100" />
            )}
            <div className={`${isMenuContracted ? "lg:hidden" : ""}`}>
              <p className="text-sm leading-3 mb-1 text-gray-500">Welcome</p>
              <h3 className="font-semibold text-gray-700 text-lg">{userName}</h3>
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
