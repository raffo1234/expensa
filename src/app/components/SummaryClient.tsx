"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { useDebouncedCallback } from "use-debounce";
import { Icon } from "@iconify/react/dist/iconify.js";
import { ICON_SIZE } from "@/constants";
import { formatAmount } from "@/utils/formatAmount";
import getAttachmentUrl from "@/lib/getAttachmentUrl";

const PAGE_SIZE = 10;

type Workspace = { id: string; name: string; slug: string };
type Attachment = { id: string; file_name: string | null; storage_path: string };
type SummaryExpense = {
  id: string;
  invoice_series?: string | null;
  invoice_number?: string | null;
  amount: number;
  currency: string;
  paid_at?: string | null;
  notes?: string | null;
  provider?: { id: string; name: string } | { id: string; name: string }[] | null;
  category?:
    | { id: string; name: string; color?: string | null }
    | { id: string; name: string; color?: string | null }[]
    | null;
  expense_attachment?: Attachment[];
};

const fetcher = async ([, workspaceId, page, search, dateFrom, dateTo]: [
  string,
  string,
  number,
  string,
  string,
  string,
]) => {
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
      `id, invoice_series, invoice_number, amount, currency, paid_at, notes,
       provider:provider_id(id, name),
       category:category_id(id, name, color),
       expense_attachment(id, file_name, storage_path)`,
      { count: "exact" },
    )
    .eq("workspace_id", workspaceId)
    .order("paid_at", { ascending: false })
    .range(from, to);

  if (orClause) query = query.or(orClause);
  if (dateFrom) query = query.gte("paid_at", dateFrom);
  if (dateTo) query = query.lte("paid_at", dateTo);

  const { data, count, error } = await query;
  if (error) throw error;
  return { data: (data ?? []) as SummaryExpense[], count: count ?? 0 };
};

const formatDate = (val?: string | null) =>
  val
    ? new Date(val).toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

export default function SummaryClient({ workspaces }: { workspaces: Workspace[] }) {
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const hasFilters = !!search || !!dateFrom || !!dateTo;

  const clearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setPage(0);
    if (searchInputRef.current) searchInputRef.current.value = "";
  };

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, 350);

  const { data, isLoading } = useSWR(
    workspaceId ? ["summary", workspaceId, page, search, dateFrom, dateTo] : null,
    fetcher,
  );

  const expenses = data?.data ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-xs">
        <select
          value={workspaceId}
          onChange={(e) => {
            setWorkspaceId(e.target.value);
            setPage(0);
          }}
          className="w-full appearance-none px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 bg-white pr-8"
        >
          {workspaces.map((ws) => (
            <option key={ws.id} value={ws.id}>
              {ws.name}
            </option>
          ))}
        </select>
        <div className="absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none">
          <Icon icon="solar:alt-arrow-down-linear" fontSize={16} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search invoice, provider, notes..."
          onChange={(e) => debouncedSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 bg-white"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(0);
          }}
          className="rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 bg-white"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(0);
          }}
          className="rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 bg-white"
        />
        <button
          onClick={clearFilters}
          disabled={!hasFilters}
          className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          Clear filters
        </button>
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

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 border-gray-200 text-left text-xs uppercase text-gray-800">
              <th className="p-6">Fecha pago</th>
              <th className="p-6">Factura</th>
              <th className="p-6">Proveedor</th>
              <th className="p-6">Categoría</th>
              <th className="p-6 text-right">Monto</th>
              <th className="p-6">Adjuntos</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: PAGE_SIZE }, (_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {Array.from({ length: 6 }, (_, j) => (
                    <td key={j} className="p-6">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                  No expenses found
                </td>
              </tr>
            ) : (
              expenses.map((expense) => {
                const prov = Array.isArray(expense.provider)
                  ? expense.provider[0]
                  : expense.provider;
                const cat = Array.isArray(expense.category)
                  ? expense.category[0]
                  : expense.category;
                const invoiceRef =
                  expense.invoice_series && expense.invoice_number
                    ? `${expense.invoice_series}-${expense.invoice_number}`
                    : expense.invoice_series || expense.invoice_number || "—";

                return (
                  <tr
                    key={expense.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="p-6 whitespace-nowrap">{formatDate(expense.paid_at)}</td>
                    <td className="p-6 font-mono text-sm">{invoiceRef}</td>
                    <td className="p-6">{prov?.name ?? "—"}</td>
                    <td className="p-6">
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
                    </td>
                    <td className="p-6 text-right font-medium whitespace-nowrap">
                      {expense.amount != null
                        ? formatAmount(expense.amount, expense.currency)
                        : "—"}
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
                            <Icon icon="solar:file-download-linear" fontSize={24} />
                            <span className="max-w-[80px] truncate">{att.file_name ?? "file"}</span>
                          </a>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
