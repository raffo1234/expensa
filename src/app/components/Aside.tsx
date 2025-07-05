"use client";

import { useState } from "react";
import Image from "next/image";
import AsideMenu from "./AsideMenu";
import useSWR from "swr";
import roleFetcher from "@/fetchers/roleFetcher";
import AnimatedHamburgerButton from "./AnimatedHamburgerButton";

export default function Aside({
  userRoleId,
  userName,
  userImage,
}: {
  userRoleId: string;
  userName: string;
  userImage: string | undefined | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
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

  const roleName = role ? role[0]?.name : "...";

  return (
    <div className="flex-shrink-0">
      <AnimatedHamburgerButton isOpen={isOpen} toggleMenu={handleToggle} />
      <section
        className={`${
          isOpen
            ? "opacity-100 visible translate-x-0"
            : "invisible opacity-0 lg:visible lg:opacity-100 lg:translate-x-0 -translate-x-2"
        } transition-all lg:w-[286px] h-full w-full overflow-auto absolute left-0 top-0 lg:static py-8 px-5 bg-white z-30`}
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
            <div>
              <p className="text-sm leading-3 mb-1 text-gray-500">Welcome</p>
              <h3 className="font-semibold text-gray-700 text-lg">{userName}</h3>
              <p className="text-xs text-gray-500">{roleName}</p>
            </div>
          </div>
        </header>
        <nav>
          <ul className="flex flex-col">
            <AsideMenu closeMenu={closeMenu} userRoleId={userRoleId} />
          </ul>
        </nav>
      </section>
    </div>
  );
}
