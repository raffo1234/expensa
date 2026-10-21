"use client";

import OptionButton from "@/components/OptionButton";
import { UserStateEnum } from "@/enums/userStatesEnum";
import { useCallback, useEffect, useMemo, useState } from "react";
import UserCard from "./UserCard";
import { useGetUsers } from "@/actions/useGetUsers";
import { useDebouncedCallback } from "use-debounce";
import SearchInput from "./SearchInput";
import ClearFiltersButton from "./ClearFiltersButton";
import PageNavigator from "./PageNavigator";

const PAGE_SIZE = 9;

const SKELETON_ITEMS = Array.from({ length: PAGE_SIZE }, (_, i) => i);

export default function UsersTable() {
  const [option, setOption] = useState(UserStateEnum.ACTIVE);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const { data, isLoading, mutate } = useGetUsers(page, PAGE_SIZE, {
    archivedFilter: option,
    search,
  });

  const total = data?.count ?? 0;

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const [searchInput, setSearchInput] = useState("");
  const applySearch = useDebouncedCallback((value: string) => {
    setPage(0);
    setSearch(value);
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
      <div className="mb-8 flex items-center gap-2">
        <SearchInput
          value={searchInput}
          onChange={(value) => {
            setSearchInput(value);
            // Clearing applies right away instead of waiting for the debounce.
            if (!value) {
              applySearch.cancel();
              setPage(0);
              setSearch("");
            } else applySearch(value);
          }}
          placeholder="Buscar usuarios…"
          className="flex-1"
        />
        <ClearFiltersButton
          onClick={() => {
            applySearch.cancel();
            setSearchInput("");
            setSearch("");
            setPage(0);
          }}
          disabled={!searchInput}
        />
      </div>
      <p className="mb-4 text-sm text-gray-600 tabular-nums">
        {total} {total === 1 ? "usuario" : "usuarios"}
      </p>
      <PageNavigator
        page={page + 1}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(0, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        className="mb-4"
      />
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
