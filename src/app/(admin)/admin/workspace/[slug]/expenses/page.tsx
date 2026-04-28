"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import DeleteButton from "@/components/DeleteButton";
import { INPUT_CLASS } from "@/constants";
import FormSection from "@/components/FormSection";
import FormInnerSection from "@/components/FormInnerSection";

// ── Types ────────────────────────────────────────────────────────────────────
type Expense = {
  id: string;
  provider: { id: string; name: string } | null;
  invoice_series: string | null;
  invoice_number: string | null;
  amount: number;
  currency: string;
  issued_at: string | null;
  paid_at: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  category: { id: string; name: string; color: string | null } | null;
};

// ── Fetcher ───────────────────────────────────────────────────────────────────
async function fetchExpenses(workspaceId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expense")
    .select(
      `
      id, invoice_series, invoice_number, amount, currency,
      issued_at, paid_at, payment_method, notes, created_at,
      provider:provider_id(id, name),
      category:category_id(id, name, color)
    `,
    )
    .eq("workspace_id", workspaceId)
    .order("paid_at", { ascending: false });

  if (error) throw error;
  return (data as unknown as Expense[]) ?? [];
}

async function fetchWorkspace(slug: string): Promise<{ id: string; name: string }> {
  const { data, error } = await supabase
    .from("workspace")
    .select("id, name")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  return data;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const CURRENCY_SYMBOL: Record<string, string> = { PEN: "S/", USD: "$", EUR: "€" };

function formatAmount(amount: number, currency: string) {
  const sym = CURRENCY_SYMBOL[currency] ?? currency;
  return `${sym} ${(amount / 100).toFixed(2)}`;
}

function CategoryBadge({ category }: { category: Expense["category"] }) {
  if (!category) return <span className="text-sm text-gray-400">—</span>;
  const color = category.color ?? "#06b6d4";
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-semibold"
      style={{ background: `${color}18`, color }}
    >
      {category.name}
    </span>
  );
}

// ── Summary cards ─────────────────────────────────────────────────────────────
function SummaryCards({ expenses }: { expenses: Expense[] }) {
  const byCurrency: Record<string, number> = {};
  for (const e of expenses) {
    byCurrency[e.currency] = (byCurrency[e.currency] ?? 0) + e.amount;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-8">
      <FormInnerSection>
        <p className="text-sm font-bold uppercase tracking-widest mb-1">Total gastos</p>
        <p className="text-3xl font-bold">{expenses.length}</p>
      </FormInnerSection>
      {Object.entries(byCurrency).map(([currency, total]) => (
        <div key={currency}>
          <FormInnerSection>
            <p className="text-sm font-bold uppercase tracking-widest mb-1">{currency}</p>
            <p className="text-3xl font-bold text-purple-800">{formatAmount(total, currency)}</p>
          </FormInnerSection>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const params = useParams();
  const workspaceSlug = params.slug as string;
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [filterCurrency, setFilterCurrency] = useState("");

  const { data: workspace } = useSWR(
    workspaceSlug ? ["workspace", workspaceSlug] : null,
    ([, slug]) => fetchWorkspace(slug),
  );
  const workspaceId = workspace?.id ?? "";

  const {
    data: expenses = [],
    isLoading,
    error,
  } = useSWR(workspaceId ? ["expenses", workspaceId] : null, ([, wid]) => fetchExpenses(wid));

  const currencies = [...new Set(expenses.map((e) => e.currency))];

  console.log("workspaceId:", workspaceId);
  console.log({ expenses, currencies });
  console.log({ workspaceId, expenses });

  const filtered = expenses.filter((e) => {
    const providerName = e.provider?.name ?? "";
    const invoiceRef = [e.invoice_series, e.invoice_number].filter(Boolean).join("-");
    const matchSearch =
      !search ||
      providerName.toLowerCase().includes(search.toLowerCase()) ||
      invoiceRef.toLowerCase().includes(search.toLowerCase()) ||
      e.notes?.toLowerCase().includes(search.toLowerCase()) ||
      e.category?.name.toLowerCase().includes(search.toLowerCase()) ||
      e.payment_method?.toLowerCase().includes(search.toLowerCase());
    const matchCurrency = !filterCurrency || e.currency === filterCurrency;
    return matchSearch && matchCurrency;
  });

  async function handleDelete(expenseId: string) {
    // 1. Fetch attachment paths before deleting anything
    const { data: attachments } = await supabase
      .from("expense_attachment")
      .select("storage_path")
      .eq("expense_id", expenseId);

    // 2. Clean up R2 objects first
    if (attachments?.length) {
      await Promise.all(
        attachments.map((a) => fetch(`/api/r2/${a.storage_path}`, { method: "DELETE" })),
      );
    }

    // 3. Delete expense row (CASCADE removes attachment rows)
    const { error } = await supabase.from("expense").delete().eq("id", expenseId);
    if (error) throw error;

    await mutate(["expenses", workspaceId]);
  }

  return (
    <div className="min-h-screen text-gray-900">
      {/* Nav */}
      <nav className="top-0 z-10">
        <div className="py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={() => router.push(`/admin/workspace/${workspaceSlug}`)}
              className="text-gray-500 hover:text-cyan-600 transition-colors px-2 py-1 rounded-md hover:bg-purple-50"
            >
              {workspace?.name ?? "Workspace"}
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 font-medium px-2 py-1">Gastos</span>
          </div>
          <Link href={`/admin/workspace/${workspaceSlug}/upload-expense`}>
            <button
              className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-lg transition-all"
              style={{
                background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
                boxShadow: "0 2px 8px rgba(6,182,212,0.25)",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nuevo gasto
            </button>
          </Link>
        </div>
      </nav>
      <FormSection>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gastos</h1>
          <p className="text-sm text-gray-600 mt-1">
            Todos los gastos registrados en este workspace.
          </p>
        </div>

        {/* Summary */}
        {!isLoading && expenses.length > 0 && <SummaryCards expenses={expenses} />}

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por proveedor, categoría, factura..."
            className={INPUT_CLASS}
          />
          {currencies.length > 1 && (
            <select
              value={filterCurrency}
              onChange={(e) => setFilterCurrency(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700
                         focus:outline-none focus:border-cyan-500 shadow-sm cursor-pointer appearance-none"
            >
              <option value="">Todas las monedas</option>
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-24 text-gray-400 text-sm gap-2">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeOpacity="0.25"
              />
              <path
                d="M12 2a10 10 0 0 1 10 10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            Cargando gastos...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 border border-red-200 bg-red-50 rounded-lg px-4 py-3 text-sm text-red-600">
            Error al cargar los gastos. Intenta recargar la página.
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && expenses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 flex items-center justify-center mb-4">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="text-gray-700 font-semibold text-base">Sin gastos aún</p>
            <p className="text-gray-400 text-sm mt-1 mb-5">
              Registra tu primer gasto para verlo aquí.
            </p>
            <Link href={`/admin/workspace/${workspaceSlug}/upload-expense`}>
              <button
                className="flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-lg"
                style={{ background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)" }}
              >
                + Nuevo gasto
              </button>
            </Link>
          </div>
        )}

        {/* No search results */}
        {!isLoading && expenses.length > 0 && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">
            Ningún gasto coincide con {search}
          </div>
        )}

        {/* Table */}
        {!isLoading && filtered.length > 0 && (
          <FormInnerSection>
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-5 border-b border-gray-100 bg-slate-50 rounded-lg">
              {["Proveedor / Factura", "Categoría", "Método", "Fecha", "Monto"].map((h) => (
                <span
                  key={h}
                  className="text-xs font-semibold text-navy-800 uppercase tracking-widest"
                >
                  {h}
                </span>
              ))}
            </div>
            {filtered.map((expense, i) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                isLast={i === filtered.length - 1}
                workspaceSlug={workspaceSlug}
                onDelete={handleDelete}
              />
            ))}
          </FormInnerSection>
        )}
      </FormSection>
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────
function ExpenseRow({
  expense,
  isLast,
  workspaceSlug,
  onDelete,
}: {
  expense: Expense;
  isLast: boolean;
  workspaceSlug: string;
  onDelete: (id: string) => Promise<void>;
}) {
  const [hovered, setHovered] = useState(false);

  const invoiceRef = [expense.invoice_series, expense.invoice_number].filter(Boolean).join("-");

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`grid rounded-lg grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5 transition-colors
        ${!isLast ? "border-b border-gray-100" : ""}
        ${hovered ? "bg-purple-50" : "bg-white"}`}
    >
      <Link href={`/admin/workspace/${workspaceSlug}/expenses/${expense.id}`} className="contents">
        <div className="min-w-0 cursor-pointer">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {expense.provider?.name ?? (
              <span className="text-gray-400 font-normal">Sin proveedor</span>
            )}
          </p>
          {invoiceRef ? (
            <p className="text-sm text-gray-400 truncate mt-0.5 font-mono">{invoiceRef}</p>
          ) : expense.notes ? (
            <p className="text-xs text-gray-400 truncate mt-0.5">{expense.notes}</p>
          ) : null}
        </div>
        <div className="flex justify-start cursor-pointer">
          <CategoryBadge category={expense.category} />
        </div>

        {/* Payment method */}
        <p className="text-sm text-gray-500 whitespace-nowrap cursor-pointer">
          {expense.payment_method ?? "—"}
        </p>

        {/* Dates */}
        <div className="text-right cursor-pointer">
          <p className="text-sm font-medium text-gray-800 whitespace-nowrap">
            {format(new Date(expense.paid_at), "d MMM yyyy", { locale: es })}
          </p>
          {expense.issued_at && expense.issued_at !== expense.paid_at ? (
            <p className="text-sm text-gray-400 whitespace-nowrap">
              emitido {format(new Date(expense.issued_at), "d MMM", { locale: es })}
            </p>
          ) : (
            <p className="text-sm text-gray-400 whitespace-nowrap">
              {formatDistanceToNow(new Date(expense.created_at), { addSuffix: true, locale: es })}
            </p>
          )}
        </div>

        {/* Amount */}
        <p className="text-sm font-bold text-gray-900 whitespace-nowrap text-right cursor-pointer">
          {formatAmount(expense.amount, expense.currency)}
        </p>
      </Link>

      {/* Delete */}
      <div onClick={(e) => e.stopPropagation()}>
        <DeleteButton
          onClick={() => onDelete(expense.id)}
          title="Eliminar gasto"
          confirmTitle="¿Eliminar gasto?"
          confirmDescription={`Se eliminará "${expense.provider?.name ?? "este gasto"}" de forma permanente.`}
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
        />
      </div>
    </div>
  );
}
