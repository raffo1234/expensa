"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { useDebouncedCallback } from "use-debounce";
import { Icon } from "@iconify/react/dist/iconify.js";
import {
  ICON_SIZE,
  INPUT_CLASS,
  SECONDARY_BUTTON_CLASS,
  SELECT_CLASS,
  PRIMARY_BUTTON_CLASS,
} from "@/constants";
import { formatAmount } from "@/utils/formatAmount";
import getAttachmentUrl from "@/lib/getAttachmentUrl";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { replaceUrl } from "@/utils/replaceUrl";
import OptionButton from "./OptionButton";
import InputWithTooltip from "./InputWithTooltip";
import SearchInput from "./SearchInput";
import DataTable, { DataTableRow } from "./DataTable";
import CategoryFilter from "./CategoryFilter";
import type { SummaryReportRow } from "./SummaryReportPDF";

const PAGE_SIZE = 10;
type SummaryTab = "facturas" | "gastos";

const SUMMARY_TABS: { value: SummaryTab; label: string }[] = [
  { value: "facturas", label: "Facturas" },
  { value: "gastos", label: "Gastos" },
];

const SUMMARY_COLUMNS = [
  { label: "Referencia" },
  { label: "Proveedor" },
  { label: "Categoría" },
  { label: "Método de pago" },
  { label: "Fecha emisión" },
  { label: "Monto", className: "text-right" },
  { label: "Adjuntos" },
];

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyTabFilter<T extends { not: any; is: any }>(query: T, tab: SummaryTab): T {
  if (tab === "facturas") {
    return query.not("invoice_series", "is", null).not("invoice_number", "is", null);
  }
  return query.is("invoice_series", null).is("invoice_number", null);
}

const fetcher = async ([
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
]: [string, string, number, string, string, string, SummaryTab, string, string, string]) => {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let providerIds: string[] = [];
  if (search.trim()) {
    const { data: providers } = await supabase
      .from("provider")
      .select("id")
      .eq("workspace_id", workspaceId)
      .ilike("name", `%${search.trim()}%`);
    providerIds = (providers ?? []).map((p: { id: string }) => p.id);
  }

  const orClause = search.trim()
    ? [
        `invoice_series.ilike.%${search.trim()}%`,
        `invoice_number.ilike.%${search.trim()}%`,
        `notes.ilike.%${search.trim()}%`,
        ...(providerIds.length > 0 ? [`provider_id.in.(${providerIds.join(",")})`] : []),
      ].join(",")
    : null;

  let query = supabase
    .from("expense")
    .select(
      `id, invoice_series, invoice_number, amount, currency, issued_at, paid_at, payment_method, notes,
       provider:provider_id(id, name, ruc),
       category:category_id(id, name, color),
       expense_attachment(id, file_name, storage_path)`,
      { count: "exact" },
    )
    .eq("workspace_id", workspaceId)
    .order("paid_at", { ascending: false })
    .range(from, to);

  query = applyTabFilter(query, tab);

  if (categoryId) query = query.eq("category_id", categoryId);
  if (invoiceSeries) query = query.ilike("invoice_series", `%${invoiceSeries}%`);
  if (invoiceNumber) query = query.ilike("invoice_number", `%${invoiceNumber}%`);
  if (orClause) query = query.or(orClause);
  if (dateFrom) query = query.gte("issued_at", dateFrom);
  if (dateTo) query = query.lte("issued_at", dateTo);

  const { data, count, error } = await query;
  if (error) throw error;
  return { data: (data ?? []) as SummaryExpense[], count: count ?? 0 };
};

const fmtDate = (d?: string | null) => {
  if (!d) return "";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}-${m}-${y}`;
};

const csvEscape = (v: unknown) => {
  if (v == null) return "";
  const s = String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
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
): Promise<SummaryExpense[]> => {
  let providerIds: string[] = [];
  if (search.trim()) {
    const { data: providers } = await supabase
      .from("provider")
      .select("id")
      .eq("workspace_id", workspaceId)
      .ilike("name", `%${search.trim()}%`);
    providerIds = (providers ?? []).map((p: { id: string }) => p.id);
  }

  const orClause = search.trim()
    ? [
        `invoice_series.ilike.%${search.trim()}%`,
        `invoice_number.ilike.%${search.trim()}%`,
        `notes.ilike.%${search.trim()}%`,
        ...(providerIds.length > 0 ? [`provider_id.in.(${providerIds.join(",")})`] : []),
      ].join(",")
    : null;

  const all: SummaryExpense[] = [];
  let page = 0;
  const size = 1000;
  while (true) {
    let query = supabase
      .from("expense")
      .select(
        `id, invoice_series, invoice_number, amount, currency, paid_at, payment_method, notes,
         provider:provider_id(id, name, ruc),
         category:category_id(id, name, color)`,
      )
      .eq("workspace_id", workspaceId)
      .order("paid_at", { ascending: true })
      .range(page * size, (page + 1) * size - 1);

    query = applyTabFilter(query, tab);

    if (categoryId) query = query.eq("category_id", categoryId);
    if (invoiceSeries) query = query.ilike("invoice_series", `%${invoiceSeries}%`);
    if (invoiceNumber) query = query.ilike("invoice_number", `%${invoiceNumber}%`);
    if (orClause) query = query.or(orClause);
    if (dateFrom) query = query.gte("issued_at", dateFrom);
    if (dateTo) query = query.lte("issued_at", dateTo);

    const { data } = await query;
    if (!data || data.length === 0) break;
    all.push(...(data as SummaryExpense[]));
    if (data.length < size) break;
    page++;
  }

  return all;
};

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
    const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    csv += `${csvEscape(month)},,,,,,,,${(total / 100).toFixed(2)},,TOTAL ${month}\n\n`;
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

async function fetchCategories(workspaceId: string): Promise<CategoryOption[]> {
  const { data, error } = await supabase
    .from("category")
    .select("id, name, color")
    .eq("workspace_id", workspaceId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

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

  const [page, setPage] = useState(() => Number(searchParams.get("page") ?? "0"));
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [dateFrom, setDateFrom] = useState(() => searchParams.get("from") ?? "");
  const [dateTo, setDateTo] = useState(() => searchParams.get("to") ?? "");
  const [month, setMonth] = useState(() => searchParams.get("month") ?? "");
  const [categoryId, setCategoryId] = useState(() => searchParams.get("cat") ?? "");
  const [invoiceSeries, setInvoiceSeries] = useState(() => searchParams.get("series") ?? "");
  const [invoiceNumber, setInvoiceNumber] = useState(() => searchParams.get("number") ?? "");
  const [searchText, setSearchText] = useState(search);

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
    if (page > 0) params.set("page", String(page));
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

  const { data, isLoading } = useSWR(
    workspaceId
      ? [
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
        ]
      : null,
    fetcher,
  );

  const expenses = data?.data ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {SUMMARY_TABS.map(({ value, label }) => (
          <OptionButton key={value} isActive={tab === value} onClick={() => setTab(value)}>
            {label}
          </OptionButton>
        ))}
      </div>
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-xs">
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
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
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
              className={`${PRIMARY_BUTTON_CLASS} justify-center`}
            >
              <Icon icon="solar:download-linear" fontSize={ICON_SIZE} />
              Export CSV
            </button>
            <button
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
              className={`${SECONDARY_BUTTON_CLASS} justify-center`}
            >
              <Icon icon="hugeicons:pdf-02" fontSize={ICON_SIZE} />
              Descargar PDF
            </button>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <SearchInput
            value={searchText}
            onChange={handleSearchChange}
            placeholder="Search invoice, provider, notes..."
            className="flex-1"
          />
          {hasFilters && (
            <InputWithTooltip label="Limpiar filtros">
              <button
                type="button"
                onClick={clearFilters}
                aria-label="Limpiar filtros"
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-purple-400 hover:text-purple-500 transition-colors cursor-pointer"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  <line x1="4" y1="21" x2="21" y2="4" />
                </svg>
              </button>
            </InputWithTooltip>
          )}
        </div>
        <div className="border border-gray-200 rounded-xl px-2 py-1.5 bg-gray-50/50">
          <p className="block text-[11px] font-medium text-gray-400 mb-1">Factura</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Serie"
              value={invoiceSeries}
              onChange={(e) => {
                setInvoiceSeries(e.target.value);
                setPage(0);
              }}
              className={INPUT_CLASS}
            />
            <input
              type="text"
              placeholder="Número"
              value={invoiceNumber}
              onChange={(e) => {
                setInvoiceNumber(e.target.value);
                setPage(0);
              }}
              className={INPUT_CLASS}
            />
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex gap-2 items-end border border-gray-200 rounded-xl px-2 py-1.5 bg-gray-50/50">
            <div className="flex-1">
              <p className="block text-[11px] font-medium text-gray-400 mb-1">Categoría</p>
              <CategoryFilter
                categories={categories}
                value={categoryId}
                onChange={(id) => {
                  setCategoryId(id);
                  setPage(0);
                }}
              />
            </div>
          </div>
          <div className="border border-gray-200 rounded-xl px-2 py-1.5 bg-gray-50/50">
            <p className="block text-[11px] font-medium text-gray-400 mb-1">Emisión</p>
            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              <InputWithTooltip label="Mes de emisión" className="w-full sm:w-auto min-w-0">
                <input
                  type="month"
                  value={month}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className={INPUT_CLASS}
                />
              </InputWithTooltip>
              <InputWithTooltip label="Emisión desde" className="flex-1 min-w-0">
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
              </InputWithTooltip>
              <InputWithTooltip label="Emisión hasta" className="flex-1 min-w-0">
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
              </InputWithTooltip>
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center font-semibold">
        <span>Total: {total}</span>
        <div className="flex text-sm items-center gap-2">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 bg-cyan-400 disabled:opacity-50 disabled:pointer-events-none text-white rounded-full cursor-pointer"
          >
            <Icon icon="solar:alt-arrow-left-linear" fontSize={ICON_SIZE} />
          </button>
          <span className="uppercase">
            {page + 1} of {totalPages}
          </span>
          <button
            disabled={(page + 1) * PAGE_SIZE >= total}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 bg-cyan-400 disabled:opacity-50 disabled:pointer-events-none text-white rounded-full cursor-pointer"
          >
            <Icon icon="solar:alt-arrow-right-linear" fontSize={ICON_SIZE} />
          </button>
        </div>
      </div>

      <DataTable
        columns={SUMMARY_COLUMNS}
        isLoading={isLoading}
        isEmpty={expenses.length === 0}
        emptyMessage="No expenses found"
      >
        {expenses.map((expense) => {
          const prov = Array.isArray(expense.provider) ? expense.provider[0] : expense.provider;
          const cat = Array.isArray(expense.category) ? expense.category[0] : expense.category;

          const href = `/admin/summary/${expense.id}`;

          return (
            <DataTableRow key={expense.id}>
              <td className="font-mono text-sm whitespace-nowrap">
                <Link href={href} target="_blank" className="block p-6">
                  {expense.invoice_series && expense.invoice_number
                    ? `${expense.invoice_series}-${expense.invoice_number}`
                    : "—"}
                </Link>
              </td>
              <td>
                <Link href={href} target="_blank" className="block p-6">
                  <div>{prov?.name ?? "—"}</div>
                  {prov?.ruc && <div className="text-sm text-gray-400">{prov.ruc}</div>}
                </Link>
              </td>
              <td>
                <Link href={href} target="_blank" className="block p-6">
                  {cat ? (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: cat.color ? `${cat.color}20` : "#f3f4f6",
                        color: cat.color ?? "#374151",
                      }}
                    >
                      {cat.name}
                    </span>
                  ) : (
                    "—"
                  )}
                </Link>
              </td>
              <td className="whitespace-nowrap">
                <Link href={href} target="_blank" className="block p-6">
                  {expense.payment_method ?? "—"}
                </Link>
              </td>
              <td className="whitespace-nowrap">
                <Link href={href} target="_blank" className="block p-6">
                  {formatDate(expense.issued_at)}
                </Link>
              </td>
              <td className="text-right font-medium whitespace-nowrap">
                <Link href={href} target="_blank" className="block p-6">
                  {expense.amount != null ? formatAmount(expense.amount, expense.currency) : "—"}
                </Link>
              </td>
              <td className="p-6">
                <div className="flex flex-wrap gap-1">
                  {expense.expense_attachment?.map((att) => (
                    <a
                      key={att.id}
                      href={getAttachmentUrl(att.storage_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={att.file_name ?? "attachment"}
                      className="inline-flex items-center gap-2 p-2 rounded-lg bg-cyan-50 text-cyan-600 hover:bg-cyan-100 text-sm transition-colors"
                    >
                      <Icon
                        icon={
                          /\.pdf$/i.test(att.file_name ?? "")
                            ? "hugeicons:pdf-02"
                            : "solar:gallery-minimalistic-linear"
                        }
                        fontSize={24}
                      />
                      <span className="max-w-[80px] truncate">{att.file_name ?? "file"}</span>
                    </a>
                  ))}
                </div>
              </td>
            </DataTableRow>
          );
        })}
      </DataTable>
    </div>
  );
}
