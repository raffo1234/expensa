"use client";

import { checkPermissions } from "@/lib/checkPermissions";
import { supabase } from "@/lib/supabase";
import { DicomStudyType } from "@/types/dicomStudyType";
import { Icon } from "@iconify/react";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { useDebouncedCallback } from "use-debounce";
import { useRef, useState } from "react";
import useSWR from "swr";
import { Permissions } from "@/types/propertyState";
import NoAccess from "./NoAccess";
import FallbackDicomsPage from "./FallbackDicomsPage";
import DownloadStudyZipButton from "@/components/DownloadStudyZipButton";
import InformButton from "./InformButton";
import { DicomStateEnum } from "@/enums/dicomStateEnum";
import { ICON_SIZE } from "@/constants";
import ViewerButton from "./ViewerButton";

const REQUIRED_PERMISSIONS = [
  Permissions.VIEW_DICOMS,
  Permissions.VIEW_OTHER_DICOMS,
  Permissions.VIEW_NEW_REPORTS,
  Permissions.VIEW_VIEWED_REPORTS,
  Permissions.VIEW_DRAFT_REPORTS,
  Permissions.VIEW_COMPLETED_REPORTS,
];

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

type SortDirection = "asc" | "desc" | null;
type ReceiveStatus = "receiving" | "complete" | "failed" | "";

type HospitalOption = { id: string; name: string; ae_title: string };

// ─── Fetchers ─────────────────────────────────────────────────────────────────

type FetcherKey = [
  string, // key prefix
  number, // page
  number, // pageSize
  string | null, // search
  string | null, // sortColumn
  SortDirection, // sortDirection
  ReceiveStatus, // statusFilter
  string | null, // hospitalId
];

type FetchResult = {
  data: DicomStudyType[] | null;
  total: number;
};

const fetcher = async (key: FetcherKey): Promise<FetchResult> => {
  const [, page, pageSize, search, sortColumn, sortDirection, statusFilter, hospitalId] = key;

  const start = page * pageSize;
  const end = start + pageSize - 1;

  let dataQuery = supabase.from("dicom_study").select("*, hospital(id, name)").range(start, end);

  let countQuery = supabase.from("dicom_study").select("id", { count: "exact", head: true });

  if (search && search.trim().length > 0) {
    const s = search.trim();
    const searchFilter = `patient_id.ilike.%${s}%,patient_name.ilike.%${s}%,study_description.ilike.%${s}%,ae_title_source.ilike.%${s}%`;
    dataQuery = dataQuery.or(searchFilter);
    countQuery = countQuery.or(searchFilter);
  }

  if (statusFilter) {
    dataQuery = dataQuery.eq("receive_status", statusFilter);
    countQuery = countQuery.eq("receive_status", statusFilter);
  }

  if (hospitalId) {
    dataQuery = dataQuery.eq("hospital_id", hospitalId);
    countQuery = countQuery.eq("hospital_id", hospitalId);
  }

  if (sortColumn && sortDirection) {
    dataQuery = dataQuery.order(sortColumn, { ascending: sortDirection === "asc" });
  } else {
    dataQuery = dataQuery.order("received_at", { ascending: false });
  }

  const [dataResult, countResult] = await Promise.all([dataQuery, countQuery]);

  if (dataResult.error) throw dataResult.error;
  if (countResult.error) throw countResult.error;

  return {
    data: dataResult.data as DicomStudyType[],
    total: countResult.count ?? 0,
  };
};

const hospitalsFetcher = async (): Promise<HospitalOption[]> => {
  const { data, error } = await supabase
    .from("hospital")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as HospitalOption[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatStudyDate(raw: string | null): string {
  if (!raw || raw.length !== 8) return "—";
  // YYYYMMDD → DD/MM/YYYY
  return `${raw.slice(6, 8)}/${raw.slice(4, 6)}/${raw.slice(0, 4)}`;
}

function formatReceivedAt(raw: string): string {
  return formatInTimeZone(new Date(raw), "America/Lima", "dd MMM yyyy, hh:mm a", { locale: es });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DicomStudyType["receive_status"] }) {
  const map: Record<string, { label: string; className: string }> = {
    complete: { label: "Complete", className: "bg-cyan-50 text-cyan-700 border border-cyan-200" },
    receiving: {
      label: "Receiving",
      className: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    },
    failed: { label: "Failed", className: "bg-rose-50 text-rose-700 border border-rose-200" },
  };
  const cfg = map[status] ?? map.receiving;
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function ModalityBadge({ modality }: { modality: string | null }) {
  if (!modality) return <span className="text-gray-400">—</span>;
  const colors: Record<string, string> = {
    CT: "bg-blue-50 text-blue-700",
    MR: "bg-purple-50 text-purple-700",
    DX: "bg-green-50 text-green-700",
    US: "bg-amber-50 text-amber-700",
    PT: "bg-orange-50 text-orange-700",
  };
  return (
    <span
      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${colors[modality] ?? "bg-gray-100 text-gray-600"}`}
    >
      {modality}
    </span>
  );
}

function SortableHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
  className = "",
}: {
  label: string;
  column: string;
  sortColumn: string | null;
  sortDirection: SortDirection;
  onSort: (col: string) => void;
  className?: string;
}) {
  const isActive = sortColumn === column;
  return (
    <th className={`px-[1px] ${className}`}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="py-3 w-full text-left px-2 rounded-lg cursor-pointer uppercase text-xs font-semibold hover:bg-cyan-50 bg-slate-50 transition-colors duration-200 whitespace-nowrap"
      >
        {label}
        {isActive && sortDirection && (
          <Icon
            icon={sortDirection === "asc" ? "solar:arrow-up-outline" : "solar:arrow-down-outline"}
            className="inline-block ml-1"
            fontSize={12}
          />
        )}
      </button>
    </th>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StudiesTable({ userRoleId }: { userRoleId: string }) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [statusFilter, setStatusFilter] = useState<ReceiveStatus>("");
  const [hospitalId, setHospitalId] = useState<string | null>(null);

  const { data: permissions, isLoading: isLoadingPermissions } = useSWR(
    `role-permissions-${userRoleId}-${REQUIRED_PERMISSIONS.join(",")}`,
    () => checkPermissions(userRoleId, REQUIRED_PERMISSIONS),
  );

  const { data: hospitals } = useSWR<HospitalOption[]>("hospitals-list", hospitalsFetcher);

  const swrKey: FetcherKey = [
    "dicom_study",
    page,
    PAGE_SIZE,
    search,
    sortColumn,
    sortDirection,
    statusFilter,
    hospitalId,
  ];

  const { data: result, error, isLoading } = useSWR<FetchResult>(swrKey, fetcher);

  const total = result?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasMore = (result?.data?.length ?? 0) === PAGE_SIZE;

  // ── Debounced search ────────────────────────────────────────────────────────
  const debouncedSearch = useDebouncedCallback((value: string) => {
    setPage(0);
    setSearch(value.trim() || null);
  }, 500);

  // ── Sort ────────────────────────────────────────────────────────────────────
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setPage(0);
  };

  // ── Clear ───────────────────────────────────────────────────────────────────
  const handleClear = () => {
    setSearch(null);
    setPage(0);
    setSortColumn(null);
    setSortDirection(null);
    setStatusFilter("");
    setHospitalId(null);
    if (searchInputRef.current) searchInputRef.current.value = "";
  };

  const noData = !isLoading && !error && result?.data?.length === 0;
  const startItemNumber = page * PAGE_SIZE + 1;

  if (isLoadingPermissions) return <FallbackDicomsPage />;
  if (!permissions?.[Permissions.VIEW_DICOMS]) return <NoAccess />;

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search patient, ID, description, AE title..."
            defaultValue={search ?? ""}
            onChange={(e) => debouncedSearch(e.target.value)}
            className="bg-white w-full rounded-full border border-gray-200 outline-0 px-5 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch(null);
                setPage(0);
                if (searchInputRef.current) searchInputRef.current.value = "";
              }}
              className="absolute top-1/2 -translate-y-1/2 right-2 hover:bg-slate-100 transition-colors p-1.5 cursor-pointer rounded-full"
            >
              <Icon
                icon="solar:close-circle-broken"
                fontSize={ICON_SIZE}
                className="text-gray-400"
              />
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as ReceiveStatus);
            setPage(0);
          }}
          className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm outline-0 focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 cursor-pointer"
        >
          <option value="">All statuses</option>
          <option value="complete">Complete</option>
          <option value="receiving">Receiving</option>
          <option value="failed">Failed</option>
        </select>

        {/* Hospital filter */}
        <select
          value={hospitalId ?? ""}
          onChange={(e) => {
            setHospitalId(e.target.value || null);
            setPage(0);
          }}
          className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm outline-0 focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 cursor-pointer"
        >
          <option value="">All hospitals</option>
          {hospitals?.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>

        {/* Clear */}
        <button
          type="button"
          onClick={handleClear}
          title="Clear filters"
          className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Icon icon="solar:refresh-linear" fontSize={ICON_SIZE} />
          Clear
        </button>
      </div>

      {/* ── Pagination bar ── */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500">
          Total: <span className="font-semibold text-gray-800">{total}</span>
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || isLoading}
            className="px-3 py-1 bg-cyan-400 disabled:pointer-events-none text-white rounded-full disabled:opacity-40 cursor-pointer text-sm"
          >
            <Icon icon="solar:arrow-left-linear" fontSize={ICON_SIZE} />
          </button>
          <span className="text-xs font-semibold uppercase">
            {page + 1} / {totalPages || 1}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore || isLoading}
            className="px-3 py-1 bg-cyan-400 disabled:pointer-events-none text-white rounded-full disabled:opacity-40 cursor-pointer text-sm"
          >
            <Icon icon="solar:arrow-right-linear" fontSize={ICON_SIZE} />
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <p className="text-sm px-4 py-2 border border-rose-200 flex items-center gap-3 bg-rose-50 rounded-xl text-rose-700 mb-4">
          <Icon icon="solar:close-circle-broken" fontSize={20} className="flex-shrink-0" />
          Error fetching studies
        </p>
      )}

      {/* ── Table ── */}
      <div className="bg-white shadow rounded-xl overflow-auto">
        <table className="text-sm w-full table-fixed">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="w-8 py-4 text-center text-xs font-semibold text-gray-400">#</th>
              <SortableHeader
                label="Patient ID"
                column="patient_id"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="w-28"
              />
              <SortableHeader
                label="Patient Name"
                column="patient_name"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="w-36"
              />
              <th className="w-10 px-2 uppercase text-xs font-semibold text-left py-4">Sex</th>
              <th className="w-12 px-2 uppercase text-xs font-semibold text-left py-4">Age</th>
              <SortableHeader
                label="Description"
                column="study_description"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="w-40"
              />
              <SortableHeader
                label="Modality"
                column="modality"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="w-20"
              />
              <SortableHeader
                label="Study Date"
                column="study_date"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="w-28"
              />
              <th className="w-28 px-2 uppercase text-xs font-semibold text-left py-4">Hospital</th>
              <th className="w-16 px-2 uppercase text-xs font-semibold text-left py-4">Inst.</th>
              <SortableHeader
                label="Status"
                column="receive_status"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="w-28"
              />
              <SortableHeader
                label="Received At"
                column="received_at"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="w-40"
              />
              <th className="py-4 w-50"></th>
            </tr>
          </thead>

          {/* ── Skeleton ── */}
          {isLoading && (
            <tbody>
              {Array.from({ length: PAGE_SIZE }, (_, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-gray-50" : ""}>
                  {Array.from({ length: 13 }, (__, j) => (
                    <td key={j} className="py-4 px-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}

          {/* ── No data ── */}
          {noData && (
            <tbody>
              <tr>
                <td colSpan={13} className="text-center py-20 text-gray-400">
                  <Icon icon="solar:inbox-linear" fontSize={48} className="mx-auto mb-3" />
                  <p className="text-sm">No studies found</p>
                  {search && (
                    <p className="text-xs mt-1">
                      No results for{" "}
                      <span className="font-semibold text-gray-600">&quot;{search}&quot;</span>
                    </p>
                  )}
                </td>
              </tr>
            </tbody>
          )}

          {/* ── Rows ── */}
          {!isLoading && !noData && (
            <tbody className="whitespace-nowrap">
              {result?.data?.map((study, index) => (
                <tr
                  key={study.id}
                  className={`border-t border-gray-100
                    ${study.state === DicomStateEnum.VIEWED ? "bg-yellow-100" : ""}
                    ${study.state === DicomStateEnum.DRAFT ? "bg-orange-100" : ""}
                    ${study.state === DicomStateEnum.COMPLETED ? "bg-cyan-100" : ""}
                    ${!study.state && index % 2 === 0 ? "bg-gray-50/50" : ""}
                    ${!study.state && index % 2 !== 0 ? "bg-white" : ""}
                  `}
                >
                  {/* # */}
                  <td className="py-4 text-center text-xs text-gray-400">
                    {startItemNumber + index}
                  </td>

                  {/* Patient ID */}
                  <td className="py-4 px-2 truncate font-mono text-xs text-gray-700">
                    {study.patient_id ?? "—"}
                  </td>

                  {/* Patient Name */}
                  <td className="py-4 px-2 truncate" title={study.patient_name ?? ""}>
                    {study.patient_name ?? "—"}
                  </td>

                  {/* Sex */}
                  <td className="py-4 px-2 text-center text-gray-600">
                    {study.patient_sex ?? "—"}
                  </td>

                  {/* Age */}
                  <td className="py-4 px-2 text-gray-600">{study.patient_age ?? "—"}</td>

                  {/* Study Description */}
                  <td
                    className="py-4 px-2 truncate text-gray-600"
                    title={study.study_description ?? ""}
                  >
                    {study.study_description ?? "—"}
                  </td>

                  {/* Modality */}
                  <td className="py-4 px-2 text-center">
                    <ModalityBadge modality={study.modality} />
                  </td>

                  {/* Study Date */}
                  <td className="py-4 px-2 text-gray-600">{formatStudyDate(study.study_date)}</td>

                  {/* Hospital */}
                  <td className="py-4 px-2 truncate text-gray-600" title={study.hospital?.name}>
                    {study.hospital?.name ?? "—"}
                  </td>

                  {/* Instances */}
                  <td className="py-4 px-2 text-center text-gray-700 font-semibold">
                    {study.received_instances}
                    {study.total_instances > 0 && (
                      <span className="text-gray-400 font-normal">/{study.total_instances}</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-4 px-2">
                    <StatusBadge status={study.receive_status} />
                  </td>

                  {/* Received At */}
                  <td
                    className="py-4 px-2 text-xs text-gray-500 truncate"
                    title={formatReceivedAt(study.received_at)}
                  >
                    {formatReceivedAt(study.received_at)}
                  </td>

                  {/* OHIF Viewer */}
                  <td className="py-4 px-2 text-center">
                    {study.receive_status === "complete" ? (
                      <div className="flex items-center gap-1.5 justify-center">
                        <ViewerButton id={study.id} />
                        <DownloadStudyZipButton study={study} />
                        <InformButton
                          href={`/admin/studies/${study.id}`}
                          dicomId={study.id}
                          dicomState=""
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>

      {/* ── Bottom pagination ── */}
      {!noData && (
        <div className="flex justify-end items-center gap-2 mt-3">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || isLoading}
            className="px-3 py-1 bg-cyan-400 disabled:pointer-events-none text-white rounded-full disabled:opacity-40 cursor-pointer text-sm"
          >
            <Icon icon="solar:arrow-left-linear" fontSize={ICON_SIZE} />
          </button>
          <span className="text-xs font-semibold uppercase">
            {page + 1} / {totalPages || 1}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore || isLoading}
            className="px-3 py-1 bg-cyan-400 disabled:pointer-events-none text-white rounded-full disabled:opacity-40 cursor-pointer text-sm"
          >
            <Icon icon="solar:arrow-right-linear" fontSize={ICON_SIZE} />
          </button>
        </div>
      )}
    </>
  );
}
