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
  PEN: "#7c3aed", // violet-500  (antes amber)
  USD: "#0284c7", // sky-400     (antes blue-400)
  EUR: "#9333ea", // purple-400  (antes violet-300)
};

const getCurrencyColor = (c: string) => CURRENCY_COLOR[c] ?? "#6b7280";
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
      <div className="w-6 h-6 border-2 border-gray-200 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[120px] gap-2">
      <div className="text-gray-300 text-3xl">—</div>
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}

// ─── Historical Total Banner ──────────────────────────────────────────────────

function HistoricalBanner({ totals, loading }: { totals: WorkspaceTotal[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="border-b border-gray-200/60 bg-gray-50/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex gap-6">
          {[80, 64].map((w) => (
            <div key={w} className={`h-4 w-${w} bg-gray-100 rounded animate-pulse`} />
          ))}
        </div>
      </div>
    );
  }

  if (totals.length === 0) return null;

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-1">
        <span className="text-gray-600 text-xs uppercase tracking-widest font-medium shrink-0">
          Acumulado total
        </span>
        {totals.map((t) => (
          <div key={t.currency} className="flex items-baseline gap-1.5">
            <span className="text-xs font-semibold" style={{ color: getCurrencyColor(t.currency) }}>
              {getCurrencySymbol(t.currency)}
            </span>
            <span className="text-gray-800 font-mono text-sm font-semibold">
              {fmtAmount(t.total)}
            </span>
            <span className="text-xs">{t.currency}</span>
            <span className="text-xs">· {t.count.toLocaleString()} fact.</span>
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
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold tracking-widest uppercase px-2 py-0.5 rounded"
          style={{ color, backgroundColor: `${color}18` }}
        >
          {kpi.currency}
        </span>
        <span className="text-gray-400 text-xs">{kpi.count} facturas</span>
      </div>
      <div>
        <p className="text-gray-500 text-xs mb-1">Total gastado de este mes</p>
        <p className="text-2xl font-bold text-gray-900 font-mono tracking-tight">
          <span className="text-sm mr-1" style={{ color }}>
            {symbol}
          </span>
          {fmtAmount(kpi.total)}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
        <div>
          <p className="text-gray-400 text-xs mb-0.5">Promedio</p>
          <p className="text-gray-800 text-sm font-mono">
            {symbol}
            {fmtCompact(kpi.average)}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-xs mb-0.5">Máximo</p>
          <p className="text-gray-800 text-sm font-mono">
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
    <div className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-gray-500 text-xs mb-1">Día {label}</p>
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
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          axisLine={false}
          tickLine={false}
          width={140}
          tick={<TruncatedTick />}
        />
        <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#f3f4f6" }} />
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
    <div className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-gray-700 text-sm">{item.name}</p>
      <p className="text-sm font-mono text-violet-600">
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
  const filtered = categories
    .filter((c) => c.currency === primary)
    .slice(0, 6)
    .map((c) => ({ ...c, name: c.name }));

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
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#6b7280", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={100}
        />
        <Tooltip content={<CategoryTooltip />} cursor={{ fill: "#e5e7eb" }} />
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
    <div className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-gray-700 text-sm">{item.name}</p>
      <p className="text-sm font-mono" style={{ color }}>
        {getCurrencySymbol(item.currency)}
        {fmtAmount(payload[0].value ?? 0)}
      </p>
      <p className="text-gray-400 text-xs">{item.count} facturas</p>
    </div>
  );
}

function ProviderChart({ providers, loading }: { providers: ProviderRow[]; loading: boolean }) {
  if (loading) return <Spinner />;
  if (providers.length === 0) return <EmptyState message="Sin datos de proveedores" />;

  const truncate = (str: string, max: number) => (str.length > max ? `${str.slice(0, max)}…` : str);
  const primary = providers[0]?.currency ?? "PEN";
  const filtered = providers
    .filter((p) => p.currency === primary)
    .slice(0, 6)
    .map((p) => ({ ...p, name: truncate(p.name ?? "", 20) }));
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
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#6b7280", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={150}
        />
        <Tooltip content={<ProviderTooltip />} cursor={{ fill: "#e5e7eb" }} />
        <Bar dataKey="total" fill={color} fillOpacity={0.8} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const TruncatedTick = ({ x = 0, y = 0, payload = { value: "" } }: { x?: number; y?: number; payload?: { value: string } }) => {
  const max = 18; // caracteres máximos
  const text = payload.value?.length > max ? `${payload.value.slice(0, max)}…` : payload.value;
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fill="#6b7280" fontSize={12}>
      {text}
    </text>
  );
};

// ─── Recent Table ─────────────────────────────────────────────────────────────

function RecentTable({ rows, loading }: { rows: RecentRow[]; loading: boolean }) {
  if (loading) return <Spinner />;
  if (rows.length === 0) return <EmptyState message="Sin gastos registrados" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-400 text-xs uppercase tracking-wider">
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
              className="border-b border-gray-100 hover:bg-violet-50/40 transition-colors"
            >
              <td className="py-3 px-2 text-gray-500 font-mono text-xs whitespace-nowrap">
                {new Date(row.paid_at).toLocaleDateString("es-PE", {
                  day: "2-digit",
                  month: "short",
                })}
              </td>
              <td className="py-3 px-2 text-gray-800 max-w-[140px] truncate">
                {row.provider_name ?? <span className="text-gray-300">—</span>}
              </td>
              <td className="py-3 px-2">
                {row.category_name ? (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: `${row.category_color ?? "#9ca3af"}22`,
                      color: row.category_color ?? "#6b7280",
                    }}
                  >
                    {row.category_name}
                  </span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="py-3 px-2 text-gray-500 font-mono text-xs hidden md:table-cell">
                {row.invoice_series && row.invoice_number
                  ? `${row.invoice_series}-${row.invoice_number}`
                  : (row.invoice_number ?? <span className="text-gray-300">—</span>)}
              </td>
              <td className="py-3 px-2 hidden lg:table-cell">
                {row.stage_name ? (
                  <span className="text-xs text-gray-500">{row.stage_name}</span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="py-3 px-2 text-right font-mono font-semibold whitespace-nowrap">
                <span className="text-xs mr-0.5" style={{ color: getCurrencyColor(row.currency) }}>
                  {getCurrencySymbol(row.currency)}
                </span>
                <span className="text-gray-900">{fmtAmount(row.amount)}</span>
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
      className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors cursor-pointer"
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

  useEffect(() => {
    if (!workspaceId) return;
    setStageId("");
    setLevelId("");
    setData(null);

    getFiltersData(workspaceId).then(({ stages: s, levels: l }) => {
      setStages(s);
      setLevels(l);
    });

    setHistoricalLoading(true);
    getWorkspaceTotal(workspaceId)
      .then(setHistoricalTotals)
      .finally(() => setHistoricalLoading(false));
  }, [workspaceId]);

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
    <div className="min-h-screen">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="border-b border-gray-200  z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-50 border border-violet-200 rounded-lg flex items-center justify-center">
              <span className="text-violet-600 text-sm font-bold">$</span>
            </div>
            <div>
              <h1 className="text-gray-900 font-semibold text-sm leading-none">
                Dashboard Financiero
              </h1>
              {currentWorkspace && (
                <p className="text-gray-400 text-xs mt-0.5">{currentWorkspace.name}</p>
              )}
            </div>
          </div>

          {workspaces.length > 0 && (
            <select
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="bg-white border border-gray-300 text-gray-800 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-300 transition-colors cursor-pointer font-medium"
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <HistoricalBanner totals={historicalTotals} loading={historicalLoading} />
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
            <button
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-200/70 rounded-md transition-colors"
            >
              ‹
            </button>
            <span className="text-gray-800 text-sm font-medium px-3 min-w-[130px] text-center">
              {MONTHS[month - 1]} {year}
            </span>
            <button
              onClick={nextMonth}
              disabled={isCurrentMonth}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-200/70 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors px-2 py-1"
            >
              Limpiar filtros
            </button>
          )}

          {isPending && (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-violet-600 rounded-full animate-spin ml-auto" />
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
            <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
              <span className="text-xs font-semibold tracking-widest uppercase text-gray-400">
                Resumen
              </span>
              <div>
                <p className="text-gray-500 text-xs mb-1">Total facturas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.kpis.reduce((s, k) => s + k.count, 0)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                {data.currencies.map((cur) => {
                  const kpi = data.kpis.find((k) => k.currency === cur)!;
                  return (
                    <div key={cur}>
                      <p className="text-gray-400 text-xs mb-0.5">{cur}</p>
                      <p className="text-gray-700 text-sm font-mono">{kpi.count} fact.</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : !isPending && data?.kpis.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-gray-400">
              Sin gastos en {MONTHS[month - 1]} {year}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-xl p-5 h-[140px] animate-pulse"
              />
            ))}
          </div>
        )}

        {/* ── Trend Chart ─────────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-700 font-medium text-sm">
              Gastos por día
              <span className="text-gray-300 font-normal ml-2 text-xs">fecha de pago</span>
            </h2>
            <div className="flex gap-3">
              {(data?.currencies ?? []).map((cur) => (
                <div key={cur} className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getCurrencyColor(cur) }}
                  />
                  <span className="text-gray-400 text-xs">{cur}</span>
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
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-gray-700 font-medium text-sm mb-4">Top categorías</h2>
            <CategoryChart categories={data?.categories ?? []} loading={isPending && !data} />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-gray-700 font-medium text-sm mb-4">Top proveedores</h2>
            <ProviderChart providers={data?.providers ?? []} loading={isPending && !data} />
          </div>
        </div>

        {/* ── Recent Expenses ──────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-700 font-medium text-sm">Últimos gastos</h2>
            {data?.recent.length === 10 && (
              <span className="text-gray-300 text-xs">10 más recientes</span>
            )}
          </div>
          <RecentTable rows={data?.recent ?? []} loading={isPending && !data} />
        </div>
      </main>
    </div>
  );
}
