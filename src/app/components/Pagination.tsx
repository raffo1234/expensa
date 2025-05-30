"use client";

import toast from "react-hot-toast";
import { Permissions } from "@/types/propertyState";
import { DicomStateEnum } from "@/enums/dicomStateEnum";
import extractAgeWidthUnit from "@/lib/extractAgeWithUnit";
import formatDateYYYYMMDD from "@/lib/formatDateYYYYMMDD";
import { supabase } from "@/lib/supabase";
import { DicomType } from "@/types/dicomType";
import { Icon } from "@iconify/react/dist/iconify.js";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import TableSkeleton from "@/components/FormSkeleton";
import GeneratePDFButton from "@/components/GeneratePDFButton";
import DOCXPreview from "./DOCXPreview";
import { useDebouncedCallback } from "use-debounce";
import { startOfDay, formatISO, endOfDay, format } from "date-fns";
import DateRangeButtonCalendar from "./DateRangeButtonCalendar";
import { UUIDTypes } from "uuid";
import UploadButton from "./UploadButton";
import useCheckPermission from "@/hooks/useCheckPermission";
import useCheckboxSelection from "@/hooks/useCheckboxSelection";
import GenerateCompressedPDFs from "./GenerateCompressedPDFs";
import GenerateCompressedDOCs from "./GenerateCompressedDOCs";

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
  ]
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
  ] = key;

  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  let dataQuery = supabase
    .from(tableName)
    .select(
      "*, user(id, image_url, first_name, last_name), template(header_image_url, footer_image_url, sign_image_url)"
    )
    .eq("user_id", userId)
    .range(start, end);

  let countQuery = supabase
    .from(tableName)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (sortColumn && sortDirection) {
    dataQuery = dataQuery.order(sortColumn, {
      ascending: sortDirection === "asc",
    });
  } else {
    dataQuery = dataQuery.order("created_at", { ascending: false });
  }

  if (searchWord && searchWord.length > 0) {
    dataQuery = dataQuery.or(
      `patient_id.ilike.%${searchWord}%,patient_name.ilike.%${searchWord}%,institution.ilike.%${searchWord}%,study_description.ilike.%${searchWord}%`
    );
    countQuery = countQuery.or(
      `patient_id.ilike.%${searchWord}%,patient_name.ilike.%${searchWord}%,institution.ilike.%${searchWord}%,study_description.ilike.%${searchWord}%`
    );
  }

  if (studyDateRange?.startDate && studyDateRange?.endDate) {
    const formattedStartDate = format(studyDateRange.startDate, "yyyyMMdd");
    const formattedEndDate = format(studyDateRange.endDate, "yyyyMMdd");
    dataQuery = dataQuery
      .gte("study_date", formattedStartDate)
      .lte("study_date", formattedEndDate);
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
    console.error(
      `SWR Error fetching data from "${tableName}":`,
      dataResult.error
    );
    throw dataResult.error;
  }

  if (countResult.error) {
    console.error(
      `SWR Error fetching total count from "${tableName}":`,
      countResult.error
    );
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
}: {
  tableName: "dicom";
  userId: string;
  userRoleId: string;
}) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const {
    selectedIds,
    isItemSelected,
    toggleItemSelected,
    handleSelectAllClick,
    isAllItemsSelected,
  } = useCheckboxSelection<TableRowType>();

  const [filteredByState, setFilteredByState] = useState<DicomStateEnum | null>(
    null
  );

  const { hasPermission, isLoading: isLoadingPermissionDownloadReport } =
    useCheckPermission(userRoleId, Permissions.DOWNLOAD_REPORT);

  const [studyDateRange, setStudyDateRange] = useState<DateRangeType | null>(
    null
  );
  const [receiptDateRange, setReceiptDateRange] =
    useState<DateRangeType | null>(null);

  const debouncedSearch = useDebouncedCallback((value) => {
    handleSearchChange(value);
  }, 300);

  const debouncedPerPage = useDebouncedCallback((value) => {
    handlePageSize(value);
  }, 300);

  const savedPageSize = localStorage.getItem("pageSize");
  const defaultPageSize = savedPageSize ? parseInt(savedPageSize, 10) : 20;

  const savedPage = localStorage.getItem("page");
  const defaultPage = savedPage ? parseInt(savedPage, 10) : 1;

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
  ];

  const {
    data: result,
    error,
    isLoading,
    mutate,
  } = useSWR<FetchResult | null, number>(swrKey, fetcher);

  const hasMore: boolean =
    result?.data !== undefined &&
    result?.data !== null &&
    result?.data.length === pageSize;

  const handlePageSize = (pageSizeValue: string) => {
    if (typeof pageSizeValue === "string") {
      const newPageSize = parseInt(pageSizeValue, 10);

      if (!isNaN(newPageSize) && newPageSize > 0) {
        setPageSize(newPageSize);
        setPage(1);

        if (newPageSize) {
          localStorage.setItem("pageSize", String(newPageSize));
        } else {
          localStorage.removeItem("pageSize");
        }
      } else {
        console.warn("Invalid page size value received:", pageSizeValue);
      }
    } else {
      console.warn(
        "Page size value not found in form data or is not a string."
      );
    }
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage((prevPage) => {
        localStorage.setItem("page", String(prevPage - 1));
        return prevPage - 1;
      });
    }
  };

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

    setPage(1);
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
        })
      );
    } else {
      localStorage.removeItem("dicomReceiptDateRange");
    }
  };

  const deleteDicom = async (id: UUIDTypes) => {
    const confirmationMessage = confirm(
      "Are you sure you want to delete this item?"
    );
    if (!confirmationMessage) return;

    try {
      const { error: errorDelete } = await supabase
        .from("dicom")
        .delete()
        .eq("id", id);

      if (errorDelete) throw new Error("Could not sync image");
    } catch (error) {
      console.error("Error deleting", error);
    } finally {
      mutate();
    }
  };

  const filterByState = (state: DicomStateEnum) => {
    if (filteredByState === state) {
      setFilteredByState(null);
      localStorage.removeItem("dicomStateFilter");
    } else {
      setFilteredByState(state);
      localStorage.setItem("dicomStateFilter", state);
    }
  };

  const noData =
    !isLoading && !error && result?.data && result?.data.length === 0;
  const startItemNumber = (page - 1) * pageSize + 1;

  const clearLocalStorage = () => {
    const savedTemplateId = localStorage.getItem("dicomActiveTemplateId");
    if (savedTemplateId) localStorage.removeItem("dicomActiveTemplateId");

    handleSearchChange(null);
    if (searchInputRef.current) {
      searchInputRef.current.value = "";
    }

    setPage(1);

    handleStudyDateRangeChange(null);
    handleReceiptDateRangeChange(null);

    toast.success("Filters was cleared Successfully!");
  };

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
    if (
      storedSortDirection &&
      (storedSortDirection === "asc" || storedSortDirection === "desc")
    ) {
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

  return (
    <>
      <div className="w-full mb-4">
        <div className="flex w-full justify-between items-center gap-2">
          <div className="flex max-w-xl items-center gap-2 mx-auto sm:mx-0">
            <UploadButton />
            <input
              ref={searchInputRef}
              type="text"
              className="bg-white w-full rounded-full border border-gray-200 outline-0 py-2 px-5"
              placeholder="Search ..."
              defaultValue={search ?? ""}
              onChange={(event) => debouncedSearch(event.target.value)}
            />
          </div>
          <button
            title="Clear Dates and Location"
            onClick={clearLocalStorage}
            className="cursor-pointer text-cyan-400 hover:text-cyan-600 transition-colors duration-300"
          >
            <Icon icon="solar:restart-circle-linear" fontSize={32}></Icon>
          </button>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-2 items-center mb-4 justify-between">
        <div className="flex items-center flex-col lg:flex-row gap-2">
          <DateRangeButtonCalendar
            dateRange={studyDateRange}
            handleDateRangeChange={handleStudyDateRangeChange}
            label="Study Date Range"
          />
          <DateRangeButtonCalendar
            dateRange={receiptDateRange}
            handleDateRangeChange={handleReceiptDateRangeChange}
            label="Receipt Date Range"
          />
        </div>
        <div className="flex rounded-full items-center">
          {Object.values(DicomStateEnum).map((state, index) => (
            <button
              key={state}
              title={state}
              onClick={() => filterByState(state)}
              className={`
                ${state === filteredByState ? "border-3 border-slate-50" : ""}
                ${index === 0 ? "rounded-l-full" : ""}
                ${index === Object.values(DicomStateEnum).length - 1 ? "rounded-r-full" : ""}
                cursor-pointer h-[36px] w-10 
                ${state === DicomStateEnum.NEW ? "bg-white" : ""}
                ${state === DicomStateEnum.VIEWED ? "bg-yellow-300" : ""}
                ${state === DicomStateEnum.DRAFT ? "bg-orange-300" : ""}
                ${state === DicomStateEnum.COMPLETED ? "bg-cyan-300" : ""}`}
            ></button>
          ))}
        </div>
        <div className="text-xs flex items-center gap-1">
          <span>
            Total:{" "}
            <span className="text-base font-semibold">{result?.total}</span>
          </span>
          <input
            onChange={(event) => debouncedPerPage(event.target.value)}
            type="text"
            name="pageSize"
            className="bg-white py-1 px-3 rounded-full text-center text-base transition-colors duration-300 hover:border-gray-300 focus:border-cyan-400 outline-0 border border-gray-200 w-16"
            defaultValue={pageSize}
          />
          <span>per page</span>
        </div>
      </div>

      {isLoading ||
        (isLoadingPermissionDownloadReport && (
          <TableSkeleton rows={pageSize} cols={7} />
        ))}

      {error && (
        <p className="text-sm px-4 py-2 border border-rose-200 flex items-center gap-3 bg-rose-50 rounded-xl text-rose-700">
          <Icon
            icon="solar:close-circle-broken"
            className="flex-shrink-0"
            fontSize={20}
          ></Icon>
          Error fetching data
        </p>
      )}

      <div className="w-fit pl-2 flex item-center mb-4 gap-2">
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
            className="cursor-pointer block w-full h-full border absolute top-1/2 -translate-x-1/2 -translate-y-1/2 left-1/2 border-gray-200 rounded-lg text-gray-400"
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
        {selectedIds.size > 0 ? (
          result?.data?.[0] ? (
            <>
              <GenerateCompressedPDFs selectedIds={selectedIds} />
              <GenerateCompressedDOCs selectedIds={selectedIds} />
            </>
          ) : null
        ) : null}
      </div>

      <div className="bg-white shadow rounded-xl overflow-auto">
        <table className="text-sm w-full table-fixed">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="w-13 py-4 text-center"></th>
              <th className="w-6 text-center uppercase text-xs font-semibold py-4">
                #
              </th>
              <th className="w-25 px-1">
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
              <th className="w-36">
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
              <th className="w-40 px-1">
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
              <th className="w-14 py-2">
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
              <th className="w-16 px-1">
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
              <th className="w-40 py-1">
                <button
                  disabled={!!noData}
                  type="button"
                  onClick={() => handleSort("study_description")}
                  className="py-3 w-full text-left px-2 rounded-lg cursor-pointer uppercase text-xs font-semibold hover:bg-cyan-50 bg-slate-50 transition-colors duration-300"
                >
                  Study Description
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
              <th className="w-30 px-1">
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
              <th className="w-42 py-1">
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
              <th title="Modalidad" className="w-13 px-1">
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
              <th className="w-98"></th>
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
                      <div className="font-semibold text-lg px-4 mb-2">
                        No data found
                      </div>
                      <div className="text-gray-500 mb-6">
                        Your search{" "}
                        <div className="line-clamp-2 font-semibold text-black">
                          {search}
                        </div>{" "}
                        did not match any items. Please try again.
                      </div>
                      <UploadButton />
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
                    state,
                    gender,
                    institution,
                  },
                  index
                ) => {
                  const createdAt = new Date(created_at);

                  return (
                    <tr
                      key={id}
                      className={`
                      ${state === DicomStateEnum.VIEWED ? "bg-yellow-100" : ""}
                      ${state === DicomStateEnum.DRAFT ? "bg-orange-100" : ""}
                      ${state === DicomStateEnum.COMPLETED ? "bg-cyan-100" : ""}
                      ${index % 2 === 0 && !state ? "bg-gray-50" : ""} ${
                        index === 0 ? " " : "border-t border-gray-200"
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
                      <td className="py-5 px-2">
                        <Link href={`/admin/dicoms/${id}`} className="text-sm">
                          {patient_id}
                        </Link>
                      </td>
                      <td
                        title={institution}
                        className="truncate whitespace-nowrap py-5 px-2"
                      >
                        {institution}
                      </td>
                      <td
                        title={patient_name}
                        className="truncate whitespace-nowrap py-5 px-2"
                      >
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
                      <td className="whitespace-nowrap py-5 px-2">
                        {formatInTimeZone(
                          createdAt,
                          "America/Lima",
                          "dd MMMM yyyy, hh:mm a",
                          {
                            locale: es,
                          }
                        )}
                      </td>
                      <td className="py-5 px-2 text-center">{modality}</td>
                      <td className="py-2 px-2">
                        <div className="flex gap-1 justify-end">
                          {state === DicomStateEnum.COMPLETED &&
                          hasPermission ? (
                            result.data?.[index] ? (
                              <>
                                <GeneratePDFButton
                                  dicom={result.data[index]}
                                  label="PDF"
                                  userId={userId}
                                />
                                <DOCXPreview dicom={result.data[index]} />
                              </>
                            ) : null
                          ) : null}
                          <Link
                            href={`/admin/dicoms/${id}`}
                            title="Inform"
                            className="py-2 px-6 flex gap-3 items-center font-semibold border bg-cyan-500 text-white rounded-full cursor-pointer"
                          >
                            <Icon
                              icon={`${
                                state === DicomStateEnum.COMPLETED
                                  ? "solar:file-check-linear"
                                  : "solar:document-add-linear"
                              }`}
                              fontSize={24}
                            />
                            <span>
                              {state !== DicomStateEnum.COMPLETED
                                ? "Inform"
                                : "Amend"}
                            </span>
                          </Link>
                          <button
                            title="Delete Dicom"
                            onClick={() => deleteDicom(id)}
                            type="button"
                            className=" hover:bg-white flex-shrink-0 transition-colors duration-300 cursor-pointer bg-gray-100 w-11 h-11 rounded-full border-gray-200 border-dashed border text-rose-400 flex items-center justify-center"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                            >
                              <path
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeWidth="1.5"
                                d="M9.17 4a3.001 3.001 0 0 1 5.66 0m5.67 2h-17m14.874 9.4c-.177 2.654-.266 3.981-1.131 4.79s-2.195.81-4.856.81h-.774c-2.66 0-3.99 0-4.856-.81c-.865-.809-.953-2.136-1.13-4.79l-.46-6.9m13.666 0l-.2 3M9.5 11l.5 5m4.5-5l-.5 5"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          )}
        </table>
      </div>
      {!noData ? (
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={handlePreviousPage}
            disabled={page === 1 || isLoading}
            className="flex cursor-pointer items-center gap-1 px-4 py-2 border border-transparent text-sm rounded-full  text-white bg-cyan-500 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
          >
            <Icon icon="solar:arrow-left-outline" fontSize={16} />
            Previous
          </button>
          <span className="text-xs uppercase font-semibold text-gray-700">
            Page {page}
          </span>
          <button
            onClick={handleNextPage}
            disabled={!hasMore || isLoading}
            className="flex cursor-pointer items-center gap-1 px-4 py-2 border border-transparent text-sm rounded-full  text-white bg-cyan-500 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
          >
            Next
            <Icon icon="solar:arrow-right-outline" fontSize={16} />
          </button>
        </div>
      ) : null}
    </>
  );
}
