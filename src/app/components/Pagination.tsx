"use client";

import toast from "react-hot-toast";
import { DicomStateEnum } from "@/enums/dicomStateEnum";
import extractAgeWidthUnit from "@/lib/extractAgeWithUnit";
import formatDateYYYYMMDD from "@/lib/formatDateYYYYMMDD";
import { supabase } from "@/lib/supabase";
import { DicomInstance, DicomType } from "@/types/dicomType";
import { Icon } from "@iconify/react/dist/iconify.js";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import TableSkeleton from "@/components/FormSkeleton";
import { useDebouncedCallback } from "use-debounce";
import { startOfDay, formatISO, endOfDay, format } from "date-fns";
import DateRangeButtonCalendar from "./DateRangeButtonCalendar";
import UploadLink from "./UploadLink";
import useCheckboxSelection from "@/hooks/useCheckboxSelection";
import GenerateCompressedPDFs from "./GenerateCompressedPDFs";
import GenerateCompressedDOCs from "./GenerateCompressedDOCs";
import TableActionButtons from "./TableActionButtons";
import ShareReportButton from "./ShareReportButton";
import Attachments from "./Attachments";
import AssignDicomToTrigger from "./AssignDicomToTrigger";
import AssignedBy from "./AssignedBy";
import { ICON_SIZE } from "@/constants";
import FilterByState from "./FilterByState";
import ClearButton from "./ClearButton";
import { useRouter } from "next/navigation";
import DownloadAllZip from "./DownloadAllZip";
import DuplicateDicom from "./DuplicateDicom";
import InformButton from "./InformButton";
import InnerCircularButton from "./InnerCircularButton";

type SortDirection = "asc" | "desc" | null;

interface DateRangeType {
  startDate: Date;
  endDate: Date;
  key: string;
}

const fetcher = async (
  key: [
    string,
    number,
    number,
    string | null,
    SortDirection,
    string,
    string | null,
    { startDate: Date | null; endDate: Date | null } | null,
    { startDate: Date | null; endDate: Date | null } | null,
    DicomStateEnum | null,
    boolean,
    boolean,
    boolean,
    boolean,
  ],
): Promise<{ data: DicomType[] | null; total: number } | null> => {
  const [
    tableName,
    page,
    pageSize,
    sortColumn,
    sortDirection,
    userId,
    searchWord,
    studyDateRange,
    receiptDateRange,
    filteredByState,
    canViewNew,
    canViewViewed,
    canViewDraft,
    canViewCompleted,
  ] = key;

  const start = page * pageSize;
  const end = start + pageSize - 1;

  let dataQuery = supabase
    .from("dicom_visible_to_user")
    .select("*")
    .or(`user_id.eq.${userId},assigned_user_id.eq.${userId}`)
    .range(start, end);

  let countQuery = supabase
    .from("dicom_visible_to_user")
    .select("id", { count: "exact", head: true })
    .or(`user_id.eq.${userId},assigned_user_id.eq.${userId}`);

  const canViewByState: string[] = [];
  if (canViewNew) {
    canViewByState.push(`state.eq.`);
  }
  if (canViewViewed) {
    canViewByState.push(`state.eq.VIEWED`);
  }
  if (canViewDraft) {
    canViewByState.push(`state.eq.DRAFT`);
  }
  if (canViewCompleted) {
    canViewByState.push(`state.eq.COMPLETED`);
  }

  if (canViewByState.length > 0) {
    if (canViewByState.length === 1) {
      const filterPart = canViewByState[0].split(".");
      if (filterPart.length === 3 && filterPart[1] === "eq") {
        dataQuery = dataQuery.eq(filterPart[0], filterPart[2]);
      }
    } else {
      dataQuery = dataQuery.or(canViewByState.join(","));
    }
  } else {
    dataQuery = dataQuery.eq("state", "any");
  }

  if (sortColumn && sortDirection) {
    dataQuery = dataQuery.order(sortColumn, {
      ascending: sortDirection === "asc",
    });
  } else {
    dataQuery = dataQuery.order("created_at", { ascending: false });
  }

  if (searchWord && searchWord.length > 0) {
    const trimmedSearchWord = searchWord.trim();
    dataQuery = dataQuery.or(
      `patient_id.ilike.%${trimmedSearchWord}%,patient_name.ilike.%${trimmedSearchWord}%,institution.ilike.%${trimmedSearchWord}%,study_description.ilike.%${trimmedSearchWord}%`,
    );
    countQuery = countQuery.or(
      `patient_id.ilike.%${trimmedSearchWord}%,patient_name.ilike.%${trimmedSearchWord}%,institution.ilike.%${trimmedSearchWord}%,study_description.ilike.%${trimmedSearchWord}%`,
    );
  }

  if (studyDateRange?.startDate && studyDateRange?.endDate) {
    const formattedStartDate = format(studyDateRange.startDate, "yyyyMMdd");
    const formattedEndDate = format(studyDateRange.endDate, "yyyyMMdd");
    dataQuery = dataQuery.gte("study_date", formattedStartDate).lte("study_date", formattedEndDate);
    countQuery = countQuery
      .gte("study_date", formattedStartDate)
      .lte("study_date", formattedEndDate);
  }

  if (receiptDateRange?.startDate && receiptDateRange?.endDate) {
    dataQuery = dataQuery
      .gte("created_at", formatISO(startOfDay(receiptDateRange?.startDate)))
      .lte("created_at", formatISO(endOfDay(receiptDateRange?.endDate)));
    countQuery = countQuery
      .gte("created_at", formatISO(startOfDay(receiptDateRange?.startDate)))
      .lte("created_at", formatISO(endOfDay(receiptDateRange?.endDate)));
  }

  if (filteredByState) {
    if (filteredByState === DicomStateEnum.NEW) {
      dataQuery = dataQuery.eq("state", "");
      countQuery = countQuery.eq("state", "");
    } else {
      dataQuery = dataQuery.eq("state", filteredByState);
      countQuery = countQuery.eq("state", filteredByState);
    }
  }

  const [dataResult, countResult] = await Promise.all([dataQuery, countQuery]);

  if (dataResult.error) {
    console.error(`SWR Error fetching data from "${tableName}":`, dataResult.error);
    throw dataResult.error;
  }

  if (countResult.error) {
    console.error(`SWR Error fetching total count from "${tableName}":`, countResult.error);
    throw countResult.error;
  }

  return {
    data: dataResult.data as DicomType[] | null,
    total: countResult.count as number,
  };
};

interface TableRowType {
  id: string;
}

export default function Pagination({
  tableName,
  userId,
  userRoleId,
  canViewNew,
  canViewViewed,
  canViewDraft,
  canViewCompleted,
}: {
  tableName: "dicom";
  userId: string;
  userRoleId: string;
  canViewNew: boolean;
  canViewViewed: boolean;
  canViewDraft: boolean;
  canViewCompleted: boolean;
}) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pageSizeRef = useRef<HTMLInputElement>(null);
  const {
    selectedIds,
    isItemSelected,
    toggleItemSelected,
    handleSelectAllClick,
    isAllItemsSelected,
  } = useCheckboxSelection<TableRowType>();

  const [filteredByState, setFilteredByState] = useState<DicomStateEnum | null>(null);

  const [studyDateRange, setStudyDateRange] = useState<DateRangeType | null>(null);
  const [receiptDateRange, setReceiptDateRange] = useState<DateRangeType | null>(null);

  const debouncedSearch = useDebouncedCallback((value) => {
    handleSearchChange(value);
  }, 650);

  const debouncedPerPage = useDebouncedCallback((value) => {
    handlePageSize(value);
  }, 300);

  const savedPageSize = localStorage.getItem("pageSize");
  const defaultPageSize = savedPageSize ? parseInt(savedPageSize, 10) : 20;

  const savedPage = localStorage.getItem("page");
  const defaultPage = savedPage ? parseInt(savedPage, 10) : 0;

  const [page, setPage] = useState<number>(defaultPage);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [search, setSearch] = useState<string | null>(null);

  interface FetchResult {
    data: DicomType[] | null;
    total: number;
  }

  const swrKey = [
    tableName,
    page,
    pageSize,
    sortColumn,
    sortDirection,
    userId,
    search,
    studyDateRange,
    receiptDateRange,
    filteredByState,
    canViewNew,
    canViewViewed,
    canViewDraft,
    canViewCompleted,
  ];

  const {
    data: result,
    error,
    isLoading,
    mutate,
  } = useSWR<FetchResult | null, number>(swrKey, fetcher);

  const router = useRouter();

  const hasMore: boolean =
    result?.data !== undefined && result?.data !== null && result?.data.length === pageSize;

  const handlePageSize = (pageSizeValue: string) => {
    if (typeof pageSizeValue === "string") {
      const newPageSize = parseInt(pageSizeValue, 10);

      if (!isNaN(newPageSize) && newPageSize > 0) {
        setPageSize(newPageSize);
        setPage(0);

        if (newPageSize) {
          localStorage.setItem("pageSize", String(newPageSize));
        } else {
          localStorage.removeItem("pageSize");
        }
      } else {
        console.warn("Invalid page size value received:", pageSizeValue);
      }
    } else {
      console.warn("Page size value not found in form data or is not a string.");
    }
  };

  const handlePreviousPage = () => {
    if (page > 0) {
      setPage((prevPage) => {
        localStorage.setItem("page", String(prevPage - 1));
        return prevPage - 1;
      });
    }
  };

  const total = result?.total ?? 0;

  const handleNextPage = () => {
    if (hasMore) {
      setPage((prevPage) => {
        localStorage.setItem("page", String(prevPage + 1));
        return prevPage + 1;
      });
    }
  };

  const handleSort = (column: string) => {
    let newSortDirection: SortDirection | null = "asc";

    if (sortColumn === column) {
      if (sortDirection === "asc") {
        newSortDirection = "desc";
      } else if (sortDirection === "desc") {
        newSortDirection = null;
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
    }

    setSortDirection(newSortDirection);

    if (newSortDirection !== null) {
      localStorage.setItem("sortColumn", column);
      localStorage.setItem("sortDirection", newSortDirection);
    } else {
      localStorage.removeItem("sortColumn");
      localStorage.removeItem("sortDirection");
    }

    setPage(0);
  };

  const handleSearchChange = (newSearchWord: string | null) => {
    setSearch(newSearchWord);
    if (newSearchWord && newSearchWord.length > 0) {
      localStorage.setItem("dicomSearchWord", newSearchWord);
    } else {
      localStorage.removeItem("dicomSearchWord");
    }
  };

  const handleStudyDateRangeChange = (newRange: DateRangeType | null) => {
    setStudyDateRange(newRange);
    if (newRange?.startDate && newRange?.endDate) {
      localStorage.setItem("dicomStudyDateRange", JSON.stringify(newRange));
    } else {
      localStorage.removeItem("dicomStudyDateRange");
    }
  };

  const handleReceiptDateRangeChange = (newRange: DateRangeType | null) => {
    setReceiptDateRange(newRange); // Update the state first

    if (newRange?.startDate && newRange?.endDate) {
      const endOfSelectedDay = endOfDay(newRange.endDate);
      localStorage.setItem(
        "dicomReceiptDateRange",
        JSON.stringify({
          startDate: newRange.startDate,
          endDate: endOfSelectedDay,
          key: "selection",
        }),
      );
    } else {
      localStorage.removeItem("dicomReceiptDateRange");
    }
  };

  const noData = !isLoading && !error && result?.data && result?.data.length === 0;
  const startItemNumber = page * pageSize + 1;

  const clearLocalStorageSearch = () => {
    handleSearchChange(null);
    if (searchInputRef.current) {
      searchInputRef.current.value = "";
    }
  };

  const clearLocalStorage = () => {
    handleSearchChange(null);
    if (searchInputRef.current) {
      searchInputRef.current.value = "";
    }

    setPage(0);
    localStorage.removeItem("page");

    setPageSize(20);
    if (pageSizeRef.current) {
      pageSizeRef.current.value = "20";
    }
    const savedPageSize = localStorage.getItem("pageSize");
    if (savedPageSize) localStorage.removeItem("pageSize");

    handleStudyDateRangeChange(null);
    handleReceiptDateRangeChange(null);

    handleSelectAllClick([]);

    setFilteredByState(null);
    localStorage.removeItem("dicomStateFilter");

    setSortColumn(null);
    localStorage.removeItem("sortColumn");
    setSortDirection(null);
    localStorage.removeItem("sortDirection");

    toast.success("Filters was cleared Successfully!");
  };

  const FIVE_MINUTES = 5 * 60 * 1000;

  useEffect(() => {
    if (!searchInputRef.current?.value) return;

    const timer = setTimeout(() => {
      clearLocalStorageSearch();
    }, FIVE_MINUTES);

    return () => clearTimeout(timer);
  }, [searchInputRef.current?.value]);

  useEffect(() => {
    if (savedPage) {
      setPage(defaultPage);
    }
    if (savedPageSize) {
      setPageSize(defaultPageSize);
    }
    const savedStateFilter = localStorage.getItem("dicomStateFilter");
    if (savedStateFilter) {
      setFilteredByState(savedStateFilter as DicomStateEnum);
    }
    const savedSearchWord = localStorage.getItem("dicomSearchWord");
    if (savedSearchWord) {
      setSearch(savedSearchWord);
    }
    const savedStudyDateRange = localStorage.getItem("dicomStudyDateRange");
    if (savedStudyDateRange) {
      setStudyDateRange(JSON.parse(savedStudyDateRange));
    }
    const savedReceiptDateRange = localStorage.getItem("dicomReceiptDateRange");
    if (savedReceiptDateRange) {
      setReceiptDateRange(JSON.parse(savedReceiptDateRange));
    }

    const storedSortColumn = localStorage.getItem("sortColumn");
    const storedSortDirection = localStorage.getItem("sortDirection");

    if (storedSortColumn) {
      setSortColumn(storedSortColumn);
    }
    if (storedSortDirection && (storedSortDirection === "asc" || storedSortDirection === "desc")) {
      setSortDirection(storedSortDirection as SortDirection);
    }
  }, []);

  const items = result?.data
    ? result?.data?.map(({ id }) => {
      return {
        id,
      };
    })
    : [];

  const totalPages = Math.ceil(total / pageSize);

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

  useEffect(() => {
    if (!result?.data) return;

    for (const item of result.data) {
      router.prefetch(`/admin/dicoms/${item.id}`);
    }
  }, [result?.data]);

  return (
    <>
      <div className="w-full flex flex-col xl:flex-row gap-2 mb-4">
        <div className="flex gap-2 flex-grow-1">
          <div className="relative w-full">
            <input
              ref={searchInputRef}
              type="text"
              className="bg-white w-full rounded-full border border-gray-200 outline-0 px-5 py-2 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
              placeholder="Search ..."
              defaultValue={search ?? ""}
              onChange={(event) => debouncedSearch(event.target.value)}
            />
            {searchInputRef.current && searchInputRef.current.value.length > 0 ? (
              <button
                type="button"
                onClick={clearLocalStorageSearch}
                title="Clear Search"
                className="absolute top-1/2 -translate-y-1/2 right-[4px] hover:bg-slate-200 transition-colors duration-300 p-1.5 cursor-pointer rounded-full bg-slate-50"
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
                    d="m7 7l10 10M7 17L17 7"
                    strokeWidth="1"
                  />
                </svg>
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex-col min-[770px]:flex-row flex gap-2">
          <div className="flex flex-col min-[770px]:flex-row gap-2">
            <DateRangeButtonCalendar
              dateRange={studyDateRange}
              handleDateRangeChange={handleStudyDateRangeChange}
              label="Study Date"
            />
            <DateRangeButtonCalendar
              dateRange={receiptDateRange}
              handleDateRangeChange={handleReceiptDateRangeChange}
              label="Receipt Date"
            />
          </div>
          <div className="flex gap-2">
            <FilterByState
              filteredByState={filteredByState ?? ""}
              setFilteredByState={setFilteredByState}
            />
            <ClearButton clearLocalStorage={clearLocalStorage} />
          </div>
        </div>
      </div>
      <div className="text-xs flex w-full items-center justify-end mb-4 gap-1">
        <span>
          Total: <span className="text-base font-semibold">{result?.total}</span>
        </span>
        <input
          ref={pageSizeRef}
          onChange={(event) => debouncedPerPage(event.target.value)}
          type="text"
          name="pageSize"
          className="bg-white py-1 px-3 rounded-full text-center text-base transition-colors duration-300 hover:border-gray-300 focus:border-cyan-400 outline-0 border border-gray-200 w-16"
          defaultValue={pageSize}
        />
        <span>per page</span>
      </div>

      {isLoading ? <TableSkeleton rows={pageSize} cols={7} /> : null}

      {error && (
        <p className="text-sm px-4 py-2 border border-rose-200 flex items-center gap-3 bg-rose-50 rounded-xl text-rose-700">
          <Icon icon="solar:close-circle-broken" className="flex-shrink-0" fontSize={20}></Icon>
          Error fetching data
        </p>
      )}
      <div className="flex item-center mb-2 gap-2">
        <div className="p-1 rounded-lg bg-gray-100 flex justify-between w-full">
          <div className="flex gap-4 items-center">
            <div className="ml-1 relative w-9 h-9">
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
            <div>{selectedIds.size > 0 ? selectedIds.size : null}</div>
            {selectedIds.size > 0 ? (
              <div className="flex items-center gap-2">
                {result?.data?.[0] ? (
                  <>
                    <GenerateCompressedPDFs selectedIds={selectedIds} />
                    <GenerateCompressedDOCs selectedIds={selectedIds} />
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
          {!noData ? (
            <div className="flex justify-end items-center">
              <button
                onClick={handlePreviousPage}
                disabled={page === 0 || isLoading}
                className="px-4 py-1 bg-cyan-400 disabled:pointer-events-none text-white rounded-full disabled:opacity-50 cursor-pointer text-sm"
              >
                <Icon icon="solar:arrow-left-linear" fontSize={ICON_SIZE}></Icon>
              </button>
              <div className="text-xs uppercase font-semibold px-3">
                {page + 1} / {result?.total ? Math.ceil(result?.total / pageSize) : null}
              </div>
              <button
                onClick={handleNextPage}
                disabled={(page + 1) * pageSize >= total || isLoading}
                className="px-4 py-1 bg-cyan-400 disabled:pointer-events-none text-white rounded-full disabled:opacity-50 cursor-pointer text-sm"
              >
                <Icon icon="solar:arrow-right-linear" fontSize={20}></Icon>
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <div className="bg-white shadow rounded-xl overflow-auto">
        <table className="text-sm w-full table-fixed">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="w-13 py-4 text-center"></th>
              <th className="w-6 text-center uppercase text-xs font-semibold py-4">#</th>
              <th className="w-10 text-center uppercase text-xs font-semibold py-4"></th>
              <th className="w-25 px-[1px]">
                <button
                  type="button"
                  disabled={!!noData}
                  onClick={() => handleSort("patient_id")}
                  className="py-3 w-full text-left px-2 rounded-lg cursor-pointer uppercase text-xs font-semibold hover:bg-cyan-50 bg-slate-50 transition-colors duration-300"
                >
                  Patient ID
                  {sortColumn === "patient_id" && sortDirection && (
                    <Icon
                      icon={
                        sortDirection === "asc"
                          ? "solar:arrow-up-outline"
                          : "solar:arrow-down-outline"
                      }
                      className="inline-block"
                      fontSize={14}
                    />
                  )}
                </button>
              </th>
              <th className="w-36 px-[1px]">
                <button
                  onClick={() => handleSort("institution")}
                  disabled={!!noData}
                  type="button"
                  className="py-3 w-full text-left px-2 rounded-lg cursor-pointer uppercase text-xs font-semibold hover:bg-cyan-50 bg-slate-50 transition-colors duration-300"
                >
                  Institution Name
                  {sortColumn === "institution" && sortDirection && (
                    <Icon
                      icon={
                        sortDirection === "asc"
                          ? "solar:arrow-up-outline"
                          : "solar:arrow-down-outline"
                      }
                      className="inline-block"
                      fontSize={12}
                    />
                  )}
                </button>
              </th>
              <th className="w-34 px-[1px]">
                <button
                  disabled={!!noData}
                  onClick={() => handleSort("patient_name")}
                  type="button"
                  className="py-3 w-full text-left px-2 rounded-lg cursor-pointer uppercase text-xs font-semibold hover:bg-cyan-50 bg-slate-50 transition-colors duration-300"
                >
                  Patient Name
                  {sortColumn === "patient_name" && sortDirection && (
                    <Icon
                      icon={
                        sortDirection === "asc"
                          ? "solar:arrow-up-outline"
                          : "solar:arrow-down-outline"
                      }
                      className="inline-block ml-1"
                      fontSize={12}
                    />
                  )}
                </button>
              </th>
              <th className="w-14 px-[1px]">
                <button
                  disabled={!!noData}
                  type="button"
                  onClick={() => handleSort("gender")}
                  className="py-3 w-full text-left px-2 rounded-lg cursor-pointer uppercase text-xs font-semibold hover:bg-cyan-50 bg-slate-50 transition-colors duration-300"
                >
                  Sex
                  {sortColumn === "gender" && sortDirection && (
                    <Icon
                      icon={
                        sortDirection === "asc"
                          ? "solar:arrow-up-outline"
                          : "solar:arrow-down-outline"
                      }
                      className="inline-block ml-1"
                      fontSize={12}
                    />
                  )}
                </button>
              </th>
              <th className="w-16 px-[1px]">
                <button
                  disabled={!!noData}
                  type="button"
                  onClick={() => handleSort("patient_age")}
                  className="py-3 w-full text-left px-2 rounded-lg cursor-pointer uppercase text-xs font-semibold hover:bg-cyan-50 bg-slate-50 transition-colors duration-300"
                >
                  Age
                  {sortColumn === "patient_age" && sortDirection && (
                    <Icon
                      icon={
                        sortDirection === "asc"
                          ? "solar:arrow-up-outline"
                          : "solar:arrow-down-outline"
                      }
                      className="inline-block ml-1"
                      fontSize={12}
                    />
                  )}
                </button>
              </th>
              <th className="w-38 px-[1px]">
                <button
                  disabled={!!noData}
                  type="button"
                  title="Study Description"
                  onClick={() => handleSort("study_description")}
                  className="py-3 w-full text-left px-2 rounded-lg cursor-pointer uppercase text-xs font-semibold hover:bg-cyan-50 bg-slate-50 transition-colors duration-300"
                >
                  Study Desc...
                  {sortColumn === "study_description" && sortDirection && (
                    <Icon
                      icon={
                        sortDirection === "asc"
                          ? "solar:arrow-up-outline"
                          : "solar:arrow-down-outline"
                      }
                      className="inline-block ml-1"
                      fontSize={12}
                    />
                  )}
                </button>
              </th>
              <th className="w-28 px-[1px]">
                <button
                  disabled={!!noData}
                  type="button"
                  onClick={() => handleSort("study_date")}
                  className="py-3 w-full text-left px-2 rounded-lg cursor-pointer uppercase text-xs font-semibold hover:bg-cyan-50 bg-slate-50 transition-colors duration-300"
                >
                  Study Date
                  {sortColumn === "study_date" && sortDirection && (
                    <Icon
                      icon={
                        sortDirection === "asc"
                          ? "solar:arrow-up-outline"
                          : "solar:arrow-down-outline"
                      }
                      className="inline-block ml-1"
                      fontSize={12}
                    />
                  )}
                </button>
              </th>
              <th className="w-28 px-[1px]">
                <button
                  disabled={!!noData}
                  type="button"
                  onClick={() => handleSort("created_at")}
                  className="py-3 w-full text-left px-2 rounded-lg cursor-pointer uppercase text-xs font-semibold hover:bg-cyan-50 bg-slate-50 transition-colors duration-300"
                >
                  Receipt Date
                  {sortColumn === "created_at" && sortDirection && (
                    <Icon
                      icon={
                        sortDirection === "asc"
                          ? "solar:arrow-up-outline"
                          : "solar:arrow-down-outline"
                      }
                      className="inline-block ml-1"
                      fontSize={12}
                    />
                  )}
                </button>
              </th>
              <th className="w-34 px-[1px]">
                <button
                  disabled={!!noData}
                  type="button"
                  onClick={() => handleSort("completed_at")}
                  className="py-3 w-full text-left px-2 rounded-lg cursor-pointer uppercase text-xs font-semibold hover:bg-cyan-50 bg-slate-50 transition-colors duration-300"
                >
                  Completed Date
                  {sortColumn === "completed_at" && sortDirection && (
                    <Icon
                      icon={
                        sortDirection === "asc"
                          ? "solar:arrow-up-outline"
                          : "solar:arrow-down-outline"
                      }
                      className="inline-block ml-1"
                      fontSize={12}
                    />
                  )}
                </button>
              </th>
              <th title="Modality" className="w-13 px-1">
                <button
                  disabled={!!noData}
                  type="button"
                  onClick={() => handleSort("modality")}
                  className="py-3 w-full text-left px-2 rounded-lg cursor-pointer uppercase text-xs font-semibold hover:bg-cyan-50 bg-slate-50 transition-colors duration-300"
                >
                  M
                  {sortColumn === "modality" && sortDirection && (
                    <Icon
                      icon={
                        sortDirection === "asc"
                          ? "solar:arrow-up-outline"
                          : "solar:arrow-down-outline"
                      }
                      className="inline-block ml-1"
                      fontSize={12}
                    />
                  )}
                </button>
              </th>
              <th className="w-10"></th>
              <th className="w-10"></th>
              <th className="w-10"></th>
              <th className="w-10"></th>
              <th className="w-10"></th>
              <th className="w-10"></th>
              <th className="w-46"></th>
            </tr>
          </thead>
          {noData ? (
            <tbody>
              <tr>
                <td colSpan={12} className="text-center">
                  <div className="relative w-full overflow-hidden">
                    <div className="absolute top-1/2 -translate-x-1/2 left-1/2 -translate-y-1/2 w-1/3 aspect-square rounded-full border border-gray-100"></div>
                    <div className="absolute top-1/2 -translate-x-1/2 left-1/2 -translate-y-1/2 w-1/2 aspect-square rounded-full border border-gray-100"></div>
                    <div className="absolute top-1/2 -translate-x-1/2 left-1/2 -translate-y-1/2 w-1/5 aspect-square rounded-full border border-gray-100"></div>
                    <div className="relative py-30 text-base max-w-80 w-full mx-auto">
                      <Icon
                        icon="solar:file-text-linear"
                        fontSize={60}
                        className="mb-6 mx-auto"
                      ></Icon>
                      <div className="font-semibold text-lg px-4 mb-2">No data found</div>
                      <div className="text-gray-500 mb-6">
                        Your search{" "}
                        <div className="line-clamp-2 font-semibold text-black">{search}</div> did
                        not match any items. Please try again.
                      </div>
                      <UploadLink />
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody className="whitespace-nowrap">
              {result?.data?.map(
                (
                  {
                    id,
                    patient_name,
                    patient_id,
                    patient_age,
                    study_description,
                    modality,
                    study_date,
                    created_at,
                    completed_at,
                    state,
                    gender,
                    institution,
                    dicom_url,
                    assigned_by,
                    instances,
                    is_duplicated,
                  },
                  index,
                ) => {
                  const createdAt = new Date(created_at);
                  const completedAt = completed_at ? new Date(completed_at) : null;

                  const completedAtFormatted = completedAt
                    ? formatInTimeZone(completedAt, "America/Lima", "dd MMMM yyyy, hh:mm a", {
                      locale: es,
                    })
                    : "";

                  const createdAtFormatted = formatInTimeZone(
                    createdAt,
                    "America/Lima",
                    "dd MMMM yyyy, hh:mm a",
                    {
                      locale: es,
                    },
                  );

                  const hasData = (instances?: DicomInstance[] | null): boolean => {
                    return Array.isArray(instances) && instances.length > 0;
                  };

                  const hasInstances = hasData(instances);

                  return (
                    <tr
                      key={id}
                      className={`
                      ${state === DicomStateEnum.VIEWED ? "bg-yellow-100" : ""}
                      ${state === DicomStateEnum.DRAFT ? "bg-orange-100" : ""}
                      ${state === DicomStateEnum.COMPLETED ? "bg-cyan-100" : ""}
                      ${index % 2 === 0 && !state ? "bg-gray-50" : ""} ${index === 0 ? " " : "border-t border-gray-200"
                        }`}
                    >
                      <td className="py-3 pl-2 pr-1 text-center">
                        <div className="relative w-fit cursor-pointer">
                          <input
                            id={id}
                            type="checkbox"
                            className="hidden peer"
                            checked={isItemSelected(id)}
                            onChange={() => toggleItemSelected(id)}
                          />
                          <label
                            htmlFor={id}
                            className="block cursor-pointer p-2 w-9 h-9 text-gray-400"
                          ></label>
                          <div className="pointer-events-none bg-white w-5 h-5 border-2 peer-checked:border-cyan-400 rounded-sm text-gray-400 peer-checked:text-cyan-400 absolute top-1/2 -translate-x-1/2 -translate-y-1/2 left-1/2"></div>
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
                      </td>
                      <td className="whitespace-nowrap py-5 text-center">
                        {startItemNumber + index}
                      </td>
                      <td>
                        <InformButton dicomId={id} dicomState={state} />
                      </td>
                      <td className="py-5 px-2 truncate whitespace-nowrap ">
                        <Link
                          title={patient_id}
                          href={`${hasInstances ? `https://viewers-xi.vercel.app/viewer/dicomjson?url=https://www.cadia.cc/api/dicom-json/${id}` : `/admin/dicoms/${id}`}`}
                          className="text-sm flex items-center truncate relative"
                          target="_blank"
                        >
                          {!hasInstances ? null : (
                            <svg
                              className="shrink-0"
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                            >
                              <path
                                fill="currentColor"
                                d="M8.31 10.28a2.5 2.5 0 1 0 2.5 2.49a2.5 2.5 0 0 0-2.5-2.49m0 3.8a1.31 1.31 0 1 1 0-2.61a1.31 1.31 0 1 1 0 2.61m7.38-3.8a2.5 2.5 0 1 0 2.5 2.49a2.5 2.5 0 0 0-2.5-2.49M17 12.77a1.31 1.31 0 1 1-1.31-1.3a1.31 1.31 0 0 1 1.31 1.3"
                              />
                              <path
                                fill="currentColor"
                                d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m7.38 10.77a3.69 3.69 0 0 1-6.2 2.71L12 16.77l-1.18-1.29a3.69 3.69 0 1 1-5-5.44l-1.2-1.3H7.3a8.33 8.33 0 0 1 9.41 0h2.67l-1.2 1.31a3.7 3.7 0 0 1 1.2 2.72"
                              />
                              <path
                                fill="currentColor"
                                d="M14.77 9.05a7.2 7.2 0 0 0-5.54 0A4.06 4.06 0 0 1 12 12.7a4.08 4.08 0 0 1 2.77-3.65"
                              />
                            </svg>
                          )}
                          <span>{patient_id}</span>
                        </Link>
                      </td>
                      <td title={institution} className="truncate whitespace-nowrap py-5 px-2">
                        {institution}
                      </td>
                      <td title={patient_name} className="truncate whitespace-nowrap py-5 px-2">
                        {patient_name}
                      </td>
                      <td className="py-5 px-2 text-center">{gender}</td>
                      <td className="whitespace-nowrap py-5 px-2">
                        {extractAgeWidthUnit(patient_age).value}{" "}
                        {extractAgeWidthUnit(patient_age).unit}
                      </td>
                      <td
                        title={study_description}
                        className="truncate whitespace-nowrap py-5 px-2"
                      >
                        {study_description}
                      </td>
                      <td className="whitespace-nowrap py-5 px-2">
                        {formatDateYYYYMMDD(study_date)}
                      </td>
                      <td
                        title={createdAtFormatted}
                        className="whitespace-nowrap truncate py-5 px-2"
                      >
                        {createdAtFormatted}
                      </td>
                      <td
                        title={completedAtFormatted}
                        className="whitespace-nowrap truncate py-5 px-2"
                      >
                        {completedAtFormatted}
                      </td>
                      <td className="py-5 px-2 text-center">{modality}</td>
                      <td className="text-center">
                        {assigned_by ? <AssignedBy assignedBy={assigned_by} /> : null}
                      </td>
                      <td className="text-center">
                        <AssignDicomToTrigger
                          dicomIds={[id]}
                          userId={userId}
                          userRoleId={userRoleId}
                        />
                      </td>
                      <td className="text-center">
                        <ShareReportButton id={id} userId={userId} />
                      </td>
                      <td className="text-center">
                        <Attachments
                          dicomId={id}
                          Button={
                            <button title="Attachments" type="button">
                              <InnerCircularButton title="Attachments">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width={ICON_SIZE}
                                  height={ICON_SIZE}
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    fill="currentColor"
                                    fillRule="evenodd"
                                    d="M8.886 3.363c2.942-2.817 7.7-2.817 10.643 0c2.961 2.834 2.961 7.444 0 10.279l-7.948 7.608c-2.09 2-5.466 2-7.556 0a5.03 5.03 0 0 1 0-7.324l7.834-7.498a3.253 3.253 0 0 1 4.468 0a3 3 0 0 1 0 4.367l-7.89 7.554a.75.75 0 1 1-1.038-1.084l7.89-7.553a1.503 1.503 0 0 0 0-2.2a1.753 1.753 0 0 0-2.393 0L5.062 15.01a3.53 3.53 0 0 0 0 5.156c1.51 1.445 3.972 1.445 5.482 0l7.948-7.608c2.344-2.244 2.344-5.868 0-8.112c-2.363-2.261-6.206-2.261-8.57 0l-6.403 6.13A.75.75 0 0 1 2.48 9.493z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </InnerCircularButton>
                            </button>
                          }
                        />
                      </td>
                      <td className="text-center">
                        <>
                          {dicom_url ? (
                            <Link target="_blank" href={dicom_url} download title="Download Zip">
                              <InnerCircularButton title="Download Zip">
                                <Icon icon="solar:cloud-download-outline" fontSize={ICON_SIZE} />
                              </InnerCircularButton>
                            </Link>
                          ) : null}
                          {hasInstances ? <DownloadAllZip fileIds={[id]} /> : null}
                        </>
                      </td>
                      <td className="text-center">
                        {!is_duplicated && result.data ? (
                          <DuplicateDicom mutate={mutate} dicom={result.data[index]} />
                        ) : null}
                      </td>
                      <td className="px-2">
                        {result.data ? (
                          <TableActionButtons
                            activeUserId={userId}
                            userRoleId={userRoleId}
                            dicom={result.data[index]}
                            mutate={mutate}
                          />
                        ) : null}
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          )}
        </table>
      </div>
    </>
  );
}
