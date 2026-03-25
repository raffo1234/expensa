"use client";

import { supabase } from "@/lib/supabase";
import useSWR from "swr";
import MyStudy from "./MyStudy";
import useCheckboxSelection from "@/hooks/useCheckboxSelection";
import AssignDicomToTrigger from "./AssignDicomToTrigger";
import { Icon } from "@iconify/react/dist/iconify.js";
import { ICON_SIZE } from "@/constants";
import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import NavigationInstructions from "./NavigationInstructions";
import { useTranslations } from "next-intl";
import NoData from "./NoData";

async function fetcher(userId: string, page: number, pageSize: number, search: string) {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("dicom")
    .select(
      "id, state, patient_id, created_at, patient_name, study_date, study_description, comment",
      {
        count: "exact",
      },
    )
    .eq("user_id", userId)
    .range(from, to)
    .order("created_at", { ascending: false });

  if (search && search.trim() !== "") {
    const searchTerm = `%${search.trim()}%`;
    query = query.or(
      `patient_id.ilike.${searchTerm},patient_name.ilike.${searchTerm},study_description.ilike.${searchTerm}`,
    );
  }

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    data: data ?? [],
    count: count ?? 0,
  };
}

export default function MyStudiesPageContent({
  userId,
  userRoleId,
}: {
  userId: string;
  userRoleId: string;
}) {
  const t = useTranslations("My-Studies");
  const PAGE_SIZE = 9;
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useSWR([`admin-my-studies`, userId, page, search], () =>
    fetcher(userId, page, PAGE_SIZE, search),
  );

  const dicoms = data?.data ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const items = dicoms
    ? dicoms.map(({ id }) => {
        return {
          id,
        };
      })
    : [];

  const {
    selectedIds,
    isItemSelected,
    toggleItemSelected,
    handleSelectAllClick,
    isAllItemsSelected,
  } = useCheckboxSelection();

  const debouncedSearch = useDebouncedCallback((value) => {
    setSearch(value);
  }, 650);

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
      <h1 className="mb-1 font-semibold text-lg block"> {t("title")}</h1>
      <p className="mb-6 text-slate-500">Total: {total}</p>
      <input
        type="text"
        className="bg-white mb-6 w-full rounded-lg border border-gray-200 outline-0 px-5 py-2 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
        placeholder={`${t("search")} ...`}
        defaultValue={search ?? ""}
        onChange={(event) => debouncedSearch(event.target.value)}
      />
      <div className="mb-4 flex w-full justify-end">
        <NavigationInstructions />
      </div>
      <div className="p-1 rounded-lg bg-gray-100 flex justify-between w-full mb-2">
        <div className="flex gap-2">
          <div className="relative w-9 h-9">
            <input
              id="all"
              type="checkbox"
              checked={isAllItemsSelected(items)}
              onChange={() => handleSelectAllClick(items)}
              className="hidden peer"
            />
            <label
              htmlFor="all"
              className="cursor-pointer block w-full h-full absolute top-1/2 -translate-x-1/2 -translate-y-1/2 left-1/2 rounded-lg text-gray-400"
            ></label>
            <div className="bg-white cursor-pointer block w-5 h-5 border-2 pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 left-1/2 peer-checked:border-cyan-400 rounded-sm text-gray-400 peer-checked:text-cyan-400"></div>
            <svg
              className="hidden peer-checked:text-cyan-400 pointer-events-none peer-checked:block absolute top-1/2 -translate-x-1/2 -translate-y-1/2 left-1/2"
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
            >
              <g fill="none" fillRule="evenodd">
                <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                <path
                  fill="currentColor"
                  d="M21.546 5.111a1.5 1.5 0 0 1 0 2.121L10.303 18.475a1.6 1.6 0 0 1-2.263 0L2.454 12.89a1.5 1.5 0 1 1 2.121-2.121l4.596 4.596L19.424 5.111a1.5 1.5 0 0 1 2.122 0"
                />
              </g>
            </svg>
          </div>
          {selectedIds.size > 0 || isAllItemsSelected(items) ? (
            <div className="flex items-center gap-2">
              {selectedIds.size}
              <AssignDicomToTrigger
                dicomIds={Array.from(selectedIds)}
                userId={userId}
                userRoleId={userRoleId}
              />
            </div>
          ) : null}
        </div>
        <div className="flex justify-end items-center">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-1 bg-cyan-400 disabled:pointer-events-none text-white rounded-full disabled:opacity-50 cursor-pointer text-sm"
          >
            <Icon icon="solar:arrow-left-linear" fontSize={ICON_SIZE}></Icon>
          </button>

          <div className="text-xs uppercase font-semibold px-3">
            {total > 0 ? (
              <>
                {page + 1} / {total ? Math.ceil(total / PAGE_SIZE) : null}
              </>
            ) : (
              "-"
            )}
          </div>
          <button
            disabled={(page + 1) * PAGE_SIZE >= total}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-1 bg-cyan-400 disabled:pointer-events-none text-white rounded-full disabled:opacity-50 cursor-pointer text-sm"
          >
            <Icon icon="solar:arrow-right-linear" fontSize={20}></Icon>
          </button>
        </div>
      </div>
      {isLoading ? (
        <div className="flex flex-col gap-2">
          <div className="w-full h-[248px] rounded-lg bg-gray-100 animate-pulse"></div>
          <div className="w-full h-[248px] rounded-lg bg-gray-100 animate-pulse"></div>
        </div>
      ) : (
        <>
          {dicoms.length === 0 ? (
            <NoData />
          ) : (
            dicoms?.map((dicom) => {
              return (
                <MyStudy
                  userRoleId={userRoleId}
                  key={dicom.id}
                  dicom={dicom}
                  userId={userId}
                  isItemSelected={isItemSelected}
                  toggleItemSelected={toggleItemSelected}
                />
              );
            })
          )}
        </>
      )}
    </>
  );
}
