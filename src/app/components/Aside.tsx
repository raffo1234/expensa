"use client";

import { Icon } from "@iconify/react";
import { useState } from "react";
import Image from "next/image";
import AsideMenu from "./AsideMenu";
import { supabase } from "@/lib/supabase";
import useSWR from "swr";

const roleFetcher = async (roleId: string) => {
  const { data, error } = await supabase
    .from("role")
    .select("name")
    .eq("id", roleId);
  if (error) throw error;
  return data;
};

export default function Aside({
  userRoleId,
  userName,
  userImage,
}: {
  userRoleId: string;
  userName: string;
  userImage: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: role } = useSWR("user-role", () => roleFetcher(userRoleId));

  return (
    <div className="flex-shrink-0">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`${
          isOpen ? "text-cyan-500" : ""
        } lg:invisible z-20 visible absolute right-4 top-1 bg-white w-12 h-12 border border-gray-200 rounded-xl flex justify-center items-center`}
      >
        <Icon icon="solar:hamburger-menu-broken" fontSize={24} />
      </button>
      <section
        className={`${
          isOpen
            ? "opacity-100 visible translate-x-0"
            : "invisible opacity-0 lg:visible lg:opacity-100 lg:translate-x-0 -translate-x-2"
        } transition-all lg:w-[286px] w-full absolute left-0 top-0 lg:static py-8 px-5 bg-white z-10`}
      >
        <header className="mb-20">
          <div className="flex gap-4 items-center">
            <Image
              src={userImage}
              alt={userName}
              className="rounded-full bg-neutral-200"
              height={48}
              width={48}
            />
            <div>
              <p className="text-sm leading-3 mb-1 text-gray-500">Welcome</p>
              <h3 className="font-semibold text-gray-700 text-lg">
                {userName}
              </h3>
              <p className="text-xs text-gray-500">{role?.[0]?.name}</p>
            </div>
          </div>
        </header>
        <nav>
          <ul className="flex flex-col">
            <AsideMenu
              closeMenu={() => setIsOpen(false)}
              userRoleId={userRoleId}
            />
          </ul>
        </nav>
      </section>
    </div>
  );
}
