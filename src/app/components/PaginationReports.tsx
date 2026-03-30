"use client";

import { Permissions } from "@/types/propertyState";
import { DicomStateEnum } from "@/enums/dicomStateEnum";
import extractAgeWidthUnit from "@/lib/extractAgeWithUnit";
import formatDateYYYYMMDD from "@/lib/formatDateYYYYMMDD";
import { supabase } from "@/lib/supabase";
import { DicomType } from "@/types/dicomType";
import { Icon } from "@iconify/react/dist/iconify.js";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { ChangeEvent, useEffect, useState } from "react";
import useSWR from "swr";
import TableSkeleton from "@/components/FormSkeleton";
import GeneratePDFButton from "@/components/GeneratePDFButton";
import DOCXPreview from "./DOCXPreview";
import { useDebouncedCallback } from "use-debounce";
import { startOfDay, formatISO, endOfDay, format } from "date-fns";
import DateRangeButtonCalendar from "./DateRangeButtonCalendar";
import EditUserTemplate from "./EditUserTemplate";
import CheckPermission from "./CheckPermission";

type SortDirection = "asc" | "desc" | null;

interface DateRangeType {
  startDate: Date;
  endDate: Date;
  key: string;
}

interface FetchResult {
  data: DicomType[] | null;
  total: number;
}

const fetcher = async (
  key: [
    string,
    number,
    number,
    string | null,
    SortDirection,
    string | null,
    string | null,
    { startDate: Date | null; endDate: Date | null } | null,
    { startDate: Date | null; endDate: Date | null } | null,
  ],
): Promise<FetchResult | null> => {
  const [
    tableName,
    page,
    pageSize,
    sortColumn,
    sortDirection,
    userTemplateId,
    searchWord,
    studyDateRange,
    receiptDateRange,
  ] = key;

  // Don't fetch until template is resolved
  if (!userTemplateId) return null;

  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  let dataQuery = supabase
    .from(tableName)
    .select(
      "*, user_dicom_user_id_fkey(id, image_url, first_name, last_name), template(header_image_url, footer_image_url, sign_image_url)",
    )
    .eq("template_id", userTemplateId)
    .eq("state", DicomStateEnum.COMPLETED)
    .range(start, end);

  let countQuery = supabase
    .from(tableName)
    .select("id", { count: "exact", head: true })
    .eq("template_id", userTemplateId)
    .eq("state", DicomStateEnum.COMPLETED);

  if (sortColumn && sortDirection) {
    dataQuery = dataQuery.order(sortColumn, { ascending: sortDirection === "asc" });
  } else {
    dataQuery = dataQuery.order("created_at", { ascending: false });
  }

  if (searchWord && searchWord.length > 0) {
    const filter = `patient_id.ilike.%${searchWord}%,patient_name.ilike.%${searchWord}%,institution.ilike.%${searchWord}%,study_description.ilike.%${searchWord}%`;
    dataQuery = dataQuery.or(filter);
    countQuery = countQuery.or(filter);
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
    const start = formatISO(startOfDay(receiptDateRange.startDate));
    const end = formatISO(endOfDay(receiptDateRange.endDate));
    dataQuery = dataQuery.gte("created_at", start).lte("created_at", end);
    countQuery = countQuery.gte("created_at", start).lte("created_at", end);
  }

  const [dataResult, countResult] = await Promise.all([dataQuery, countQuery]);

  if (dataResult.error) {
    console.error(`SWR Error fetching data from "${tableName}":`, dataResult.error);
    throw dataResult.error;
  }
  if (countResult.error) {
    console.error(`SWR Error fetching count from "${tableName}":`, countResult.error);
    throw countResult.error;
  }

  return {
    data: dataResult.data as DicomType[] | null,
    total: countResult.count as number,
  };
};

const SortIcon = ({
  column,
  sortColumn,
  sortDirection,
}: {
  column: string;
  sortColumn: string | null;
  sortDirection: SortDirection;
}) =>
  sortColumn === column && sortDirection ? (
    <Icon
      icon={sortDirection === "asc" ? "solar:arrow-up-outline" : "solar:arrow-down-outline"}
      className="inline-block ml-1"
      fontSize={12}
    />
  ) : null;

const thBtn =
  "py-3 w-full text-left px-2 rounded-lg cursor-pointer uppercase text-xs font-semibold hover:bg-cyan-50 bg-slate-50 transition-colors duration-300";

export default function PaginationReports({
  tableName,
  userId,
  userRoleId,
  templateId,
}: {
  tableName: "dicom";
  userId: string;
  userRoleId: string;
  templateId: string;
}) {
  const [studyDateRange, setStudyDateRange] = useState<DateRangeType | null>(null);
  const [receiptDateRange, setReceiptDateRange] = useState<DateRangeType | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [search, setSearch] = useState<string | null>(null);
  const [userTemplateId, setUserTemplateId] = useState<string | null>(templateId);

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value || null);
    if (value) {
      localStorage.setItem("dicomSearchWord", value);
    } else {
      localStorage.removeItem("dicomSearchWord");
    }
    setPage(1);
  }, 300);

  const debouncedPerPage = useDebouncedCallback((value: string) => {
    const n = parseInt(value, 10);
    if (!isNaN(n) && n > 0) {
      setPageSize(n);
      setPage(1);
    }
  }, 300);

  const swrKey = [
    tableName,
    page,
    pageSize,
    sortColumn,
    sortDirection,
    userTemplateId,
    search,
    studyDateRange,
    receiptDateRange,
  ] as const;

  const {
    data: result,
    error,
    isLoading,
    mutate,
  } = useSWR<FetchResult | null, Error>(swrKey, fetcher);

  const data = result?.data;
  const total = result?.total;
  const hasMore = !!data && data.length === pageSize;
  const noData = !isLoading && !error && !!data && data.length === 0;
  const startItemNumber = (page - 1) * pageSize + 1;

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
        localStorage.setItem("sortDirection", "desc");
      } else {
        setSortColumn(null);
        setSortDirection(null);
        localStorage.removeItem("sortColumn");
        localStorage.removeItem("sortDirection");
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
      localStorage.setItem("sortColumn", column);
      localStorage.setItem("sortDirection", "asc");
    }
    setPage(1);
  };

  const handleStudyDateRangeChange = (newRange: DateRangeType | null) => {
    setStudyDateRange(newRange);
    if (newRange) {
      localStorage.setItem("dicomStudyDateRange", JSON.stringify(newRange));
    } else {
      localStorage.removeItem("dicomStudyDateRange");
    }
    setPage(1);
  };

  const handleUserTemplateEdition = async (event: ChangeEvent<HTMLSelectElement>) => {
    const newId = event.target.value || null;
    setUserTemplateId(newId);
    try {
      await supabase.from("user").update({ template_id: newId }).eq("id", userId);
    } catch (err) {
      console.error(err);
    } finally {
      mutate();
    }
  };

  useEffect(() => {
    const savedSearch = localStorage.getItem("dicomSearchWord");
    if (savedSearch) setSearch(savedSearch);

    const savedStudyRange = localStorage.getItem("dicomStudyDateRange");
    if (savedStudyRange) setStudyDateRange(JSON.parse(savedStudyRange));

    const savedReceiptRange = localStorage.getItem("dicomReceiptDateRange");
    if (savedReceiptRange) setReceiptDateRange(JSON.parse(savedReceiptRange));

    const savedSortColumn = localStorage.getItem("sortColumn");
    const savedSortDirection = localStorage.getItem("sortDirection") as SortDirection;
    if (savedSortColumn) setSortColumn(savedSortColumn);
    if (savedSortDirection === "asc" || savedSortDirection === "desc")
      setSortDirection(savedSortDirection);

    setUserTemplateId(templateId);
  }, []);

  const showSkeleton = isLoading;

  return (
    <>
      <div className="w-full mb-4">
        <div className="flex max-w-lg w-full mx-auto sm:mx-0 items-center gap-3">
          <input
            type="text"
            className="bg-white w-full rounded-full border border-gray-200 outline-0 py-2 px-5"
            placeholder="Search ..."
            defaultValue={search ?? ""}
            onChange={(e) => debouncedSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-2 items-center mb-4 justify-between">
        <div className="flex items-center flex-col lg:flex-row gap-2">
          <DateRangeButtonCalendar
            dateRange={studyDateRange}
            handleDateRangeChange={handleStudyDateRangeChange}
            label="Study Date Range"
          />
          <CheckPermission userRoleId={userRoleId} requiredPermission={Permissions.MANAGE_USERS}>
            <EditUserTemplate
              handleUserTemplateEdition={handleUserTemplateEdition}
              userTemplateId={userTemplateId}
              userId={userId}
            />
          </CheckPermission>
        </div>
        <div className="text-xs flex items-center gap-1">
          <span>
            Total: <span className="text-base font-semibold">{total ?? "—"}</span>
          </span>
          <input
            onChange={(e) => debouncedPerPage(e.target.value)}
            type="text"
            name="pageSize"
            className="bg-white py-1 px-3 rounded-full text-center text-base transition-colors duration-300 hover:border-gray-300 focus:border-cyan-400 outline-0 border border-gray-200 w-16"
            defaultValue={pageSize}
          />
          <span>per page</span>
        </div>
      </div>

      {showSkeleton && <TableSkeleton rows={pageSize} cols={7} />}

      {error && (
        <p className="text-sm px-4 py-2 border border-rose-200 flex items-center gap-3 bg-rose-50 rounded-xl text-rose-700">
          <Icon icon="solar:close-circle-broken" className="flex-shrink-0" fontSize={20} />
          Error fetching data
        </p>
      )}

      {!showSkeleton && (
        <div className="bg-white shadow rounded-xl overflow-auto">
          <table className="text-sm w-full table-fixed">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="w-6 text-left uppercase text-xs font-semibold py-4 px-3">#</th>
                {[
                  { label: "Patient ID", col: "patient_id", w: "w-26 px-1" },
                  { label: "Institution Name", col: "institution", w: "w-46" },
                  { label: "Patient Name", col: "patient_name", w: "w-46 px-1" },
                  { label: "Sex", col: "gender", w: "w-14 py-2" },
                  { label: "Age", col: "patient_age", w: "w-16 px-1" },
                  { label: "Study Description", col: "study_description", w: "w-40 py-1" },
                  { label: "Study Date", col: "study_date", w: "w-30 px-1" },
                  { label: "Receipt Date", col: "created_at", w: "w-42 py-1" },
                  { label: "M", col: "modality", w: "w-13 px-1" },
                ].map(({ label, col, w }) => (
                  <th key={col} className={w}>
                    <button
                      type="button"
                      disabled={!!noData}
                      onClick={() => handleSort(col)}
                      className={thBtn}
                    >
                      {label}
                      <SortIcon
                        column={col}
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                      />
                    </button>
                  </th>
                ))}
                <th className="w-98" />
              </tr>
            </thead>

            {noData ? (
              <tbody>
                <tr>
                  <td colSpan={11} className="text-center">
                    <div className="relative w-full overflow-hidden">
                      <div className="absolute top-1/2 -translate-x-1/2 left-1/2 -translate-y-1/2 w-1/3 aspect-square rounded-full border border-gray-100" />
                      <div className="absolute top-1/2 -translate-x-1/2 left-1/2 -translate-y-1/2 w-1/2 aspect-square rounded-full border border-gray-100" />
                      <div className="absolute top-1/2 -translate-x-1/2 left-1/2 -translate-y-1/2 w-1/5 aspect-square rounded-full border border-gray-100" />
                      <div className="relative py-30 text-base max-w-80 w-full mx-auto">
                        <Icon
                          icon="solar:file-text-linear"
                          fontSize={60}
                          className="mb-6 mx-auto"
                        />
                        <div className="font-semibold text-lg px-4 mb-2">No data found</div>
                        <div className="text-gray-500 mb-6">
                          Your search{" "}
                          <span className="line-clamp-2 font-semibold text-black">{search}</span>{" "}
                          did not match any items. Please try again.
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="whitespace-nowrap">
                {data?.map(
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
                    index,
                  ) => {
                    const receiptDate = formatInTimeZone(
                      new Date(created_at),
                      "America/Lima",
                      "dd MMMM yyyy, hh:mm a",
                      { locale: es },
                    );

                    return (
                      <tr
                        key={id}
                        className={[
                          state === DicomStateEnum.VIEWED ? "bg-yellow-100" : "",
                          state === DicomStateEnum.DRAFT ? "bg-orange-100" : "",
                          state === DicomStateEnum.COMPLETED ? "bg-cyan-100" : "",
                          index % 2 === 0 && !state ? "bg-gray-50" : "",
                          index !== 0 ? "border-t border-gray-200" : "",
                        ].join(" ")}
                      >
                        <td className="whitespace-nowrap py-5 px-3">{startItemNumber + index}</td>
                        <td className="py-5 px-2">{patient_id}</td>
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
                        <td
                          title={formatDateYYYYMMDD(study_date) ?? ""}
                          className="whitespace-nowrap py-5 px-2"
                        >
                          {formatDateYYYYMMDD(study_date)}
                        </td>
                        <td
                          title={receiptDate ?? ""}
                          className="truncate whitespace-nowrap py-5 px-2"
                        >
                          {receiptDate}
                        </td>
                        <td className="py-5 px-2 text-center">{modality}</td>
                        <td className="py-2 px-2">
                          {state === DicomStateEnum.COMPLETED && (
                            <div className="flex gap-1 justify-end">
                              <GeneratePDFButton dicomId={id} />
                              <DOCXPreview dicomId={id} />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            )}
          </table>
        </div>
      )}

      {!noData && (
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
            className="flex cursor-pointer items-center gap-1 px-4 py-2 border border-transparent text-sm rounded-full text-white bg-cyan-500 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
          >
            <Icon icon="solar:arrow-left-outline" fontSize={16} />
            Previous
          </button>
          <span className="text-xs uppercase font-semibold text-gray-700">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore || isLoading}
            className="flex cursor-pointer items-center gap-1 px-4 py-2 border border-transparent text-sm rounded-full text-white bg-cyan-500 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
          >
            Next
            <Icon icon="solar:arrow-right-outline" fontSize={16} />
          </button>
        </div>
      )}
    </>
  );
}
