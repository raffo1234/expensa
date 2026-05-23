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

// ── Constants ─────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 10;

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = { id: string; name: string; color: string | null };

interface Props {
  slug: string;
  workspace: Workspace;
  initialExpenses: Expense[];
  initialCount: number;
  categories: Category[];
}

interface FetchResult {
  data: Expense[];
  count: number;
}

type Filters = {
  paidFrom: string;
  paidTo: string;
  issuedFrom: string;
  issuedTo: string;
  amountMin: string;
  amountMax: string;
  categoryId: string;
};

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

  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);

  if (search.trim()) {
    const { data: matchingProviders } = await supabase
      .from("provider")
      .select("id")
      .eq("workspace_id", workspaceId)
      .ilike("name", `%${search.trim()}%`);

    const providerIds = matchingProviders?.map((p) => p.id) ?? [];

    const orClauses = [
      `invoice_series.ilike.%${search.trim()}%`,
      `invoice_number.ilike.%${search.trim()}%`,
      `notes.ilike.%${search.trim()}%`,
    ];

    if (providerIds.length > 0) {
      orClauses.push(`provider_id.in.(${providerIds.join(",")})`);
    }

    query = query.or(orClauses.join(","));
  }

  if (filters.paidFrom) query = query.gte("paid_at", filters.paidFrom);
  if (filters.paidTo) query = query.lte("paid_at", filters.paidTo);
  if (filters.issuedFrom) query = query.gte("issued_at", filters.issuedFrom);
  if (filters.issuedTo) query = query.lte("issued_at", filters.issuedTo);
  if (filters.amountMin)
    query = query.gte("amount", Math.round(parseFloat(filters.amountMin) * 100));
  if (filters.amountMax)
    query = query.lte("amount", Math.round(parseFloat(filters.amountMax) * 100));

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data: ((data as unknown as ExpenseRow[]) ?? []).map(mapExpenseRow),
    count: count ?? 0,
  };
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
};

export default function ExpensesClient({
  slug,
  workspace,
  initialExpenses,
  initialCount,
  categories,
}: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
          ? { data: initialExpenses, count: initialCount }
          : undefined,
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );

  const expenses = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

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

        {/* Buscador */}
        <div className="mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por referencia, proveedor o notas..."
            className={inputClass}
          />
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
              categories={categories}
              value={filters.categoryId}
              onChange={(id) => setFilter("categoryId", id)}
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {totalCount} resultado{totalCount !== 1 ? "s" : ""}
            </span>
            <button
              onClick={clearFilters}
              className="text-xs text-purple-500 hover:text-purple-700 underline underline-offset-2 transition"
            >
              Limpiar filtros
            </button>
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
