"use client";

import { useState } from "react";
import Image from "next/image";
import AsideMenu from "./AsideMenu";
import useSWR from "swr";
import roleFetcher from "@/fetchers/roleFetcher";
import AnimatedHamburgerButton from "./AnimatedHamburgerButton";
import { useUpsertUserSetting } from "@/hooks/useUpsertUserSetting";
import { useTranslations } from "next-intl";
import { SWR_KEY_USER_ROLE } from "@/constants";

const SETTING_KEY = "is_menu_contrated";

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

  const { settingValue: isMenuContracted, upsertSetting } = useUpsertUserSetting(
    userId,
    SETTING_KEY,
    initialIsMenuContracted,
  );

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
    upsertSetting(!isMenuContracted);
  };

  const roleName = role?.[0]?.name ?? "...";

  return (
    <div
      style={{ minHeight: "calc(100vh - 80px)" }}
      className={`${isMenuContracted ? "lg:w-[91px]" : "lg:w-[286px]"} transition-all duration-300 flex-shrink-0`}
    >
      <div className={`flex justify-end lg:p-2 ${!isMenuContracted ? "lg:pr-5" : "lg:pr-6"}`}>
        <button
          onClick={toggleContracted}
          className="p-3 cursor-pointer hover:bg-gray-200/70 transition-colors duration-300 active:scale-95 hidden lg:block bg-slate-100 rounded-lg"
          type="button"
        >
          <div className="w-[19px] relative h-[19px] rounded-md border-[1.5px] border-slate-800">
            <div
              className={`absolute top-0 ${isMenuContracted ? "translate-x-2.5" : "translate-x-1.5"} transition-transform duration-300 h-full border-r border-slate-800`}
            />
          </div>
        </button>
      </div>
      <AnimatedHamburgerButton isOpen={isOpen} toggleMenu={handleToggle} />
      <aside
        className={`${
          isOpen
            ? "opacity-100 visible translate-x-0"
            : "invisible opacity-0 lg:visible lg:opacity-100 lg:translate-x-0 -translate-x-2"
        } transition-all w-full h-full overflow-auto absolute left-0 top-0 lg:static pb-8 pt-8 lg:pt-0 px-5 z-30`}
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
