"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import ExpenseTable from "@/components/ExpenseTable";
import { supabase } from "@/lib/supabase";
import {
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  INPUT_CLASS,
  SELECT_CLASS,
} from "@/constants";
import Link from "next/link";
import BackLink from "@/components/BackLink";
import { Expense, ExpenseRow } from "@/types/ExpenseType";
import { Workspace } from "@/types/WorkspaceType";
import { deleteExpense } from "@/actions/expenses";
import TitleWrapper from "./TitleWrapper";
import PageTitle from "./PageTitle";
import CategoryFilter from "./CategoryFilter";
import ProviderFilter from "./ProviderFilter";
import { formatAmount } from "@/utils/formatAmount";
import { useGlobalState } from "@/lib/globalState";
import ManageCategoriesModal from "./ManageCategoriesModal";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import InputWithTooltip from "./InputWithTooltip";

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
  initialTotalAmount: number;
  categories: Category[];
  stages: Stage[];
  levels: Level[];
  providers: Provider[];
}

interface FetchResult {
  data: Expense[];
  count: number;
  totalAmount: number;
}

type Filters = {
  issuedFrom: string;
  issuedTo: string;
  amountMin: string;
  amountMax: string;
  categoryId: string;
  stageId: string;
  levelId: string;
  providerId: string;
};

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

async function buildSearchClause(workspaceId: string, search: string): Promise<string | null> {
  const q = search.trim();
  if (!q) return null;

  const clauses: string[] = [
    `invoice_series.ilike.%${q}%`,
    `invoice_number.ilike.%${q}%`,
    `notes.ilike.%${q}%`,
  ];

  const { data: matchingProviders } = await supabase
    .from("provider")
    .select("id")
    .eq("workspace_id", workspaceId)
    .or(`name.ilike.%${q}%,ruc.ilike.%${q}%`);
  const providerIds = (matchingProviders ?? []).map((p) => p.id);
  if (providerIds.length > 0) clauses.push(`provider_id.in.(${providerIds.join(",")})`);

  const num = parseFloat(q);
  if (!isNaN(num) && num > 0) {
    const cents = Math.round(num * 100);
    clauses.push(`amount.eq.${cents}`);
  }

  return clauses.join(",");
}

const fetchExpenses = async (
  workspaceId: string,
  page: number,
  search: string,
  filters: Filters,
): Promise<FetchResult> => {
  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  const orClause = await buildSearchClause(workspaceId, search);

  let query = supabase
    .from("expense")
    .select(
      `id, invoice_series, invoice_number, amount, currency,
       issued_at, paid_at, payment_method, notes, created_at,
       provider:provider_id(id, name),
       category:category_id(id, name, color)`,
      { count: "exact" },
    )
    .eq("workspace_id", workspaceId)
    .order("paid_at", { ascending: false })
    .range(from, to);

  let amountsQuery = supabase.from("expense").select("amount").eq("workspace_id", workspaceId);

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
    amountsQuery = amountsQuery.eq("category_id", filters.categoryId);
  }
  if (filters.stageId) {
    query = query.eq("stage_id", filters.stageId);
    amountsQuery = amountsQuery.eq("stage_id", filters.stageId);
  }
  if (filters.levelId) {
    query = query.eq("level_id", filters.levelId);
    amountsQuery = amountsQuery.eq("level_id", filters.levelId);
  }
  if (filters.providerId) {
    query = query.eq("provider_id", filters.providerId);
    amountsQuery = amountsQuery.eq("provider_id", filters.providerId);
  }
  if (orClause) {
    query = query.or(orClause);
    amountsQuery = amountsQuery.or(orClause);
  }
  if (filters.issuedFrom) {
    query = query.gte("issued_at", filters.issuedFrom);
    amountsQuery = amountsQuery.gte("issued_at", filters.issuedFrom);
  }
  if (filters.issuedTo) {
    query = query.lte("issued_at", filters.issuedTo);
    amountsQuery = amountsQuery.lte("issued_at", filters.issuedTo);
  }
  if (filters.amountMin) {
    const min = Math.round(parseFloat(filters.amountMin) * 100);
    query = query.gte("amount", min);
    amountsQuery = amountsQuery.gte("amount", min);
  }
  if (filters.amountMax) {
    const max = Math.round(parseFloat(filters.amountMax) * 100);
    query = query.lte("amount", max);
    amountsQuery = amountsQuery.lte("amount", max);
  }

  const [{ data, error, count }, { data: allAmounts }] = await Promise.all([query, amountsQuery]);
  if (error) throw error;

  const totalAmount = (allAmounts ?? []).reduce((acc, r) => acc + (r.amount ?? 0), 0);

  return {
    data: ((data as unknown as ExpenseRow[]) ?? []).map(mapExpenseRow),
    count: count ?? 0,
    totalAmount,
  };
};

// ── CSV Export ───────────────────────────────────────────────────────────────

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

const exportExpensesCsv = async (workspaceId: string, search: string, filters: Filters) => {
  const orClause = await buildSearchClause(workspaceId, search);

  const all: ExpenseRow[] = [];
  let page = 0;
  const size = 1000;
  while (true) {
    let query = supabase
      .from("expense")
      .select(
        `id, invoice_series, invoice_number, amount, currency,
         issued_at, paid_at, payment_method, notes,
         provider:provider_id(id, name, ruc),
         category:category_id(id, name, color)`,
      )
      .eq("workspace_id", workspaceId)
      .order("paid_at", { ascending: true })
      .range(page * size, (page + 1) * size - 1);

    if (orClause) query = query.or(orClause);
    if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
    if (filters.stageId) query = query.eq("stage_id", filters.stageId);
    if (filters.levelId) query = query.eq("level_id", filters.levelId);
    if (filters.providerId) query = query.eq("provider_id", filters.providerId);
    if (filters.issuedFrom) query = query.gte("issued_at", filters.issuedFrom);
    if (filters.issuedTo) query = query.lte("issued_at", filters.issuedTo);
    if (filters.amountMin)
      query = query.gte("amount", Math.round(parseFloat(filters.amountMin) * 100));
    if (filters.amountMax)
      query = query.lte("amount", Math.round(parseFloat(filters.amountMax) * 100));

    const { data } = await query;
    if (!data || data.length === 0) break;
    all.push(...(data as unknown as ExpenseRow[]));
    if (data.length < size) break;
    page++;
  }

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
    const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    csv += `${csvEscape(month)},,,,,,,,,${(total / 100).toFixed(2)},,TOTAL ${month}\n\n`;
  }

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gastos-${new Date().toISOString().slice(0, 10)}.csv`;
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
};

export default function ExpensesClient({
  slug,
  workspace,
  initialExpenses,
  initialCount,
  initialTotalAmount,
  categories,
  stages,
  levels,
  providers,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
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
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [page, debouncedSearch, filters, issuedMonth, router, pathname]);

  useEffect(() => {
    const t = setTimeout(syncUrl, 300);
    return () => clearTimeout(t);
  }, [syncUrl]);

  const openCategoriesModal = () => {
    setModalContent(
      <ManageCategoriesModal
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

  const { data, error, mutate } = useSWR(
    ["expenses", workspace.id, page, debouncedSearch, filters],
    () => fetchExpenses(workspace.id, page, debouncedSearch, filters),
    {
      fallbackData:
        page === 1 && !debouncedSearch && !Object.values(filters).some((v) => v !== "")
          ? ({
              data: initialExpenses,
              count: initialCount,
              totalAmount: initialTotalAmount,
            } as FetchResult)
          : undefined,
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );

  const expenses = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalAmount = data?.totalAmount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const displayCurrency = expenses[0]?.currency ?? "PEN";

  const handleDelete = async (id: string) => {
    const snapshot = data;
    setDeletingId(id);
    try {
      await deleteExpense(id, slug);
      mutate(
        (prev) =>
          prev
            ? { ...prev, data: prev.data.filter((e) => e.id !== id), count: prev.count - 1 }
            : prev,
        { revalidate: false },
      );
    } catch {
      mutate(snapshot, { revalidate: false });
    } finally {
      setDeletingId(null);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-red-400">Error al cargar los gastos.</p>
      </div>
    );
  }

  const labelClass = "block text-[11px] font-medium text-gray-400 mb-1";

  return (
    <>
      <div>
        <TitleWrapper>
          <div className="flex mb-6 items-center justify-between mt-8">
            <Link
              href={`/admin/workspaces/${slug}/upload-expense`}
              className={PRIMARY_BUTTON_CLASS}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5v14" />
              </svg>
              Agregar
            </Link>
            <button
              onClick={() => exportExpensesCsv(workspace.id, debouncedSearch, filters)}
              className={SECONDARY_BUTTON_CLASS}
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
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">
              {formatAmount(totalAmount, displayCurrency)}
            </span>
            <span className="text-gray-800">·</span>
            <span className="text-gray-400">
              {totalCount} registro{totalCount !== 1 ? "s" : ""}
            </span>
          </div>
        </TitleWrapper>

        {/* Buscador */}
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por referencia, proveedor o notas..."
            className={`${INPUT_CLASS} flex-1`}
          />
          {hasActiveFilters && (
            <InputWithTooltip label="Limpiar filtros">
              <button
                type="button"
                onClick={clearFilters}
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-purple-400 hover:text-purple-500 transition-colors"
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
        <div className="mb-3">
          <ProviderFilter
            providers={providers}
            value={filters.providerId}
            onChange={(id) => setFilter("providerId", id)}
          />
        </div>

        {/* Toggle filtros */}
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="mb-3 text-xs text-purple-500 hover:text-purple-700 underline underline-offset-2 transition"
        >
          {showFilters ? "Cerrar filtros" : "Más filtros"}
        </button>

        {showFilters && (
          <div className="mb-4 grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="col-span-2 sm:col-span-3 lg:col-span-3 flex gap-2 items-center border border-gray-200 rounded-xl px-2 py-1.5 bg-gray-50/50">
              <span className="text-[11px] font-medium text-gray-400 pl-1">Emisión</span>
              <InputWithTooltip label="Mes de emisión">
                <input
                  type="month"
                  value={issuedMonth}
                  onChange={(e) => handleIssuedMonthChange(e.target.value)}
                  className={INPUT_CLASS}
                />
              </InputWithTooltip>
              <InputWithTooltip label="Emisión desde">
                <input
                  type="date"
                  value={filters.issuedFrom}
                  onChange={(e) => {
                    setFilter("issuedFrom", e.target.value);
                    setIssuedMonth("");
                  }}
                  className={INPUT_CLASS}
                />
              </InputWithTooltip>
              <InputWithTooltip label="Emisión hasta">
                <input
                  type="date"
                  value={filters.issuedTo}
                  onChange={(e) => {
                    setFilter("issuedTo", e.target.value);
                    setIssuedMonth("");
                  }}
                  className={INPUT_CLASS}
                />
              </InputWithTooltip>
            </div>
            <div className="col-span-2 sm:col-span-3 lg:col-span-3 flex gap-2 items-center border border-gray-200 rounded-xl px-2 py-1.5 bg-gray-50/50">
              <span className="text-[11px] font-medium text-gray-400 pl-1">Monto</span>
              <InputWithTooltip label="Monto mínimo">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={filters.amountMin}
                  onChange={(e) => setFilter("amountMin", e.target.value)}
                  className={INPUT_CLASS}
                />
              </InputWithTooltip>
              <InputWithTooltip label="Monto máximo">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={filters.amountMax}
                  onChange={(e) => setFilter("amountMax", e.target.value)}
                  className={INPUT_CLASS}
                />
              </InputWithTooltip>
            </div>
            <div className="col-span-2 sm:col-span-3 lg:col-span-2 flex gap-2 items-end border border-gray-200 rounded-xl px-2 py-1.5 bg-gray-50/50">
              <div className="flex-1">
                <p className={labelClass}>Categoría</p>
                <CategoryFilter
                  categories={localCategories}
                  value={filters.categoryId}
                  onChange={(id) => setFilter("categoryId", id)}
                />
              </div>
              <InputWithTooltip label="Gestionar categorías">
                <button
                  type="button"
                  onClick={openCategoriesModal}
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-purple-400 hover:text-purple-500 transition-colors mb-0.5"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>
              </InputWithTooltip>
            </div>
            <div className="col-span-2 sm:col-span-3 lg:col-span-2 flex gap-2 items-end border border-gray-200 rounded-xl px-2 py-1.5 bg-gray-50/50">
              <div className="flex-1">
                <p className={labelClass}>Etapa</p>
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
              </div>
              <div className="flex-1">
                <p className={labelClass}>Nivel</p>
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
              </div>
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {totalCount} resultado{totalCount !== 1 ? "s" : ""}
            </span>
            <span className="text-xs text-gray-300">·</span>
            <span className="text-xs font-medium text-gray-600">
              {formatAmount(totalAmount, displayCurrency)}
            </span>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between my-4 px-1">
          <span className="text-sm text-gray-400">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      <ExpenseTable
        expenses={expenses}
        onDelete={handleDelete}
        deletingId={deletingId}
        workspaceSlug={slug}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <span className="text-sm text-gray-400">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
