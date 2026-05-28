"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { getFiltersData, getDashboardData, getWorkspaceTotal } from "@/actions/dashboard";
import type {
  Workspace,
  Stage,
  Level,
  DashboardData,
  TrendPoint,
  CategoryRow,
  ProviderRow,
  KpiRow,
  RecentRow,
  WorkspaceTotal,
} from "@/actions/dashboard";

// ─── Utilities ────────────────────────────────────────────────────────────────

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const CURRENCY_COLOR: Record<string, string> = {
  PEN: "#f59e0b",
  USD: "#60a5fa",
  EUR: "#a78bfa",
};

const getCurrencyColor = (c: string) => CURRENCY_COLOR[c] ?? "#94a3b8";
const getCurrencySymbol = (c: string) => (c === "USD" ? "$" : c === "EUR" ? "€" : "S/");

const fmtAmount = (centavos: number) =>
  (centavos / 100).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtCompact = (centavos: number) => {
  const n = centavos / 100;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
};

// ─── Tooltip types ────────────────────────────────────────────────────────────
// recharts omits `payload` and `label` from the public TooltipProps type.
// We define our own content-renderer interface instead.

interface TooltipItem<TData = Record<string, unknown>> {
  dataKey?: string | number;
  value?: number;
  stroke?: string;
  fill?: string;
  payload?: TData;
}

interface ChartTooltipProps<TData = Record<string, unknown>> {
  active?: boolean;
  payload?: TooltipItem<TData>[];
  label?: string | number;
}

// ─── Spinner / Empty ──────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center h-full min-h-[120px]">
      <div className="w-6 h-6 border-2 border-zinc-600 border-t-amber-400 rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[120px] gap-2">
      <div className="text-zinc-600 text-3xl">—</div>
      <p className="text-zinc-500 text-sm">{message}</p>
    </div>
  );
}

// ─── Historical Total Banner ──────────────────────────────────────────────────

function HistoricalBanner({ totals, loading }: { totals: WorkspaceTotal[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="border-b border-zinc-800/60 bg-zinc-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex gap-6">
          {[80, 64].map((w) => (
            <div key={w} className={`h-4 w-${w} bg-zinc-800 rounded animate-pulse`} />
          ))}
        </div>
      </div>
    );
  }

  if (totals.length === 0) return null;

  return (
    <div className="border-b border-zinc-800/60 bg-zinc-900/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-1">
        <span className="text-zinc-600 text-xs uppercase tracking-widest font-medium shrink-0">
          Acumulado total
        </span>
        {totals.map((t) => (
          <div key={t.currency} className="flex items-baseline gap-1.5">
            <span className="text-xs font-semibold" style={{ color: getCurrencyColor(t.currency) }}>
              {getCurrencySymbol(t.currency)}
            </span>
            <span className="text-zinc-200 font-mono text-sm font-semibold">
              {fmtAmount(t.total)}
            </span>
            <span className="text-zinc-600 text-xs">{t.currency}</span>
            <span className="text-zinc-700 text-xs">· {t.count.toLocaleString()} fact.</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ kpi }: { kpi: KpiRow }) {
  const color = getCurrencyColor(kpi.currency);
  const symbol = getCurrencySymbol(kpi.currency);
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold tracking-widest uppercase px-2 py-0.5 rounded"
          style={{ color, backgroundColor: `${color}18` }}
        >
          {kpi.currency}
        </span>
        <span className="text-zinc-500 text-xs">{kpi.count} facturas</span>
      </div>
      <div>
        <p className="text-zinc-400 text-xs mb-1">Total gastado</p>
        <p className="text-2xl font-bold text-white font-mono tracking-tight">
          <span className="text-sm mr-1" style={{ color }}>
            {symbol}
          </span>
          {fmtAmount(kpi.total)}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
        <div>
          <p className="text-zinc-500 text-xs mb-0.5">Promedio</p>
          <p className="text-zinc-200 text-sm font-mono">
            {symbol}
            {fmtCompact(kpi.average)}
          </p>
        </div>
        <div>
          <p className="text-zinc-500 text-xs mb-0.5">Máximo</p>
          <p className="text-zinc-200 text-sm font-mono">
            {symbol}
            {fmtCompact(kpi.max)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Trend Chart ──────────────────────────────────────────────────────────────

function TrendTooltip({ active, payload, label }: ChartTooltipProps<TrendPoint>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-zinc-400 text-xs mb-1">Día {label}</p>
      {payload.map((p) => {
        const key = String(p.dataKey);
        return (
          <p key={key} className="text-sm font-mono" style={{ color: p.stroke }}>
            {getCurrencySymbol(key)}
            {fmtAmount(p.value ?? 0)}
          </p>
        );
      })}
    </div>
  );
}

function TrendChart({
  trend,
  currencies,
  loading,
}: {
  trend: TrendPoint[];
  currencies: string[];
  loading: boolean;
}) {
  if (loading) return <Spinner />;
  if (trend.length === 0) return <EmptyState message="Sin gastos este mes" />;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          {currencies.map((cur) => (
            <linearGradient key={cur} id={`grad-${cur}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={getCurrencyColor(cur)} stopOpacity={0.25} />
              <stop offset="95%" stopColor={getCurrencyColor(cur)} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => fmtCompact(v)}
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#3f3f46" }} />
        {currencies.map((cur) => (
          <Area
            key={cur}
            type="monotone"
            dataKey={cur}
            stroke={getCurrencyColor(cur)}
            strokeWidth={2}
            fill={`url(#grad-${cur})`}
            dot={false}
            activeDot={{ r: 4, fill: getCurrencyColor(cur) }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Category Chart ───────────────────────────────────────────────────────────

function CategoryTooltip({ active, payload }: ChartTooltipProps<CategoryRow>) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  if (!item) return null;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-zinc-300 text-sm">{item.name}</p>
      <p className="text-sm font-mono text-amber-400">
        {getCurrencySymbol(item.currency)}
        {fmtAmount(payload[0].value ?? 0)}
      </p>
    </div>
  );
}

function CategoryChart({ categories, loading }: { categories: CategoryRow[]; loading: boolean }) {
  if (loading) return <Spinner />;
  if (categories.length === 0) return <EmptyState message="Sin datos de categorías" />;

  const primary = categories[0]?.currency ?? "PEN";
  const filtered = categories.filter((c) => c.currency === primary).slice(0, 6);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={filtered}
        layout="vertical"
        margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
      >
        <XAxis
          type="number"
          tickFormatter={(v: number) => fmtCompact(v)}
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#a1a1aa", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={100}
        />
        <Tooltip content={<CategoryTooltip />} cursor={{ fill: "#27272a" }} />
        <Bar dataKey="total" radius={[0, 4, 4, 0]}>
          {filtered.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.color ?? getCurrencyColor(entry.currency)}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Provider Chart ───────────────────────────────────────────────────────────

function ProviderTooltip({ active, payload }: ChartTooltipProps<ProviderRow>) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  if (!item) return null;
  const color = getCurrencyColor(item.currency);
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-zinc-300 text-sm">{item.name}</p>
      <p className="text-sm font-mono" style={{ color }}>
        {getCurrencySymbol(item.currency)}
        {fmtAmount(payload[0].value ?? 0)}
      </p>
      <p className="text-zinc-500 text-xs">{item.count} facturas</p>
    </div>
  );
}

function ProviderChart({ providers, loading }: { providers: ProviderRow[]; loading: boolean }) {
  if (loading) return <Spinner />;
  if (providers.length === 0) return <EmptyState message="Sin datos de proveedores" />;

  const primary = providers[0]?.currency ?? "PEN";
  const filtered = providers.filter((p) => p.currency === primary).slice(0, 6);
  const color = getCurrencyColor(primary);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={filtered}
        layout="vertical"
        margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
      >
        <XAxis
          type="number"
          tickFormatter={(v: number) => fmtCompact(v)}
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#a1a1aa", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip content={<ProviderTooltip />} cursor={{ fill: "#27272a" }} />
        <Bar dataKey="total" fill={color} fillOpacity={0.8} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Recent Table ─────────────────────────────────────────────────────────────

function RecentTable({ rows, loading }: { rows: RecentRow[]; loading: boolean }) {
  if (loading) return <Spinner />;
  if (rows.length === 0) return <EmptyState message="Sin gastos registrados" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
            <th className="text-left py-3 px-2 font-medium">Fecha</th>
            <th className="text-left py-3 px-2 font-medium">Proveedor</th>
            <th className="text-left py-3 px-2 font-medium">Categoría</th>
            <th className="text-left py-3 px-2 font-medium hidden md:table-cell">Factura</th>
            <th className="text-left py-3 px-2 font-medium hidden lg:table-cell">Etapa</th>
            <th className="text-right py-3 px-2 font-medium">Monto</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
            >
              <td className="py-3 px-2 text-zinc-400 font-mono text-xs whitespace-nowrap">
                {new Date(row.paid_at).toLocaleDateString("es-PE", {
                  day: "2-digit",
                  month: "short",
                })}
              </td>
              <td className="py-3 px-2 text-zinc-200 max-w-[140px] truncate">
                {row.provider_name ?? <span className="text-zinc-600">—</span>}
              </td>
              <td className="py-3 px-2">
                {row.category_name ? (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: `${row.category_color ?? "#71717a"}22`,
                      color: row.category_color ?? "#a1a1aa",
                    }}
                  >
                    {row.category_name}
                  </span>
                ) : (
                  <span className="text-zinc-600">—</span>
                )}
              </td>
              <td className="py-3 px-2 text-zinc-400 font-mono text-xs hidden md:table-cell">
                {row.invoice_series && row.invoice_number
                  ? `${row.invoice_series}-${row.invoice_number}`
                  : (row.invoice_number ?? <span className="text-zinc-600">—</span>)}
              </td>
              <td className="py-3 px-2 hidden lg:table-cell">
                {row.stage_name ? (
                  <span className="text-xs text-zinc-400">{row.stage_name}</span>
                ) : (
                  <span className="text-zinc-600">—</span>
                )}
              </td>
              <td className="py-3 px-2 text-right font-mono font-semibold whitespace-nowrap">
                <span className="text-xs mr-0.5" style={{ color: getCurrencyColor(row.currency) }}>
                  {getCurrencySymbol(row.currency)}
                </span>
                <span className="text-zinc-100">{fmtAmount(row.amount)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Filter Select ────────────────────────────────────────────────────────────

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { id: string; name: string; color?: string | null }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors cursor-pointer"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  workspaces: Workspace[];
  defaultYear: number;
  defaultMonth: number;
}

export default function DashboardClient({ workspaces, defaultYear, defaultMonth }: Props) {
  const [workspaceId, setWorkspaceId] = useState<string>(workspaces[0]?.id ?? "");
  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);
  const [stageId, setStageId] = useState<string>("");
  const [levelId, setLevelId] = useState<string>("");

  const [stages, setStages] = useState<Stage[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [historicalTotals, setHistoricalTotals] = useState<WorkspaceTotal[]>([]);
  const [historicalLoading, setHistoricalLoading] = useState(false);

  const [isPending, startTransition] = useTransition();

  // When workspace changes: reload filters + historical totals
  useEffect(() => {
    if (!workspaceId) return;
    setStageId("");
    setLevelId("");
    setData(null);

    // Filters
    getFiltersData(workspaceId).then(({ stages: s, levels: l }) => {
      setStages(s);
      setLevels(l);
    });

    // Historical totals (all-time, no month filter)
    setHistoricalLoading(true);
    getWorkspaceTotal(workspaceId)
      .then(setHistoricalTotals)
      .finally(() => setHistoricalLoading(false));
  }, [workspaceId]);

  // When any filter changes: reload monthly data
  const loadData = useCallback(() => {
    if (!workspaceId) return;
    startTransition(async () => {
      const result = await getDashboardData(
        workspaceId,
        year,
        month,
        stageId || null,
        levelId || null,
      );
      setData(result);
    });
  }, [workspaceId, year, month, stageId, levelId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    const now = new Date();
    if (year === now.getFullYear() && month === now.getMonth() + 1) return;
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };
  const isCurrentMonth = year === defaultYear && month === defaultMonth;
  const currentWorkspace = workspaces.find((w) => w.id === workspaceId);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-400/10 border border-amber-400/20 rounded-lg flex items-center justify-center">
              <span className="text-amber-400 text-sm font-bold">$</span>
            </div>
            <div>
              <h1 className="text-zinc-100 font-semibold text-sm leading-none">
                Dashboard Financiero
              </h1>
              {currentWorkspace && (
                <p className="text-zinc-500 text-xs mt-0.5">{currentWorkspace.name}</p>
              )}
            </div>
          </div>

          {workspaces.length > 0 && (
            <select
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-colors cursor-pointer font-medium"
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* ── Historical total banner (sticky inside header) ─────────────── */}
        <HistoricalBanner totals={historicalTotals} loading={historicalLoading} />
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            <button
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50 rounded-md transition-colors"
            >
              ‹
            </button>
            <span className="text-zinc-200 text-sm font-medium px-3 min-w-[130px] text-center">
              {MONTHS[month - 1]} {year}
            </span>
            <button
              onClick={nextMonth}
              disabled={isCurrentMonth}
              className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ›
            </button>
          </div>

          {stages.length > 0 && (
            <FilterSelect
              value={stageId}
              onChange={setStageId}
              placeholder="Todas las etapas"
              options={stages}
            />
          )}
          {levels.length > 0 && (
            <FilterSelect
              value={levelId}
              onChange={setLevelId}
              placeholder="Todos los niveles"
              options={levels}
            />
          )}

          {(stageId || levelId) && (
            <button
              onClick={() => {
                setStageId("");
                setLevelId("");
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1"
            >
              Limpiar filtros
            </button>
          )}

          {isPending && (
            <div className="w-4 h-4 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin ml-auto" />
          )}
        </div>

        {/* ── KPI Cards ───────────────────────────────────────────────────── */}
        {data && data.kpis.length > 0 ? (
          <div
            className={`grid gap-4 ${data.kpis.length >= 2 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2"}`}
          >
            {data.kpis.map((kpi) => (
              <KpiCard key={kpi.currency} kpi={kpi} />
            ))}
            {/* Summary card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-3">
              <span className="text-xs font-semibold tracking-widest uppercase text-zinc-500">
                Resumen
              </span>
              <div>
                <p className="text-zinc-400 text-xs mb-1">Total facturas</p>
                <p className="text-2xl font-bold text-white">
                  {data.kpis.reduce((s, k) => s + k.count, 0)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
                {data.currencies.map((cur) => {
                  const kpi = data.kpis.find((k) => k.currency === cur)!;
                  return (
                    <div key={cur}>
                      <p className="text-zinc-500 text-xs mb-0.5">{cur}</p>
                      <p className="text-zinc-300 text-sm font-mono">{kpi.count} fact.</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : !isPending && data?.kpis.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <p className="text-zinc-500">
              Sin gastos en {MONTHS[month - 1]} {year}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 h-[140px] animate-pulse"
              />
            ))}
          </div>
        )}

        {/* ── Trend Chart ─────────────────────────────────────────────────── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-zinc-300 font-medium text-sm">
              Gastos por día
              <span className="text-zinc-600 font-normal ml-2 text-xs">fecha de pago</span>
            </h2>
            <div className="flex gap-3">
              {(data?.currencies ?? []).map((cur) => (
                <div key={cur} className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getCurrencyColor(cur) }}
                  />
                  <span className="text-zinc-500 text-xs">{cur}</span>
                </div>
              ))}
            </div>
          </div>
          <TrendChart
            trend={data?.trend ?? []}
            currencies={data?.currencies ?? []}
            loading={isPending && !data}
          />
        </div>

        {/* ── Category + Provider Charts ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-zinc-300 font-medium text-sm mb-4">Top categorías</h2>
            <CategoryChart categories={data?.categories ?? []} loading={isPending && !data} />
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-zinc-300 font-medium text-sm mb-4">Top proveedores</h2>
            <ProviderChart providers={data?.providers ?? []} loading={isPending && !data} />
          </div>
        </div>

        {/* ── Recent Expenses ──────────────────────────────────────────────── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-zinc-300 font-medium text-sm">Últimos gastos</h2>
            {data?.recent.length === 10 && (
              <span className="text-zinc-600 text-xs">10 más recientes</span>
            )}
          </div>
          <RecentTable rows={data?.recent ?? []} loading={isPending && !data} />
        </div>
      </main>
    </div>
  );
}
