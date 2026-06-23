"use client";

import { useRef, useState } from "react";
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
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import OptionButton from "./OptionButton";
import { Popover } from "react-tiny-popover";

const PAGE_SIZE = 10;
type SummaryTab = "facturas" | "gastos";

function InputWithTooltip({ label, children }: { label: string; children: React.ReactElement }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Popover
      isOpen={hovered}
      positions={["top", "bottom"]}
      padding={8}
      content={
        <div className="pointer-events-none font-semibold text-white px-3 py-2 bg-slate-800 rounded-lg text-sm">
          {label}
        </div>
      }
    >
      <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        {children}
      </div>
    </Popover>
  );
}

type Workspace = { id: string; name: string; slug: string };
type Attachment = { id: string; file_name: string | null; storage_path: string };
type SummaryExpense = {
  id: string;
  invoice_series?: string | null;
  invoice_number?: string | null;
  amount: number;
  currency: string;
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

const fetcher = async ([, workspaceId, page, search, dateFrom, dateTo, tab]: [
  string,
  string,
  number,
  string,
  string,
  string,
  SummaryTab,
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
      `id, invoice_series, invoice_number, amount, currency, paid_at, payment_method, notes,
       provider:provider_id(id, name, ruc),
       category:category_id(id, name, color),
       expense_attachment(id, file_name, storage_path)`,
      { count: "exact" },
    )
    .eq("workspace_id", workspaceId)
    .order("paid_at", { ascending: false })
    .range(from, to);

  query = applyTabFilter(query, tab);

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

const exportCsv = async (
  workspaceId: string,
  search: string,
  dateFrom: string,
  dateTo: string,
  tab: SummaryTab,
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

    if (orClause) query = query.or(orClause);
    if (dateFrom) query = query.gte("issued_at", dateFrom);
    if (dateTo) query = query.lte("issued_at", dateTo);

    const { data } = await query;
    if (!data || data.length === 0) break;
    all.push(...(data as SummaryExpense[]));
    if (data.length < size) break;
    page++;
  }

  const prov = (e: SummaryExpense) => (Array.isArray(e.provider) ? e.provider[0] : e.provider);
  const cat = (e: SummaryExpense) => (Array.isArray(e.category) ? e.category[0] : e.category);

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

const formatDate = (val?: string | null) =>
  val
    ? new Date(val).toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

const STORAGE_TAB = "summary-tab";
const STORAGE_WS = "summary-workspace";

function readStorage(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

export default function SummaryClient({ workspaces }: { workspaces: Workspace[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tab = ((): SummaryTab => {
    const fromUrl = searchParams.get("tab");
    if (fromUrl === "gastos" || fromUrl === "facturas") return fromUrl;
    const stored = readStorage(STORAGE_TAB);
    return stored === "gastos" ? "gastos" : "facturas";
  })();

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const setTab = (t: SummaryTab) => {
    localStorage.setItem(STORAGE_TAB, t);
    setParam("tab", t);
  };

  const [workspaceId, setWorkspaceId] = useState(() => {
    const stored = readStorage(STORAGE_WS);
    if (stored && workspaces.some((w) => w.id === stored)) return stored;
    return workspaces[0]?.id ?? "";
  });

  const handleWorkspaceChange = (id: string) => {
    setWorkspaceId(id);
    localStorage.setItem(STORAGE_WS, id);
    setPage(0);
  };
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [month, setMonth] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const hasFilters = !!search || !!dateFrom || !!dateTo || !!month;

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
    setPage(0);
    if (searchInputRef.current) searchInputRef.current.value = "";
  };

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, 350);

  const { data, isLoading } = useSWR(
    workspaceId ? ["summary", workspaceId, page, search, dateFrom, dateTo, tab] : null,
    fetcher,
  );

  const expenses = data?.data ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <OptionButton isActive={tab === "facturas"} onClick={() => setTab("facturas")}>
          Facturas
        </OptionButton>
        <OptionButton isActive={tab === "gastos"} onClick={() => setTab("gastos")}>
          Gastos
        </OptionButton>
      </div>
      <div className="flex gap-2 items-center justify-between">
        <div className="relative max-w-xs">
          <select
            value={workspaceId}
            onChange={(e) => handleWorkspaceChange(e.target.value)}
            className={SELECT_CLASS + " pr-10"}
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
        <button
          onClick={() => exportCsv(workspaceId, search, dateFrom, dateTo, tab)}
          disabled={!workspaceId}
          className={PRIMARY_BUTTON_CLASS}
        >
          <Icon icon="solar:download-linear" fontSize={ICON_SIZE} />
          Export CSV
        </button>
      </div>
      <div className="flex gap-2 items-center">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search invoice, provider, notes..."
          onChange={(e) => debouncedSearch(e.target.value)}
          className={INPUT_CLASS}
        />
        <button onClick={clearFilters} disabled={!hasFilters} className={SECONDARY_BUTTON_CLASS}>
          Clear filters
        </button>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2 items-center border border-gray-200 rounded-xl px-2 py-1.5 bg-gray-50/50">
          <span className="text-sm font-medium text-gray-400 pl-1">Emisión</span>
          <InputWithTooltip label="Mes de emisión">
            <input
              type="month"
              value={month}
              onChange={(e) => handleMonthChange(e.target.value)}
              className={INPUT_CLASS}
            />
          </InputWithTooltip>
          <InputWithTooltip label="Emisión desde">
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
          <InputWithTooltip label="Emisión hasta">
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
              <th className="p-6">Serie</th>
              <th className="p-6">Number</th>
              <th className="p-6">Proveedor</th>
              <th className="p-6">Categoría</th>
              <th className="p-6">Método de pago</th>
              <th className="p-6 text-right">Monto</th>
              <th className="p-6">Adjuntos</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: PAGE_SIZE }, (_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {Array.from({ length: 8 }, (_, j) => (
                    <td key={j} className="p-6">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-gray-400">
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

                const href = `/admin/summary/${expense.id}`;

                return (
                  <tr
                    key={expense.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="whitespace-nowrap">
                      <Link href={href} target="_blank" className="block p-6">
                        {formatDate(expense.paid_at)}
                      </Link>
                    </td>
                    <td className="font-mono text-sm">
                      <Link href={href} target="_blank" className="block p-6">
                        {expense.invoice_series ?? "—"}
                      </Link>
                    </td>
                    <td className="font-mono text-sm">
                      <Link href={href} target="_blank" className="block p-6">
                        {expense.invoice_number ?? "—"}
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
                    <td className="text-right font-medium whitespace-nowrap">
                      <Link href={href} target="_blank" className="block p-6">
                        {expense.amount != null
                          ? formatAmount(expense.amount, expense.currency)
                          : "—"}
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
