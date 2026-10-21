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
import { UserCardSkeleton } from "./Skeleton";

const PAGE_SIZE = 9;

const SKELETON_ITEMS = Array.from({ length: PAGE_SIZE }, (_, i) => i);

export default function UsersTable() {
  const [option, setOption] = useState(UserStateEnum.ACTIVE);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const { data, error, isLoading, mutate } = useGetUsers(page, PAGE_SIZE, {
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
      {error ? (
        // A failed request must not look like an empty list.
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>No se pudieron cargar los usuarios. {error.message}</span>
          <button
            type="button"
            onClick={() => mutate()}
            className="cursor-pointer font-medium underline underline-offset-2"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <p className="mb-4 text-sm text-gray-600 tabular-nums">
          {isLoading ? "Cargando…" : `${total} ${total === 1 ? "usuario" : "usuarios"}`}
        </p>
      )}
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
          ? SKELETON_ITEMS.map((i) => <UserCardSkeleton key={i} />)
          : data?.data?.map((user) => <UserCard mutate={mutate} key={user.id} user={user} />)}
      </div>
    </>
  );
}
