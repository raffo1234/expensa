"use client";

import { useState } from "react";
import Image from "next/image";
import AsideMenu from "./AsideMenu";
import useSWR from "swr";
import roleFetcher from "@/fetchers/roleFetcher";
import AnimatedHamburgerButton from "./AnimatedHamburgerButton";
import { useContractStore } from "@/store/contract";

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
  const { isContracted, setIsContracted } = useContractStore();
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
    setIsContracted(!isContracted);
  };

  const roleName = role ? role[0]?.name : "...";

  return (
    <div className={`${isContracted ? "w-auto" : "lg:w-[286px]"} flex-shrink-0`}>
      <div className="flex justify-end p-2">
        <button
          onClick={toggleContracted}
          className="p-3 hidden lg:block bg-slate-100 rounded-lg"
          type="button"
        >
          <svg
            className={isContracted ? "rotate-180" : ""}
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
      <section
        className={`${
          isOpen
            ? "opacity-100 visible translate-x-0"
            : "invisible opacity-0 lg:visible lg:opacity-100 lg:translate-x-0 -translate-x-2"
        } transition-all w-full h-full overflow-auto absolute left-0 top-0 lg:static pb-8 pt-8 lg:pt-0 px-5 bg-white z-30`}
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
            <div className={`${isContracted ? "lg:hidden" : ""}`}>
              <p className="text-sm leading-3 mb-1 text-gray-500">Welcome</p>
              <h3 className="font-semibold text-gray-700 text-lg">{userName}</h3>
              <p className="text-xs text-gray-500">{roleName}</p>
            </div>
          </div>
        </header>
        <nav>
          <ul className="flex flex-col">
            <AsideMenu isContracted={isContracted} closeMenu={closeMenu} userRoleId={userRoleId} />
          </ul>
        </nav>
      </section>
    </div>
  );
}
