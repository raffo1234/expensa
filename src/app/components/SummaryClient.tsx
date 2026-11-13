"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import useSWR, { preload } from "swr";
import {
  getSummaryTotals,
  listAllSummaryExpenses,
  listSummaryExpenses,
} from "@/actions/summaryQueries";
import { getCategories, getLevels, getProviders, getStages } from "@/actions/lookups";
import { categoryIdList } from "@/types/expenseFilters";
import CategoryMultiFilter from "./CategoryMultiFilter";
import ProviderFilter from "./ProviderFilter";
import { useDebouncedCallback } from "use-debounce";
import { Icon } from "@iconify/react/dist/iconify.js";
import {
  INPUT_CLASS,
  SELECT_CLASS,
  HEADER_LINK_CLASS,
  HEADER_LINK_ICON,
  HEADER_LINK_LABEL,
  ICON_SIZE,
  PRIMARY_BUTTON_CLASS,
} from "@/constants";
import { csvEscape } from "@/utils/csv";
import { formatAmount, formatTotals, totalsByCurrency } from "@/utils/formatAmount";
import getAttachmentUrl from "@/lib/getAttachmentUrl";
import { useSearchParams, usePathname } from "next/navigation";
import { replaceUrl } from "@/utils/replaceUrl";
import OptionButton from "./OptionButton";
import Field from "./Field";
import PageNavigator from "./PageNavigator";
import ClearFiltersButton from "./ClearFiltersButton";
import { usePageSize } from "@/hooks/usePageSize";
import ListPage from "./ListPage";
import { pageFromParam } from "@/lib/pageParam";
import { summaryColumns } from "@/lib/tableColumns";
import FiltersButton from "./FiltersButton";
import FormSection from "./FormSection";
import SearchInput from "./SearchInput";
import DataTable, { DataTableRow, ROW_CONTROL, RowLink, Td } from "./DataTable";
import CategoryBadge from "./CategoryBadge";
import type { SummaryReportRow } from "./SummaryReportPDF";

type SummaryTab = "facturas" | "gastos"; // same values as summaryQueries

const SUMMARY_TABS: { value: SummaryTab; label: string }[] = [
  { value: "facturas", label: "Facturas" },
  { value: "gastos", label: "Gastos" },
];

// Columns come from lib/tableColumns (shared with the loading skeleton).

type Workspace = { id: string; name: string; slug: string };
type Attachment = { id: string; file_name: string | null; storage_path: string };
type SummaryExpense = {
  id: string;
  invoice_series?: string | null;
  invoice_number?: string | null;
  amount: number;
  currency: string;
  issued_at?: string | null;
  paid_at?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  provider?:
    | { id: string; name: string; ruc?: string | null }
    | { id: string; name: string; ruc?: string | null }[]
    | null;
  category?:
    | { id: string; name: string; color?: string | null }
    | { id: string; name: string; color?: string | null }[]
    | null;
  expense_attachment?: Attachment[];
};

/** Filters shared with the expenses page, beyond search, invoice reference and dates. */
type ExtraFilters = {
  providerId: string;
  stageId: string;
  levelId: string;
  amountMin: string;
  amountMax: string;
  /** "1": invoices still missing a required document (invoices tab only). */
  pendingDocs: string;
};

const EMPTY_EXTRA: ExtraFilters = {
  providerId: "",
  stageId: "",
  levelId: "",
  amountMin: "",
  amountMax: "",
  pendingDocs: "",
};

const fetcher = async (
  key: [
    string,
    string,
    number,
    string,
    string,
    string,
    SummaryTab,
    string,
    string,
    string,
    number,
    ExtraFilters,
  ],
) => {
  const [
    ,
    workspaceId,
    page,
    search,
    dateFrom,
    dateTo,
    tab,
    categoryId,
    invoiceSeries,
    invoiceNumber,
    pageSize,
    extra,
  ] = key;
  const { data, count } = await listSummaryExpenses(
    {
      workspaceId,
      search,
      dateFrom,
      dateTo,
      tab,
      categoryId,
      invoiceSeries,
      invoiceNumber,
      ...extra,
    },
    page,
    pageSize,
  );
  return { data: data as SummaryExpense[], count };
};

const fmtDate = (d?: string | null) => {
  if (!d) return "";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}-${m}-${y}`;
};

const fetchAllFiltered = async (
  workspaceId: string,
  search: string,
  dateFrom: string,
  dateTo: string,
  tab: SummaryTab,
  categoryId: string,
  invoiceSeries: string,
  invoiceNumber: string,
  extra: ExtraFilters,
): Promise<SummaryExpense[]> =>
  (await listAllSummaryExpenses({
    workspaceId,
    search,
    dateFrom,
    dateTo,
    tab,
    categoryId,
    invoiceSeries,
    invoiceNumber,
    ...extra,
  })) as SummaryExpense[];

const prov = (e: SummaryExpense) => (Array.isArray(e.provider) ? e.provider[0] : e.provider);
const cat = (e: SummaryExpense) => (Array.isArray(e.category) ? e.category[0] : e.category);

const exportCsv = async (
  workspaceId: string,
  search: string,
  dateFrom: string,
  dateTo: string,
  tab: SummaryTab,
  categoryId: string,
  invoiceSeries: string,
  invoiceNumber: string,
  extra: ExtraFilters,
) => {
  const all = await fetchAllFiltered(
    workspaceId,
    search,
    dateFrom,
    dateTo,
    tab,
    categoryId,
    invoiceSeries,
    invoiceNumber,
    extra,
  );

  let csv = "﻿";
  csv += "Mes,Fecha,Serie,Numero,Proveedor,RUC,Categoria,Metodo Pago,Monto,Moneda,Notas\n";

  const byMonth: Record<string, SummaryExpense[]> = {};
  for (const e of all) {
    const month = e.paid_at ? e.paid_at.slice(0, 7) : "sin-fecha";
    (byMonth[month] ??= []).push(e);
  }

  for (const month of Object.keys(byMonth).sort()) {
    const expenses = byMonth[month];
    for (const e of expenses) {
      const p = prov(e);
      const c = cat(e);
      csv +=
        [
          csvEscape(month),
          csvEscape(fmtDate(e.paid_at)),
          csvEscape(e.invoice_series),
          csvEscape(e.invoice_number),
          csvEscape(p?.name),
          csvEscape(p?.ruc),
          csvEscape(c?.name),
          csvEscape(e.payment_method),
          csvEscape((e.amount / 100).toFixed(2)),
          csvEscape(e.currency),
          csvEscape(e.notes),
        ].join(",") + "\n";
    }
    // One total row per currency: soles and dollars are never added together.
    for (const t of totalsByCurrency(expenses)) {
      csv += `${csvEscape(month)},,,,,,,,${(t.amount / 100).toFixed(2)},${t.currency},TOTAL ${month}\n`;
    }
    csv += "\n";
  }

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gastos-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportPdf = async (
  workspaceId: string,
  workspaceName: string,
  search: string,
  dateFrom: string,
  dateTo: string,
  tab: SummaryTab,
  categoryId: string,
  categoryName: string,
  invoiceSeries: string,
  invoiceNumber: string,
  extra: ExtraFilters,
  /** Readable labels of the extra filters, for the report header. */
  extraLabels: string[],
) => {
  const all = await fetchAllFiltered(
    workspaceId,
    search,
    dateFrom,
    dateTo,
    tab,
    categoryId,
    invoiceSeries,
    invoiceNumber,
    extra,
  );

  const filters = [
    `Tipo: ${tab === "facturas" ? "Facturas" : "Gastos"}`,
    categoryId ? `Categoría: ${categoryName}` : null,
    dateFrom || dateTo ? `Emisión: ${dateFrom || "…"} a ${dateTo || "…"}` : null,
    invoiceSeries ? `Serie: ${invoiceSeries}` : null,
    invoiceNumber ? `Número: ${invoiceNumber}` : null,
    search ? `Búsqueda: "${search}"` : null,
    ...extraLabels,
  ]
    .filter(Boolean)
    .join("  •  ");

  const rows: SummaryReportRow[] = all.map((e) => {
    const p = prov(e);
    const c = cat(e);
    return {
      id: e.id,
      paid_at: e.paid_at,
      provider_name: p?.name,
      category_name: c?.name,
      payment_method: e.payment_method,
      amount: e.amount,
      currency: e.currency,
    };
  });

  const [{ pdf }, { default: SummaryReportPDF }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./SummaryReportPDF"),
  ]);
  const blob = await pdf(
    <SummaryReportPDF workspaceName={workspaceName} filtersLabel={filters} rows={rows} />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reporte-gastos-${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};

const formatDate = (val?: string | null) =>
  val
    ? new Date(val).toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

type CategoryOption = { id: string; name: string; color: string | null };

const fetchCategories = (workspaceId: string): Promise<CategoryOption[]> =>
  getCategories(workspaceId);

const STORAGE_TAB = "summary-tab";
const STORAGE_WS = "summary-workspace";

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export default function SummaryClient({ workspaces }: { workspaces: Workspace[] }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [tab, setTabLocal] = useState<SummaryTab>(() => {
    const fromUrl = searchParams.get("tab");
    if (fromUrl === "gastos" || fromUrl === "facturas") return fromUrl;
    return readStorage(STORAGE_TAB) === "gastos" ? "gastos" : "facturas";
  });

  // A shared link may point to a project this user can't access. Say so
  // instead of silently showing another project with filters that don't
  // belong to it (which would just look like an empty result).
  const [linkDenied, setLinkDenied] = useState(() => {
    const fromUrl = searchParams.get("ws");
    return !!fromUrl && !workspaces.some((w) => w.id === fromUrl);
  });

  const [workspaceId, setWorkspaceId] = useState(() => {
    const fromUrl = searchParams.get("ws");
    if (fromUrl && workspaces.some((w) => w.id === fromUrl)) return fromUrl;
    const stored = readStorage(STORAGE_WS);
    if (stored && workspaces.some((w) => w.id === stored)) return stored;
    return workspaces[0]?.id ?? "";
  });

  const [page, setPage] = useState(
    // Kept 0-based inside; the URL shows the page as seen on screen (?page=3).
    () => pageFromParam(searchParams.get("page")) - 1,
  );
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [dateFrom, setDateFrom] = useState(() => searchParams.get("from") ?? "");
  const [dateTo, setDateTo] = useState(() => searchParams.get("to") ?? "");
  const [month, setMonth] = useState(() => searchParams.get("month") ?? "");
  const [categoryId, setCategoryId] = useState(() => searchParams.get("cat") ?? "");
  const [invoiceSeries, setInvoiceSeries] = useState(() => searchParams.get("series") ?? "");
  const [invoiceNumber, setInvoiceNumber] = useState(() => searchParams.get("number") ?? "");
  const [extra, setExtra] = useState<ExtraFilters>(() => ({
    providerId: searchParams.get("providerId") ?? "",
    stageId: searchParams.get("stageId") ?? "",
    levelId: searchParams.get("levelId") ?? "",
    amountMin: searchParams.get("amountMin") ?? "",
    amountMax: searchParams.get("amountMax") ?? "",
    pendingDocs: searchParams.get("pendingDocs") === "1" ? "1" : "",
  }));
  const setExtraFilter = (key: keyof ExtraFilters, value: string) => {
    setExtra((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  };
  // "Documentos pendientes" only means something for invoices.
  const queryExtra: ExtraFilters = tab === "facturas" ? extra : { ...extra, pendingDocs: "" };
  const [searchText, setSearchText] = useState(search);
  const [showFilters, setShowFilters] = useState(() =>
    ["cat", "month", "from", "to", ...Object.keys(EMPTY_EXTRA)].some((k) => searchParams.get(k)),
  );

  const { data: categories = [] } = useSWR(
    workspaceId ? ["summary-categories", workspaceId] : null,
    ([, wid]) => fetchCategories(wid),
  );
  // Options for the same filters as the expenses page.
  const { data: providers = [] } = useSWR(
    workspaceId ? ["summary-providers", workspaceId] : null,
    ([, wid]) => getProviders(wid),
  );
  const { data: stages = [] } = useSWR(
    workspaceId ? ["summary-stages", workspaceId] : null,
    ([, wid]) => getStages(wid),
  );
  const { data: levels = [] } = useSWR(
    workspaceId ? ["summary-levels", workspaceId] : null,
    ([, wid]) => getLevels(wid),
  );

  const hasFilters =
    !!search ||
    !!dateFrom ||
    !!dateTo ||
    !!month ||
    !!categoryId ||
    !!invoiceSeries ||
    !!invoiceNumber ||
    Object.values(queryExtra).some(Boolean);

  const syncUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (tab !== "facturas") params.set("tab", tab);
    if (workspaceId) params.set("ws", workspaceId);
    if (search) params.set("q", search);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    if (month) params.set("month", month);
    if (categoryId) params.set("cat", categoryId);
    if (invoiceSeries) params.set("series", invoiceSeries);
    if (invoiceNumber) params.set("number", invoiceNumber);
    for (const [k, v] of Object.entries(extra)) if (v) params.set(k, v);
    if (page > 0) params.set("page", String(page + 1));
    const qs = params.toString();
    replaceUrl(qs ? `${pathname}?${qs}` : pathname);
  }, [
    tab,
    workspaceId,
    search,
    dateFrom,
    dateTo,
    month,
    categoryId,
    invoiceSeries,
    invoiceNumber,
    extra,
    page,
    pathname,
  ]);

  useEffect(() => {
    const t = setTimeout(syncUrl, 300);
    return () => clearTimeout(t);
  }, [syncUrl]);

  const setTab = (t: SummaryTab) => {
    localStorage.setItem(STORAGE_TAB, t);
    setTabLocal(t);
    setPage(0);
  };

  const handleWorkspaceChange = (id: string) => {
    localStorage.setItem(STORAGE_WS, id);
    setWorkspaceId(id);
    setPage(0);
  };

  const handleMonthChange = (value: string) => {
    setMonth(value);
    if (value) {
      const [y, m] = value.split("-").map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      setDateFrom(`${value}-01`);
      setDateTo(`${value}-${String(lastDay).padStart(2, "0")}`);
    } else {
      setDateFrom("");
      setDateTo("");
    }
    setPage(0);
  };

  const clearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setMonth("");
    setCategoryId("");
    setInvoiceSeries("");
    setInvoiceNumber("");
    setExtra(EMPTY_EXTRA);
    setPage(0);
    setSearchText("");
    debouncedSearch.cancel();
  };

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, 350);

  const handleSearchChange = (value: string) => {
    setSearchText(value);
    if (value) {
      debouncedSearch(value);
    } else {
      // Clearing applies right away instead of waiting for the debounce.
      debouncedSearch.cancel();
      setSearch("");
      setPage(0);
    }
  };

  const [pageSize, setPageSizePref] = usePageSize();
  const setPageSize = (size: number) => {
    setPageSizePref(size);
    setPage(0);
  };

  const swrKey = [
    "summary",
    workspaceId,
    page,
    search,
    dateFrom,
    dateTo,
    tab,
    categoryId,
    invoiceSeries,
    invoiceNumber,
    pageSize,
    queryExtra,
  ] as const;

  const { data, isLoading, error, mutate } = useSWR(
    workspaceId && !linkDenied ? swrKey : null,
    fetcher,
    // Keep the current rows while the next page/filter loads, so the table never
    // swaps to a skeleton and back.
    { keepPreviousData: true },
  );

  // Totals for the current filters (all pages), with their own cache entry so
  // paging doesn't recompute them, as on the expenses page.
  const { data: totals = [] } = useSWR(
    workspaceId && !linkDenied
      ? [
          "summary-totals",
          workspaceId,
          search,
          dateFrom,
          dateTo,
          tab,
          categoryId,
          invoiceSeries,
          invoiceNumber,
          queryExtra,
        ]
      : null,
    () =>
      getSummaryTotals({
        workspaceId,
        search,
        dateFrom,
        dateTo,
        tab,
        categoryId,
        invoiceSeries,
        invoiceNumber,
        ...queryExtra,
      }),
    { keepPreviousData: true, revalidateOnFocus: false },
  );
  // Largest-impact currency first; soles lead when present.
  const primaryTotals = [...totals]
    .filter((t) => t.amount !== 0)
    .sort((a, b) => (a.currency === "PEN" ? -1 : b.currency === "PEN" ? 1 : b.amount - a.amount));

  const expenses = data?.data ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  // A page past the end (old link, or fewer rows now) goes to the last one.
  useEffect(() => {
    if (data && !isLoading && page + 1 > totalPages) setPage(totalPages - 1);
  }, [data, isLoading, page, totalPages]);

  // Fetch the next page in the background once this one is shown, so "›" is instant.
  useEffect(() => {
    if (!workspaceId || !data || isLoading || page + 1 >= totalPages) return;
    const next = [...swrKey] as unknown as Parameters<typeof fetcher>[0];
    next[2] = page + 1;
    preload(next, fetcher);
    // swrKey is rebuilt each render from these same values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isLoading, page, totalPages, workspaceId]);

  // Filters inside the panel (search and invoice reference are always visible).
  const advancedFilterCount = [
    queryExtra.providerId,
    categoryId,
    queryExtra.stageId,
    queryExtra.levelId,
    dateFrom || dateTo,
    queryExtra.amountMin || queryExtra.amountMax,
    queryExtra.pendingDocs,
  ].filter(Boolean).length;

  // Readable labels of the extra filters, for the PDF header.
  const nameOf = (list: { id: string; name: string }[], id: string) =>
    list.find((x) => x.id === id)?.name ?? "";
  const extraLabels = [
    queryExtra.providerId ? `Proveedor: ${nameOf(providers, queryExtra.providerId)}` : null,
    queryExtra.stageId ? `Etapa: ${nameOf(stages, queryExtra.stageId)}` : null,
    queryExtra.levelId ? `Nivel: ${nameOf(levels, queryExtra.levelId)}` : null,
    queryExtra.amountMin || queryExtra.amountMax
      ? `Monto: ${queryExtra.amountMin || "…"} a ${queryExtra.amountMax || "…"}`
      : null,
    queryExtra.pendingDocs ? "Con documentos pendientes" : null,
  ].filter((x): x is string => !!x);

  // Secondary actions live in the section header, like Fly.io's section links.
  const headerLinks = (
    <>
      <button
        type="button"
        onClick={() =>
          exportCsv(
            workspaceId,
            search,
            dateFrom,
            dateTo,
            tab,
            categoryId,
            invoiceSeries,
            invoiceNumber,
            queryExtra,
          )
        }
        disabled={!workspaceId}
        className={HEADER_LINK_CLASS}
      >
        <Icon icon="solar:file-download-linear" className={HEADER_LINK_ICON} aria-hidden />
        <span className={HEADER_LINK_LABEL}>Exportar CSV</span>
      </button>
      <button
        type="button"
        onClick={() =>
          exportPdf(
            workspaceId,
            workspaces.find((w) => w.id === workspaceId)?.name ?? "",
            search,
            dateFrom,
            dateTo,
            tab,
            categoryId,
            categoryIdList(categoryId)
              .map((id) => nameOf(categories, id))
              .filter(Boolean)
              .join(", "),
            invoiceSeries,
            invoiceNumber,
            queryExtra,
            extraLabels,
          )
        }
        disabled={!workspaceId}
        className={HEADER_LINK_CLASS}
      >
        <Icon icon="solar:download-minimalistic-linear" className={HEADER_LINK_ICON} aria-hidden />
        <span className={HEADER_LINK_LABEL}>Descargar PDF</span>
      </button>
    </>
  );

  // Always shown (disabled on a single page) so the table never jumps when
  // filters change the number of pages.
  const pager = (
    <PageNavigator
      page={page + 1}
      // Last known total while the next page loads; null ("–") before the first load.
      totalPages={data ? totalPages : null}
      onPrev={() => setPage((p) => Math.max(0, p - 1))}
      onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      // Also while the search text waits for its debounce.
      loading={isLoading || searchText !== search}
    />
  );

  if (linkDenied) {
    return (
      <FormSection title="Resumen de gastos">
        <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 py-10 text-center">
          <h2 className="mb-2 text-title font-book text-navy-900">
            No tienes acceso al proyecto de este link
          </h2>
          <p className="mb-8 max-w-md text-sm text-navy-500">
            El link es de un proyecto al que no estás asignado. Pide acceso a un administrador, o
            abre el resumen de tus propios proyectos.
          </p>
          {workspaces.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                // Start clean on the user's own first project: the link's filters
                // (provider, level...) belong to the other project.
                clearFilters();
                handleWorkspaceChange(workspaces[0].id);
                setLinkDenied(false);
              }}
              className={`${PRIMARY_BUTTON_CLASS} min-h-11 justify-center sm:min-h-0`}
            >
              Ver el resumen de mis proyectos
            </button>
          ) : (
            <Link href="/" className={`${PRIMARY_BUTTON_CLASS} min-h-11 justify-center sm:min-h-0`}>
              Ir al inicio
            </Link>
          )}
        </div>
      </FormSection>
    );
  }

  return (
    <FormSection title="Resumen de gastos" actions={headerLinks}>
      <ListPage
        pager={pager}
        controls={
          <>
            {/* 1 · How much, for what is filtered; and which project (exports are in the header). */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {hasFilters
                    ? "Total con los filtros aplicados"
                    : tab === "facturas"
                      ? "Total en facturas"
                      : "Total en gastos sin factura"}
                </p>
                <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 tabular-nums">
                  {primaryTotals.length === 0 ? (
                    <span className="text-3xl font-semibold tracking-tight text-gray-900">
                      {formatTotals([])}
                    </span>
                  ) : (
                    primaryTotals.map((t, i) => (
                      <span
                        key={t.currency}
                        className={
                          i === 0
                            ? "text-3xl font-semibold tracking-tight text-gray-900"
                            : "text-lg font-medium text-gray-700"
                        }
                      >
                        {formatTotals([t])}
                      </span>
                    ))
                  )}
                </p>
                <p className="mt-1 text-sm text-gray-600 tabular-nums">
                  {total} {total === 1 ? "registro" : "registros"}
                </p>
              </div>

              <div className="w-full sm:max-w-xs">
                <Field label="Proyecto">
                  <select
                    value={workspaceId}
                    onChange={(e) => handleWorkspaceChange(e.target.value)}
                    className={SELECT_CLASS}
                  >
                    {workspaces.map((ws) => (
                      <option key={ws.id} value={ws.id}>
                        {ws.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            {/* 2 · What you're looking at. */}
            <div className="flex gap-2">
              {SUMMARY_TABS.map(({ value, label }) => (
                <OptionButton key={value} isActive={tab === value} onClick={() => setTab(value)}>
                  {label}
                </OptionButton>
              ))}
            </div>

            {/* 3 · Finding a record: search (+ invoice reference on the invoices tab). */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                <SearchInput
                  value={searchText}
                  onChange={handleSearchChange}
                  placeholder={
                    tab === "facturas"
                      ? "Buscar por factura, proveedor o notas…"
                      : "Buscar por proveedor o notas…"
                  }
                  className="col-span-2 sm:flex-1"
                />

                <input
                  type="text"
                  aria-label="Serie de factura"
                  placeholder="Serie"
                  value={invoiceSeries}
                  onChange={(e) => {
                    setInvoiceSeries(e.target.value);
                    setPage(0);
                  }}
                  className={`${INPUT_CLASS} sm:w-28`}
                />
                <input
                  type="text"
                  aria-label="Número de factura"
                  placeholder="Número"
                  value={invoiceNumber}
                  onChange={(e) => {
                    setInvoiceNumber(e.target.value);
                    setPage(0);
                  }}
                  className={`${INPUT_CLASS} sm:w-36`}
                />

                <div className="col-span-2 flex items-center gap-2 sm:contents">
                  <FiltersButton
                    open={showFilters}
                    count={advancedFilterCount}
                    controls="summary-filters"
                    onClick={() => setShowFilters((v) => !v)}
                  />
                  <ClearFiltersButton onClick={clearFilters} disabled={!hasFilters} />
                </div>
              </div>

              {/* 4 · The rest, only when asked for: one panel, visible labels. */}
              {showFilters && (
                <div
                  id="summary-filters"
                  className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50/70 p-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                  {/* Same filters and order as the expenses page. */}
                  <Field label="Proveedor">
                    <ProviderFilter
                      providers={providers}
                      value={extra.providerId}
                      onChange={(id) => setExtraFilter("providerId", id)}
                    />
                  </Field>
                  <Field label="Categoría">
                    <CategoryMultiFilter
                      categories={categories}
                      value={categoryIdList(categoryId)}
                      onChange={(ids) => {
                        setCategoryId(ids.join(","));
                        setPage(0);
                      }}
                    />
                  </Field>
                  <Field label="Etapa">
                    <select
                      value={extra.stageId}
                      onChange={(e) => setExtraFilter("stageId", e.target.value)}
                      className={SELECT_CLASS}
                    >
                      <option value="">Todas</option>
                      {stages.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Nivel">
                    <select
                      value={extra.levelId}
                      onChange={(e) => setExtraFilter("levelId", e.target.value)}
                      className={SELECT_CLASS}
                    >
                      <option value="">Todos</option>
                      {levels.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Mes de emisión">
                    <input
                      type="month"
                      value={month}
                      onChange={(e) => handleMonthChange(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </Field>
                  <Field label="Emitida desde">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        setMonth("");
                        setPage(0);
                      }}
                      className={INPUT_CLASS}
                    />
                  </Field>
                  <Field label="Emitida hasta">
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setMonth("");
                        setPage(0);
                      }}
                      className={INPUT_CLASS}
                    />
                  </Field>
                  <Field label="Monto (mín. – máx.)">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        placeholder="Mín."
                        aria-label="Monto mínimo"
                        value={extra.amountMin}
                        onChange={(e) => setExtraFilter("amountMin", e.target.value)}
                        className={INPUT_CLASS}
                      />
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        placeholder="Máx."
                        aria-label="Monto máximo"
                        value={extra.amountMax}
                        onChange={(e) => setExtraFilter("amountMax", e.target.value)}
                        className={INPUT_CLASS}
                      />
                    </div>
                  </Field>
                  {/* Only invoices carry required documents. */}
                  {tab === "facturas" && (
                    <Field label="Documentos">
                      <select
                        value={extra.pendingDocs}
                        onChange={(e) => setExtraFilter("pendingDocs", e.target.value)}
                        className={SELECT_CLASS}
                      >
                        <option value="">Todos</option>
                        <option value="1">Con documentos pendientes</option>
                      </select>
                    </Field>
                  )}
                </div>
              )}
            </div>
          </>
        }
      >
        {/* A failed request must not look like "no results". */}
        {error && (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>
              No se pudo cargar el resumen. {error instanceof Error ? error.message : String(error)}
            </span>
            <button
              type="button"
              onClick={() => mutate()}
              className="cursor-pointer font-medium underline underline-offset-2"
            >
              Reintentar
            </button>
          </div>
        )}
        <DataTable
          columns={summaryColumns(tab)}
          numbered
          isLoading={isLoading && !data}
          busy={isLoading || searchText !== search}
          isEmpty={expenses.length === 0}
          emptyMessage={
            tab === "facturas"
              ? "No hay facturas con estos filtros. Revisa también la pestaña «Gastos» (pagos sin factura)."
              : "No hay gastos sin factura con estos filtros. Revisa también la pestaña «Facturas»."
          }
        >
          {expenses.map((expense, index) => {
            const prov = Array.isArray(expense.provider) ? expense.provider[0] : expense.provider;
            const cat = Array.isArray(expense.category) ? expense.category[0] : expense.category;

            const href = `/admin/summary/${expense.id}`;

            return (
              <DataTableRow
                key={expense.id}
                href={href}
                newTab
                number={page * pageSize + index + 1}
              >
                {tab === "facturas" ? (
                  <Td className="font-mono">
                    <RowLink href={href} newTab>
                      {expense.invoice_series && expense.invoice_number
                        ? `${expense.invoice_series}-${expense.invoice_number}`
                        : "—"}
                    </RowLink>
                  </Td>
                ) : (
                  <Td>
                    <RowLink href={href} newTab className="block max-w-xs truncate">
                      <span title={expense.notes ?? undefined}>{expense.notes?.trim() || "—"}</span>
                    </RowLink>
                  </Td>
                )}
                <Td>
                  <span
                    className="block max-w-56 truncate"
                    title={prov?.ruc ? `RUC ${prov.ruc}` : undefined}
                  >
                    {prov?.name ?? "—"}
                  </span>
                </Td>
                <Td>
                  <CategoryBadge category={cat?.name} color={cat?.color} />
                </Td>
                <Td>{expense.payment_method ?? "—"}</Td>
                <Td>{formatDate(expense.issued_at)}</Td>
                <Td align="right" className="font-book text-navy-900 tabular-nums">
                  {expense.amount != null ? formatAmount(expense.amount, expense.currency) : "—"}
                </Td>
                <Td>
                  <div className="flex gap-2">
                    {expense.expense_attachment?.map((att) => (
                      <a
                        key={att.id}
                        href={getAttachmentUrl(att.storage_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={att.file_name ?? "Adjunto"}
                        aria-label={`Abrir adjunto ${att.file_name ?? ""}`.trim()}
                        className={`${ROW_CONTROL} inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 text-sm text-violet-700 transition-colors hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500`}
                      >
                        <Icon
                          icon={
                            /\.pdf$/i.test(att.file_name ?? "")
                              ? "hugeicons:pdf-02"
                              : "solar:gallery-minimalistic-linear"
                          }
                          fontSize={ICON_SIZE}
                          aria-hidden
                        />
                        <span className="max-w-36 truncate">{att.file_name ?? "archivo"}</span>
                      </a>
                    ))}
                  </div>
                </Td>
              </DataTableRow>
            );
          })}
        </DataTable>
      </ListPage>
    </FormSection>
  );
}
