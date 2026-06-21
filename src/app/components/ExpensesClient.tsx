"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import ExpenseTable from "@/components/ExpenseTable";
import { supabase } from "@/lib/supabase";
import { PRIMARY_BUTTON_CLASS } from "@/constants";
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
  paidFrom: string;
  paidTo: string;
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

const fetchExpenses = async (
  workspaceId: string,
  page: number,
  search: string,
  filters: Filters,
): Promise<FetchResult> => {
  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // Resolve provider IDs for search once, used in both queries
  let providerIds: string[] = [];
  if (search.trim()) {
    const { data: matchingProviders } = await supabase
      .from("provider")
      .select("id")
      .eq("workspace_id", workspaceId)
      .ilike("name", `%${search.trim()}%`);
    providerIds = matchingProviders?.map((p) => p.id) ?? [];
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
      `id, invoice_series, invoice_number, amount, currency,
       issued_at, paid_at, payment_method, notes, created_at,
       provider:provider_id(id, name),
       category:category_id(id, name, color)`,
      { count: "exact" },
    )
    .eq("workspace_id", workspaceId)
    .order("paid_at", { ascending: false })
    .range(from, to);

  let amountsQuery = supabase
    .from("expense")
    .select("amount")
    .eq("workspace_id", workspaceId);

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
  if (filters.paidFrom) {
    query = query.gte("paid_at", filters.paidFrom);
    amountsQuery = amountsQuery.gte("paid_at", filters.paidFrom);
  }
  if (filters.paidTo) {
    query = query.lte("paid_at", filters.paidTo);
    amountsQuery = amountsQuery.lte("paid_at", filters.paidTo);
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
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"` : s;
};

const exportExpensesCsv = async (
  workspaceId: string,
  search: string,
  filters: Filters,
) => {
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
    if (filters.paidFrom) query = query.gte("paid_at", filters.paidFrom);
    if (filters.paidTo) query = query.lte("paid_at", filters.paidTo);
    if (filters.issuedFrom) query = query.gte("issued_at", filters.issuedFrom);
    if (filters.issuedTo) query = query.lte("issued_at", filters.issuedTo);
    if (filters.amountMin) query = query.gte("amount", Math.round(parseFloat(filters.amountMin) * 100));
    if (filters.amountMax) query = query.lte("amount", Math.round(parseFloat(filters.amountMax) * 100));

    const { data } = await query;
    if (!data || data.length === 0) break;
    all.push(...(data as unknown as ExpenseRow[]));
    if (data.length < size) break;
    page++;
  }

  let csv = "﻿";
  csv += "Mes,Fecha Pago,Fecha Emisión,Serie,Numero,Proveedor,RUC,Categoria,Metodo Pago,Monto,Moneda,Notas\n";

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
      csv += [
        csvEscape(month), csvEscape(fmtDate(e.paid_at)), csvEscape(fmtDate(e.issued_at)),
        csvEscape(e.invoice_series), csvEscape(e.invoice_number),
        csvEscape(prov?.name), csvEscape((prov as { ruc?: string })?.ruc),
        csvEscape(cat?.name), csvEscape(e.payment_method),
        csvEscape((e.amount / 100).toFixed(2)), csvEscape(e.currency),
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
  paidFrom: "",
  paidTo: "",
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
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [localCategories, setLocalCategories] = useState(categories);
  const { setModalContent, setModalOpen } = useGlobalState();

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

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setSearch("");
    setPage(1);
  }

  const hasActiveFilters = debouncedSearch || Object.values(filters).some((v) => v !== "");

  const { data, error, mutate } = useSWR(
    ["expenses", workspace.id, page, debouncedSearch, filters],
    () => fetchExpenses(workspace.id, page, debouncedSearch, filters),
    {
      fallbackData:
        page === 1 && !debouncedSearch && !Object.values(filters).some((v) => v !== "")
          ? ({ data: initialExpenses, count: initialCount, totalAmount: initialTotalAmount } as FetchResult)
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

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition";
  const labelClass = "block text-[11px] font-medium text-gray-400 mb-1";

  return (
    <>
      <div>
        <BackLink href="/admin/workspaces">Workspaces</BackLink>
        <TitleWrapper>
          <PageTitle>
            Gastos
            <span className="text-gray-400 font-normal ml-2">— {workspace.name}</span>
          </PageTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              {totalCount} registro{totalCount !== 1 ? "s" : ""}
            </span>
            <span className="text-gray-200">·</span>
            <span className="text-sm font-medium text-gray-700">
              {formatAmount(totalAmount, displayCurrency)}
            </span>
          </div>
          <Link
            href={`/admin/workspaces/${slug}/upload-expense`}
            className={`${PRIMARY_BUTTON_CLASS} mt-8`}
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
        </TitleWrapper>

        {/* Buscador + Categorías */}
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por referencia, proveedor o notas..."
            className={`${inputClass} flex-1`}
          />
          <button
            type="button"
            onClick={openCategoriesModal}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:border-purple-300 hover:text-purple-600 transition flex-shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Categorias
          </button>
        </div>

        {/* Filtros */}
        <div className="mb-4 grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <p className={labelClass}>Pago desde</p>
            <input
              type="date"
              value={filters.paidFrom}
              onChange={(e) => setFilter("paidFrom", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <p className={labelClass}>Pago hasta</p>
            <input
              type="date"
              value={filters.paidTo}
              onChange={(e) => setFilter("paidTo", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <p className={labelClass}>Emisión desde</p>
            <input
              type="date"
              value={filters.issuedFrom}
              onChange={(e) => setFilter("issuedFrom", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <p className={labelClass}>Emisión hasta</p>
            <input
              type="date"
              value={filters.issuedTo}
              onChange={(e) => setFilter("issuedTo", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <p className={labelClass}>Monto mín.</p>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={filters.amountMin}
              onChange={(e) => setFilter("amountMin", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <p className={labelClass}>Monto máx.</p>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={filters.amountMax}
              onChange={(e) => setFilter("amountMax", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <p className={labelClass}>Categoría</p>
            <CategoryFilter
              categories={localCategories}
              value={filters.categoryId}
              onChange={(id) => setFilter("categoryId", id)}
            />
          </div>
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <p className={labelClass}>Proveedor</p>
            <ProviderFilter
              providers={providers}
              value={filters.providerId}
              onChange={(id) => setFilter("providerId", id)}
            />
          </div>
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <p className={labelClass}>Etapa</p>
            <select
              value={filters.stageId}
              onChange={(e) => setFilter("stageId", e.target.value)}
              className={inputClass}
            >
              <option value="">Todas las etapas</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <p className={labelClass}>Nivel</p>
            <select
              value={filters.levelId}
              onChange={(e) => setFilter("levelId", e.target.value)}
              className={inputClass}
            >
              <option value="">Todos los niveles</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-3 flex items-center gap-2">
          {hasActiveFilters && (
            <>
              <span className="text-xs text-gray-400">
                {totalCount} resultado{totalCount !== 1 ? "s" : ""}
              </span>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs font-medium text-gray-600">
                {formatAmount(totalAmount, displayCurrency)}
              </span>
              <button
                onClick={clearFilters}
                className="text-xs text-purple-500 hover:text-purple-700 underline underline-offset-2 transition"
              >
                Limpiar filtros
              </button>
            </>
          )}
          <button
            onClick={() => exportExpensesCsv(workspace.id, debouncedSearch, filters)}
            className="text-xs text-purple-500 hover:text-purple-700 underline underline-offset-2 transition"
          >
            Export CSV
          </button>
        </div>
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
