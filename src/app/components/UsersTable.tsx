"use client";

import OptionButton from "@/components/OptionButton";
import { UserStateEnum } from "@/enums/userStatesEnum";
import { useCallback, useEffect, useMemo, useState } from "react";
import UserCard from "./UserCard";
import { supabase } from "@/lib/supabase";
import { useGetUsers } from "@/actions/useGetUsers";
import { useDebouncedCallback } from "use-debounce";
import { ICON_SIZE } from "@/constants";

const PAGE_SIZE = 9;

const SKELETON_ITEMS = Array.from({ length: PAGE_SIZE }, (_, i) => i);

export default function UsersTable() {
  const [option, setOption] = useState(UserStateEnum.ACTIVE);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const { data, isLoading, mutate } = useGetUsers(page, PAGE_SIZE, supabase, {
    archivedFilter: option,
    search,
  });

  const total = data?.count ?? 0;

  const totalPages = useMemo(() => Math.ceil(total / PAGE_SIZE), [total]);

  const debouncedSearchInput = useDebouncedCallback((event) => {
    setPage(0);
    setSearch(event.target.value);
  }, 350);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === "ArrowRight") {
        setPage((p) => (p + 1 < totalPages ? p + 1 : p));
      } else if (e.shiftKey && e.key === "ArrowLeft") {
        setPage((p) => (p > 0 ? p - 1 : 0));
      }
    },
    [totalPages],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleOptionChange = useCallback((value: UserStateEnum) => {
    setOption(value);
    setPage(0);
  }, []);

  return (
    <>
      <div className="mb-6 flex gap-2 items-center flex-wrap">
        {Object.values(UserStateEnum).map((value) => (
          <OptionButton
            key={value}
            onClick={() => handleOptionChange(value)}
            isActive={option === value}
          >
            {value}
          </OptionButton>
        ))}
      </div>

      <input
        onChange={debouncedSearchInput}
        placeholder="Search users"
        className="bg-white mb-6 w-full rounded-lg border border-gray-200 outline-0 px-5 py-2 focus:outline-none focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500"
      />

      <div className="my-3 flex justify-end items-center gap-2">
        <span className="text-xs font-semibold">Total: {total}</span>
        <button
          disabled={page === 0}
          onClick={() => setPage((p) => p - 1)}
          className="px-4 py-1 bg-cyan-400 disabled:pointer-events-none text-white rounded-full disabled:opacity-50 cursor-pointer text-sm"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={ICON_SIZE}
            height={ICON_SIZE}
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              fillRule="evenodd"
              d="M15.488 4.43a.75.75 0 0 1 .081 1.058L9.988 12l5.581 6.512a.75.75 0 1 1-1.138.976l-6-7a.75.75 0 0 1 0-.976l6-7a.75.75 0 0 1 1.057-.081"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <div className="text-xs uppercase font-semibold">
          {page + 1} of {totalPages}
        </div>
        <button
          disabled={(page + 1) * PAGE_SIZE >= total}
          onClick={() => setPage((p) => p + 1)}
          className="px-4 py-1 bg-cyan-400 disabled:pointer-events-none text-white rounded-full disabled:opacity-50 cursor-pointer text-sm"
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
              d="m9 5l6 7l-6 7"
            />
          </svg>
        </button>
      </div>
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}
      >
        {isLoading
          ? SKELETON_ITEMS.map((i) => (
              <div key={i} className="bg-gray-100 h-[258px] rounded-2xl animate-pulse" />
            ))
          : data?.data?.map((user) => <UserCard mutate={mutate} key={user.id} user={user} />)}
      </div>
    </>
  );
}
