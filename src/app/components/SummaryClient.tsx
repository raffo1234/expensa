"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR, { preload } from "swr";
import { listAllSummaryExpenses, listSummaryExpenses } from "@/actions/summaryQueries";
import { getCategories } from "@/actions/lookups";
import { useDebouncedCallback } from "use-debounce";
import { Icon } from "@iconify/react/dist/iconify.js";
import {
  INPUT_CLASS,
  SELECT_CLASS,
  HEADER_LINK_CLASS,
  HEADER_LINK_ICON,
  HEADER_LINK_LABEL,
  ICON_SIZE,
} from "@/constants";
import { csvEscape } from "@/utils/csv";
import { formatAmount, totalsByCurrency } from "@/utils/formatAmount";
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
import CategoryFilter from "./CategoryFilter";
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

const fetcher = async (
  key: [string, string, number, string, string, string, SummaryTab, string, string, string, number],
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
  ] = key;
  const { data, count } = await listSummaryExpenses(
    { workspaceId, search, dateFrom, dateTo, tab, categoryId, invoiceSeries, invoiceNumber },
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
  );

  const filters = [
    `Tipo: ${tab === "facturas" ? "Facturas" : "Gastos"}`,
    categoryId ? `Categoría: ${categoryName}` : null,
    dateFrom || dateTo ? `Emisión: ${dateFrom || "…"} a ${dateTo || "…"}` : null,
    invoiceSeries ? `Serie: ${invoiceSeries}` : null,
    invoiceNumber ? `Número: ${invoiceNumber}` : null,
    search ? `Búsqueda: "${search}"` : null,
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
  const [searchText, setSearchText] = useState(search);
  const [showFilters, setShowFilters] = useState(
    () =>
      !!(
        searchParams.get("cat") ||
        searchParams.get("month") ||
        searchParams.get("from") ||
        searchParams.get("to")
      ),
  );

  const { data: categories = [] } = useSWR(
    workspaceId ? ["summary-categories", workspaceId] : null,
    ([, wid]) => fetchCategories(wid),
  );

  const hasFilters =
    !!search ||
    !!dateFrom ||
    !!dateTo ||
    !!month ||
    !!categoryId ||
    !!invoiceSeries ||
    !!invoiceNumber;

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
  ] as const;

  const { data, isLoading } = useSWR(
    workspaceId ? swrKey : null,
    fetcher,
    // Keep the current rows while the next page/filter loads, so the table never
    // swaps to a skeleton and back.
    { keepPreviousData: true },
  );

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
  const advancedFilterCount = [categoryId, dateFrom || dateTo].filter(Boolean).length;

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
            categories.find((c) => c.id === categoryId)?.name ?? "",
            invoiceSeries,
            invoiceNumber,
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
      totalPages={totalPages}
      onPrev={() => setPage((p) => Math.max(0, p - 1))}
      onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      // Also while the search text waits for its debounce.
      loading={isLoading || searchText !== search}
    />
  );

  return (
    <FormSection title="Resumen de gastos" actions={headerLinks}>
      <ListPage
        pager={pager}
        controls={
          <>
            {/* 1 · Context: which project (exports live in the section header). */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
                <p className="mt-2 text-sm text-gray-600 tabular-nums">
                  {total} {total === 1 ? "registro" : "registros"}
                </p>
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
                  <Field label="Categoría">
                    <CategoryFilter
                      categories={categories}
                      value={categoryId}
                      onChange={(id) => {
                        setCategoryId(id);
                        setPage(0);
                      }}
                    />
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
                </div>
              )}
            </div>
          </>
        }
      >
        <DataTable
          columns={summaryColumns(tab)}
          numbered
          isLoading={isLoading && !data}
          isEmpty={expenses.length === 0}
          emptyMessage="No hay gastos con estos filtros"
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
