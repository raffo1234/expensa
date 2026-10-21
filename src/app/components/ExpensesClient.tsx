"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import useSWR from "swr";
import ExpenseTable from "@/components/ExpenseTable";
import {
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  INPUT_CLASS,
  SELECT_CLASS,
} from "@/constants";
import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";
import { Expense, ExpenseRow } from "@/types/ExpenseType";
import { Workspace } from "@/types/WorkspaceType";
import { deleteExpense } from "@/actions/expenses";
import { getExpenseIdsWithMaterials } from "@/actions/materials";
import Field from "./Field";
import PageNavigator from "./PageNavigator";
import ListPage from "./ListPage";
import CategoryMultiFilter from "./CategoryMultiFilter";
import ProviderFilter from "./ProviderFilter";
import { csvEscape } from "@/utils/csv";
import { formatTotals, type CurrencyTotal, totalsByCurrency } from "@/utils/formatAmount";
import { useGlobalState } from "@/lib/globalState";
import CategoryManagerModal from "./CategoryManagerModal";
import { useSearchParams, usePathname } from "next/navigation";
import SearchInput from "./SearchInput";
import { replaceUrl } from "@/utils/replaceUrl";
import { listAllFilteredExpenses, listExpenses } from "@/actions/expenseQueries";
import { categoryIdList, type ExpenseFilters } from "@/types/expenseFilters";
import type { SummaryReportRow } from "./SummaryReportPDF";

// ── Constants ─────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 10;

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = { id: string; name: string; color: string | null };
type Provider = { id: string; name: string };

interface Props {
  slug: string;
  workspace: Workspace;
  initialExpenses: Expense[];
  initialCount: number;
  initialTotals: CurrencyTotal[];
  categories: Category[];
  stages: Stage[];
  levels: Level[];
  providers: Provider[];
}

interface FetchResult {
  data: Expense[];
  count: number;
  totals: CurrencyTotal[];
}

type Filters = ExpenseFilters;

// Quiet buttons for secondary tools (navigation, exports) next to the main action.
const TOOL_BUTTON_CLASS =
  "inline-flex min-h-11 sm:min-h-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 cursor-pointer";

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return <Field label={label}>{children}</Field>;
}

export type Stage = { id: string; name: string; color: string | null };
export type Level = { id: string; name: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapExpenseRow(row: ExpenseRow): Expense {
  const cat = Array.isArray(row.category) ? row.category[0] : row.category;
  const prov = Array.isArray(row.provider) ? row.provider[0] : row.provider;

  return {
    ...row,
    invoice_ref:
      row.invoice_series && row.invoice_number
        ? `${row.invoice_series}-${row.invoice_number}`
        : undefined,
    invoice_series: row.invoice_series ?? undefined,
    invoice_number: row.invoice_number ?? undefined,
    issued_at: row.issued_at ?? undefined,
    payment_method: row.payment_method ?? undefined,
    notes: row.notes ?? undefined,
    provider: prov ?? undefined,
    category: cat ? { ...cat, color: cat.color ?? undefined } : { id: "other", name: "other" },
  };
}

// ── Fetcher ───────────────────────────────────────────────────────────────────

const fetchExpenses = async (
  workspaceId: string,
  page: number,
  search: string,
  filters: Filters,
): Promise<FetchResult> => {
  const { rows, count, totals } = await listExpenses(
    workspaceId,
    page,
    ITEMS_PER_PAGE,
    search,
    filters,
  );
  return { data: rows.map(mapExpenseRow), count, totals };
};

// ── CSV Export ───────────────────────────────────────────────────────────────

const fmtDate = (d?: string | null) => {
  if (!d) return "";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}-${m}-${y}`;
};

const fetchAllFilteredExpenses = (workspaceId: string, search: string, filters: Filters) =>
  listAllFilteredExpenses(workspaceId, search, filters);

const exportExpensesCsv = async (workspaceId: string, search: string, filters: Filters) => {
  const all = await fetchAllFilteredExpenses(workspaceId, search, filters);

  let csv = "﻿";
  csv +=
    "Mes,Fecha Pago,Fecha Emisión,Serie,Numero,Proveedor,RUC,Categoria,Metodo Pago,Monto,Moneda,Notas\n";

  const byMonth: Record<string, ExpenseRow[]> = {};
  for (const e of all) {
    const month = e.paid_at ? e.paid_at.slice(0, 7) : "sin-fecha";
    (byMonth[month] ??= []).push(e);
  }

  for (const month of Object.keys(byMonth).sort()) {
    const expenses = byMonth[month];
    for (const e of expenses) {
      const prov = Array.isArray(e.provider) ? e.provider[0] : e.provider;
      const cat = Array.isArray(e.category) ? e.category[0] : e.category;
      csv +=
        [
          csvEscape(month),
          csvEscape(fmtDate(e.paid_at)),
          csvEscape(fmtDate(e.issued_at)),
          csvEscape(e.invoice_series),
          csvEscape(e.invoice_number),
          csvEscape(prov?.name),
          csvEscape((prov as { ruc?: string })?.ruc),
          csvEscape(cat?.name),
          csvEscape(e.payment_method),
          csvEscape((e.amount / 100).toFixed(2)),
          csvEscape(e.currency),
          csvEscape(e.notes),
        ].join(",") + "\n";
    }
    // One total row per currency: soles and dollars are never added together.
    for (const t of totalsByCurrency(expenses)) {
      csv += `${csvEscape(month)},,,,,,,,,${(t.amount / 100).toFixed(2)},${t.currency},TOTAL ${month}\n`;
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

// ── PDF Export ────────────────────────────────────────────────────────────────

const exportExpensesPdf = async (
  workspaceId: string,
  workspaceName: string,
  search: string,
  filters: Filters,
  categories: Category[],
  stages: Stage[],
  levels: Level[],
  providers: Provider[],
) => {
  const all = await fetchAllFilteredExpenses(workspaceId, search, filters);

  const filterParts = [
    filters.categoryId
      ? `Categoría: ${categoryIdList(filters.categoryId)
          .map((id) => categories.find((c) => c.id === id)?.name)
          .filter(Boolean)
          .join(", ")}`
      : null,
    filters.stageId ? `Etapa: ${stages.find((s) => s.id === filters.stageId)?.name ?? ""}` : null,
    filters.levelId ? `Nivel: ${levels.find((l) => l.id === filters.levelId)?.name ?? ""}` : null,
    filters.providerId
      ? `Proveedor: ${providers.find((p) => p.id === filters.providerId)?.name ?? ""}`
      : null,
    filters.invoiceSeries ? `Serie: ${filters.invoiceSeries}` : null,
    filters.invoiceNumber ? `Número: ${filters.invoiceNumber}` : null,
    filters.issuedFrom || filters.issuedTo
      ? `Emisión: ${filters.issuedFrom || "…"} a ${filters.issuedTo || "…"}`
      : null,
    filters.amountMin || filters.amountMax
      ? `Monto: ${filters.amountMin || "…"} a ${filters.amountMax || "…"}`
      : null,
    search ? `Búsqueda: "${search}"` : null,
  ].filter(Boolean);

  const rows: SummaryReportRow[] = all.map((e) => {
    const prov = Array.isArray(e.provider) ? e.provider[0] : e.provider;
    const cat = Array.isArray(e.category) ? e.category[0] : e.category;
    return {
      id: e.id,
      paid_at: e.paid_at,
      provider_name: prov?.name,
      category_name: cat?.name,
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
    <SummaryReportPDF
      workspaceName={workspaceName}
      filtersLabel={filterParts.length ? filterParts.join("  •  ") : "Sin filtros"}
      rows={rows}
    />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reporte-gastos-${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};

// ── Component ─────────────────────────────────────────────────────────────────

const EMPTY_FILTERS: Filters = {
  issuedFrom: "",
  issuedTo: "",
  amountMin: "",
  amountMax: "",
  categoryId: "",
  stageId: "",
  levelId: "",
  providerId: "",
  invoiceSeries: "",
  invoiceNumber: "",
};

export default function ExpensesClient({
  slug,
  workspace,
  initialExpenses,
  initialCount,
  initialTotals,
  categories,
  stages,
  levels,
  providers,
}: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [page, setPage] = useState(() => Number(searchParams.get("page") ?? "1") || 1);
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get("q") ?? "");
  const [filters, setFilters] = useState<Filters>(() => ({
    issuedFrom: searchParams.get("issuedFrom") ?? "",
    issuedTo: searchParams.get("issuedTo") ?? "",
    amountMin: searchParams.get("amountMin") ?? "",
    amountMax: searchParams.get("amountMax") ?? "",
    categoryId: searchParams.get("categoryId") ?? "",
    stageId: searchParams.get("stageId") ?? "",
    levelId: searchParams.get("levelId") ?? "",
    providerId: searchParams.get("providerId") ?? "",
    invoiceSeries: searchParams.get("invoiceSeries") ?? "",
    invoiceNumber: searchParams.get("invoiceNumber") ?? "",
  }));
  const [issuedMonth, setIssuedMonth] = useState(() => searchParams.get("issuedMonth") ?? "");
  const [showFilters, setShowFilters] = useState(() => {
    const f = [
      "issuedFrom",
      "issuedTo",
      "amountMin",
      "amountMax",
      "categoryId",
      "stageId",
      "levelId",
      "providerId",
    ] as const;
    return f.some((k) => searchParams.get(k));
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [localCategories, setLocalCategories] = useState(categories);
  const { setModalContent, setModalOpen } = useGlobalState();

  const syncUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (issuedMonth) params.set("issuedMonth", issuedMonth);
    for (const [k, v] of Object.entries(filters)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    replaceUrl(qs ? `${pathname}?${qs}` : pathname);
  }, [page, debouncedSearch, filters, issuedMonth, pathname]);

  useEffect(() => {
    const t = setTimeout(syncUrl, 300);
    return () => clearTimeout(t);
  }, [syncUrl]);

  const openCategoriesModal = () => {
    setModalContent(
      <CategoryManagerModal
        workspaceId={workspace.id}
        categories={localCategories}
        onUpdate={setLocalCategories}
      />,
    );
    setModalOpen(true);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  function setFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  const handleIssuedMonthChange = (value: string) => {
    setIssuedMonth(value);
    if (value) {
      const [y, m] = value.split("-").map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      setFilters((prev) => ({
        ...prev,
        issuedFrom: `${value}-01`,
        issuedTo: `${value}-${String(lastDay).padStart(2, "0")}`,
      }));
    } else {
      setFilters((prev) => ({ ...prev, issuedFrom: "", issuedTo: "" }));
    }
    setPage(1);
  };

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setSearch("");
    setIssuedMonth("");
    setPage(1);
  }

  const hasActiveFilters = debouncedSearch || Object.values(filters).some((v) => v !== "");

  const isDefaultView =
    page === 1 && !debouncedSearch && !Object.values(filters).some((v) => v !== "");
  // The server already rendered the default view; skip refetching it on mount.
  const [hasServerData] = useState(isDefaultView);

  const { data, error, mutate } = useSWR(
    ["expenses", workspace.id, page, debouncedSearch, filters],
    () => fetchExpenses(workspace.id, page, debouncedSearch, filters),
    {
      fallbackData: isDefaultView
        ? ({
            data: initialExpenses,
            count: initialCount,
            totals: initialTotals,
          } as FetchResult)
        : undefined,
      revalidateOnMount: !hasServerData,
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );

  const expenses = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totals = data?.totals ?? [];
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const displayCurrency = expenses[0]?.currency ?? "PEN";
  // Largest-impact currency first; soles lead when present.
  const primaryTotals = [...totals]
    .filter((t) => t.amount !== 0)
    .sort((a, b) => (a.currency === "PEN" ? -1 : b.currency === "PEN" ? 1 : b.amount - a.amount));
  // Filters inside the panel (the invoice reference is always visible, so it isn't counted).
  const advancedFilterCount = [
    filters.providerId,
    filters.categoryId,
    filters.stageId,
    filters.levelId,
    filters.issuedFrom || filters.issuedTo,
    filters.amountMin || filters.amountMax,
  ].filter(Boolean).length;

  const expenseIdsKey = expenses
    .map((e) => e.id)
    .sort()
    .join(",");
  const { data: materialExpenseIds = [] } = useSWR(
    expenseIdsKey ? ["expenses-with-materials", expenseIdsKey] : null,
    () => getExpenseIdsWithMaterials(expenses.map((e) => e.id)),
  );
  const materialExpenseIdSet = new Set(materialExpenseIds);

  const handleDelete = async (id: string) => {
    const snapshot = data;
    setDeletingId(id);
    try {
      await deleteExpense(id, slug);
      // Drop the row right away, then refetch so totals and pages stay correct.
      mutate(
        (prev) =>
          prev
            ? { ...prev, data: prev.data.filter((e) => e.id !== id), count: prev.count - 1 }
            : prev,
        { revalidate: true },
      );
      toast.success("Gasto eliminado");
    } catch {
      mutate(snapshot, { revalidate: false });
      toast.error("No se pudo eliminar el gasto. Inténtalo de nuevo.");
    } finally {
      setDeletingId(null);
    }
  };

  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center gap-3 py-20 text-center"
      >
        <p className="text-sm text-red-700">
          No se pudieron cargar los gastos. Revisa tu conexión e inténtalo de nuevo.
        </p>
        <button type="button" onClick={() => mutate()} className={SECONDARY_BUTTON_CLASS}>
          Reintentar
        </button>
      </div>
    );
  }

  const pager =
    totalPages > 1 ? (
      <PageNavigator
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
      />
    ) : null;

  return (
    <ListPage
      pager={pager}
      controls={
        <>
          {/* 1 · What matters most: how much was spent, and the one primary action. */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {hasActiveFilters ? "Total con los filtros aplicados" : "Total gastado"}
              </p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 tabular-nums">
                {primaryTotals.length === 0 ? (
                  <span className="text-3xl font-semibold tracking-tight text-gray-900">
                    {formatTotals([], displayCurrency)}
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
              <p className="mt-1 text-sm text-gray-600">
                {totalCount} {totalCount === 1 ? "gasto" : "gastos"}
              </p>
            </div>

            <div className="flex flex-col gap-6 sm:items-end">
              <Link
                href={`/admin/workspaces/${slug}/upload-expense`}
                className={`${PRIMARY_BUTTON_CLASS} justify-center min-h-11`}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 12h14M12 5v14" />
                </svg>
                Agregar gasto
              </Link>
              {/* Secondary tools stay quiet so they don't compete with the main action. */}
              <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                <Link href={`/admin/workspaces/${slug}/materials`} className={TOOL_BUTTON_CLASS}>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                  Materiales
                </Link>
                <button
                  type="button"
                  onClick={() => exportExpensesCsv(workspace.id, debouncedSearch, filters)}
                  className={TOOL_BUTTON_CLASS}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Exportar CSV
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exportExpensesPdf(
                      workspace.id,
                      workspace.name,
                      debouncedSearch,
                      filters,
                      localCategories,
                      stages,
                      levels,
                      providers,
                    )
                  }
                  className={TOOL_BUTTON_CLASS}
                >
                  <Icon icon="hugeicons:pdf-02" fontSize={15} aria-hidden />
                  Descargar PDF
                </button>
              </div>
            </div>
          </div>

          {/* 2 · Finding an expense: search plus the invoice reference, in one row. */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <SearchInput
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  // Clearing applies right away instead of waiting for the debounce.
                  if (!value) {
                    setDebouncedSearch("");
                    setPage(1);
                  }
                }}
                placeholder="Buscar por proveedor, notas o monto…"
                className="col-span-2 sm:flex-1"
              />
              <input
                type="text"
                aria-label="Serie de factura"
                placeholder="Serie"
                value={filters.invoiceSeries}
                onChange={(e) => setFilter("invoiceSeries", e.target.value)}
                className={`${INPUT_CLASS} sm:w-28`}
              />
              <input
                type="text"
                aria-label="Número de factura"
                placeholder="Número"
                value={filters.invoiceNumber}
                onChange={(e) => setFilter("invoiceNumber", e.target.value)}
                className={`${INPUT_CLASS} sm:w-36`}
              />
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                aria-expanded={showFilters}
                aria-controls="expense-filters"
                className={`${SECONDARY_BUTTON_CLASS} justify-center min-h-11 sm:min-h-0 ${
                  showFilters || advancedFilterCount ? "border-violet-300 text-violet-700" : ""
                }`}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="7" y1="12" x2="17" y2="12" />
                  <line x1="10" y1="18" x2="14" y2="18" />
                </svg>
                Filtros
                {advancedFilterCount > 0 && (
                  <span className="rounded-full bg-violet-600 px-1.5 text-xs font-semibold text-white tabular-nums">
                    {advancedFilterCount}
                  </span>
                )}
              </button>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="justify-self-start text-sm font-medium text-gray-600 underline-offset-2 hover:text-violet-700 hover:underline min-h-11 sm:min-h-0 px-1"
                >
                  Limpiar todo
                </button>
              )}
            </div>

            {/* 3 · Everything else, only when asked for: one panel, visible labels. */}
            {showFilters && (
              <div
                id="expense-filters"
                className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50/70 p-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                <FilterField label="Proveedor">
                  <ProviderFilter
                    providers={providers}
                    value={filters.providerId}
                    onChange={(id) => setFilter("providerId", id)}
                  />
                </FilterField>

                <FilterField label="Categoría">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <CategoryMultiFilter
                        categories={localCategories}
                        value={categoryIdList(filters.categoryId)}
                        onChange={(ids) => setFilter("categoryId", ids.join(","))}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={openCategoriesModal}
                      aria-label="Gestionar categorías"
                      title="Gestionar categorías"
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:border-violet-400 hover:text-violet-600"
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        aria-hidden
                      >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                    </button>
                  </div>
                </FilterField>

                <FilterField label="Etapa">
                  <select
                    value={filters.stageId}
                    onChange={(e) => setFilter("stageId", e.target.value)}
                    className={SELECT_CLASS}
                  >
                    <option value="">Todas</option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </FilterField>

                <FilterField label="Nivel">
                  <select
                    value={filters.levelId}
                    onChange={(e) => setFilter("levelId", e.target.value)}
                    className={SELECT_CLASS}
                  >
                    <option value="">Todos</option>
                    {levels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </FilterField>

                <FilterField label="Mes de emisión">
                  <input
                    type="month"
                    value={issuedMonth}
                    onChange={(e) => handleIssuedMonthChange(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </FilterField>

                <FilterField label="Emitida desde">
                  <input
                    type="date"
                    value={filters.issuedFrom}
                    onChange={(e) => {
                      setFilter("issuedFrom", e.target.value);
                      setIssuedMonth("");
                    }}
                    className={INPUT_CLASS}
                  />
                </FilterField>

                <FilterField label="Emitida hasta">
                  <input
                    type="date"
                    value={filters.issuedTo}
                    onChange={(e) => {
                      setFilter("issuedTo", e.target.value);
                      setIssuedMonth("");
                    }}
                    className={INPUT_CLASS}
                  />
                </FilterField>

                <FilterField label="Monto (mín. – máx.)">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      placeholder="Mín."
                      aria-label="Monto mínimo"
                      value={filters.amountMin}
                      onChange={(e) => setFilter("amountMin", e.target.value)}
                      className={INPUT_CLASS}
                    />
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      placeholder="Máx."
                      aria-label="Monto máximo"
                      value={filters.amountMax}
                      onChange={(e) => setFilter("amountMax", e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                </FilterField>
              </div>
            )}
          </div>
        </>
      }
    >
      <ExpenseTable
        expenses={expenses}
        onDelete={handleDelete}
        deletingId={deletingId}
        workspaceSlug={slug}
        materialExpenseIds={materialExpenseIdSet}
      />
    </ListPage>
  );
}
