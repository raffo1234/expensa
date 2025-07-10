"use client";

import OptionButton from "@/components/OptionButton";
import { UserStateEnum } from "@/enums/userStatesEnum";
import { useEffect, useState } from "react";
import UserCard from "./UserCard";
import { supabase } from "@/lib/supabase";
import { useGetUsers } from "@/actions/useGetUsers";
import { useDebouncedCallback } from "use-debounce";
import { Icon } from "@iconify/react/dist/iconify.js";
import { ICON_SIZE } from "@/constants";

const PAGE_SIZE = 9;

export default function UsersTable() {
  const [option, setOption] = useState(UserStateEnum.ACTIVE);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const { data, isLoading, mutate } = useGetUsers(page, PAGE_SIZE, supabase, {
    archivedFilter: option,
    search,
  });

  const debouncedSearchInput = useDebouncedCallback((event) => {
    setPage(0);
    setSearch(event.target.value);
  }, 350);

  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === "ArrowRight") {
        setPage((p) => (p + 1 < totalPages ? p + 1 : p));
      } else if (e.shiftKey && e.key === "ArrowLeft") {
        setPage((p) => (p > 0 ? p - 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [totalPages]);

  return (
    <>
      <h1 className="mb-6 font-semibold text-lg block">Users</h1>
      <div className="mb-6 flex gap-2 items-center flex-wrap">
        {Object.values(UserStateEnum).map((value) => {
          return (
            <OptionButton
              key={value}
              onClick={() => {
                setOption(value);
                setPage(0);
              }}
              isActive={option === value}
            >
              {value}
            </OptionButton>
          );
        })}
      </div>
      <input
        onChange={debouncedSearchInput}
        placeholder="Search users"
        className="bg-white mb-6 w-full rounded-lg border border-gray-200 outline-0 px-5 py-2 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
      />
      <div className="my-3 flex justify-end items-center gap-2">
        <span className="text-xs font-semibold">

        Total: {total}
        </span>
        <button
          disabled={page === 0}
          onClick={() => setPage((p) => p - 1)}
          className="px-4 py-1 bg-cyan-400 disabled:pointer-events-none text-white rounded-full disabled:opacity-50 cursor-pointer text-sm"
        >
          <Icon icon="solar:arrow-left-linear" fontSize={ICON_SIZE}></Icon>
        </button>
        <div className="text-xs uppercase font-semibold">
          {page + 1} of {Math.ceil(total / PAGE_SIZE)}
        </div>
        <button
          disabled={(page + 1) * PAGE_SIZE >= total}
          onClick={() => setPage((p) => p + 1)}
          className="px-4 py-1 bg-cyan-400 disabled:pointer-events-none text-white rounded-full disabled:opacity-50 cursor-pointer text-sm"
        >
          <Icon icon="solar:arrow-right-linear" fontSize={ICON_SIZE}></Icon>
        </button>
      </div>
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
        }}
      >
        {isLoading ? (
          <>
            <div className={`bg-gray-100 h-[174px] rounded-2xl animate-pulse`} />
            <div className={`bg-gray-100 h-[174px] rounded-2xl animate-pulse`} />
            <div className={`bg-gray-100 h-[174px] rounded-2xl animate-pulse`} />
          </>
        ) : null}
        {data?.data?.map((user) => {
          return <UserCard mutate={mutate} key={user.id} user={user} />;
        })}
      </div>
    </>
  );
}
