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
import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import useSWR from "swr";
import TableSkeleton from "@/components/FormSkeleton";
import GeneratePDFButton from "@/components/GeneratePDFButton";
import DOCXPreview from "./DOCXPreview";
import { useDebouncedCallback } from "use-debounce";
import { startOfDay, formatISO, endOfDay, format } from "date-fns";
import DateRangeButtonCalendar from "./DateRangeButtonCalendar";
import useCheckPermission from "@/hooks/useCheckPermission";
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
    string,
    string | null,
    { startDate: Date | null; endDate: Date | null } | null,
    { startDate: Date | null; endDate: Date | null } | null,
  ]
): Promise<{ data: DicomType[] | null; total: number } | null> => {
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

  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  // Query for the data
  let dataQuery = supabase
    .from(tableName)
    .select(
      "*, user(id, image_url, first_name, last_name), template(header_image_url, footer_image_url, sign_image_url)"
    )
    .eq("template_id", userTemplateId)
    .eq("state", DicomStateEnum.COMPLETED)
    .range(start, end);

  // Query for the total count
  let countQuery = supabase
    .from(tableName)
    .select("id", { count: "exact", head: true })
    .eq("template_id", userTemplateId)
    .eq("state", DicomStateEnum.COMPLETED);

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

export default function PaginationReports({
  tableName,
  userId,
  templateId,
  userRoleId,
}: {
  tableName: "dicom";
  userId: string;
  templateId: string;
  userRoleId: string;
}) {
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

  const defaultPageSize = 20;
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [search, setSearch] = useState<string | null>(null);
  const [userTemplateId, setUserTemplateId] = useState<string>(templateId);

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
  ];

  const {
    data: result,
    error,
    isLoading,
    mutate,
  } = useSWR<FetchResult | null, number>(swrKey, fetcher);

  const data = result?.data;
  const total = result?.total;

  const hasMore: boolean =
    data !== undefined && data !== null && data.length === pageSize;

  const handlePageSize = (pageSizeValue: string) => {
    if (typeof pageSizeValue === "string") {
      const newPageSize = parseInt(pageSizeValue, 10);

      if (!isNaN(newPageSize) && newPageSize > 0) {
        setPageSize(newPageSize);
        setPage(1);
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
      setPage((prevPage) => prevPage - 1);
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      setPage((prevPage) => prevPage + 1);
    }
  };

  const handleSort = (column: string) => {
    let newSortDirection: SortDirection | null = "asc";

    if (sortColumn === column) {
      if (sortDirection === "asc") {
        newSortDirection = "desc";
      } else if (sortDirection === "desc") {
        newSortDirection = null;
        setSortColumn(null); // Reset sort column when toggling from desc
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

  const handleUserTemplateEdition = async (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    const newUserTemplateId = event.target.value;
    if (newUserTemplateId) setUserTemplateId(newUserTemplateId);

    try {
      await supabase
        .from("user")
        .update({
          template_id: newUserTemplateId === "" ? null : newUserTemplateId,
        })
        .eq("id", userId);
    } catch (error) {
      console.error(error);
    } finally {
      mutate();
    }
  };

  const noData = !isLoading && !error && data && data.length === 0;
  const startItemNumber = (page - 1) * pageSize + 1;

  useEffect(() => {
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

    setUserTemplateId(templateId);
  }, []);

  return (
    <>
      <div className="w-full mb-4">
        <div className="flex max-w-lg w-full mx-auto sm:mx-0 items-center gap-3">
          <input
            type="text"
            className="bg-white w-full rounded-full border border-gray-200 outline-0 py-2 px-5"
            placeholder="Search ..."
            defaultValue={search ?? ""}
            onChange={(event) => debouncedSearch(event.target.value)}
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
          <CheckPermission
            userRoleId={userRoleId}
            requiredPermission={Permissions.MANAGE_ROLES}
          >
            <EditUserTemplate
              handleUserTemplateEdition={handleUserTemplateEdition}
              userTemplateId={userTemplateId}
              userId={userId}
            />
          </CheckPermission>
        </div>
        <div className="text-xs flex items-center gap-1">
          <span>
            Total: <span className="text-base font-semibold">{total}</span>
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

      <div className="bg-white shadow rounded-xl overflow-auto">
        <table className="text-sm w-full table-fixed">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="w-6 text-left uppercase text-xs font-semibold py-4 px-3">
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
              <th className="w-46">
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
              <th className="w-46 px-1">
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
                <td colSpan={11} className="text-center">
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
                      <td className="whitespace-nowrap py-5 px-3">
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
                            <>
                              <GeneratePDFButton
                                label="PDF"
                                dicom={data[index]}
                              />
                              <DOCXPreview dicom={data[index]} />
                            </>
                          ) : null}
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
