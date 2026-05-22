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

// ── Constants ─────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 10;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  slug: string;
  workspace: Workspace;
  initialExpenses: Expense[];
  initialCount: number;
}

interface FetchResult {
  data: Expense[];
  count: number;
}

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

  if (search.trim()) {
    query = query.or(
      `invoice_series.ilike.%${search.trim()}%,invoice_number.ilike.%${search.trim()}%,notes.ilike.%${search.trim()}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data: ((data as unknown as ExpenseRow[]) ?? []).map(mapExpenseRow),
    count: count ?? 0,
  };
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExpensesClient({ slug, workspace, initialExpenses, initialCount }: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, error, mutate } = useSWR(
    ["expenses", workspace.id, page, debouncedSearch],
    () => fetchExpenses(workspace.id, page, debouncedSearch),
    {
      fallbackData:
        page === 1 && !debouncedSearch ? { data: initialExpenses, count: initialCount } : undefined,
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
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por referencia o notas..."
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition"
          />
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

      {/* Paginador */}
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
