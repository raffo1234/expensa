"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SELECT_CLASS } from "@/constants";
import FormSection from "./FormSection";
import ClearFiltersButton from "./ClearFiltersButton";
import { Bone } from "./Skeleton";
import {
  getDashboardData,
  getFiltersData,
  getMissingGuidesCount,
  getWorkspaceTotal,
} from "@/actions/dashboard";
import Link from "next/link";
import GuideStatusBadge from "./GuideStatusBadge";
import type {
  DashboardData,
  Level,
  MonthTotal,
  Stage,
  TrendPoint,
  Workspace,
  WorkspaceTotal,
} from "@/actions/dashboard";

// Manager view: how much this month (vs last), the project total, how spending
// moved through the month, and where the money goes (categories, providers).
// Amounts in different currencies are never added together; the "primary"
// currency (soles when present) drives the chart and the ranked lists.

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

const SYMBOL: Record<string, string> = { PEN: "S/", USD: "$", EUR: "€" };
const symbol = (c: string) => SYMBOL[c] ?? c;

const money = (centavos: number, currency: string) =>
  `${symbol(currency)} ${(centavos / 100).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const compact = (centavos: number) => {
  const n = centavos / 100;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
};

/** Soles first, then the currency with the most spent. */
function byImportance<T extends { currency: string; total: number }>(rows: T[]): T[] {
  return [...rows]
    .filter((r) => r.total !== 0)
    .sort((a, b) => (a.currency === "PEN" ? -1 : b.currency === "PEN" ? 1 : b.total - a.total));
}

const CARD = "rounded-xl border border-navy-100 bg-white p-5";
// One accent hue for magnitude (sequential), as in the dataviz guidance.
const ACCENT = "#7c3aed";

// ─── Small pieces ─────────────────────────────────────────────────────────────

function CardTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h2 className="font-book text-navy-900">{title}</h2>
      {hint && <span className="text-xs text-navy-400">{hint}</span>}
    </div>
  );
}

/**
 * Change against the previous month. Neutral ink with an arrow and words, not
 * red/green: spending more isn't automatically bad, and color alone would hide
 * the meaning from some readers.
 */
function Delta({ now, before, label }: { now: number; before: number; label: string }) {
  if (!before) {
    return <p className="mt-2 text-xs text-navy-400">Sin datos de {label} para comparar</p>;
  }
  const pct = Math.round(((now - before) / before) * 100);
  const arrow = pct > 0 ? "↑" : pct < 0 ? "↓" : "→";
  const words = pct === 0 ? "igual que" : `${Math.abs(pct)}% ${pct > 0 ? "más" : "menos"} que`;
  return (
    <p className="mt-2 text-xs text-navy-500">
      <span aria-hidden className="mr-1 font-medium text-navy-700">
        {arrow}
      </span>
      {words} {label}
    </p>
  );
}

function StatTile({
  label,
  loading,
  children,
}: {
  label: string;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={CARD}>
      <p className="text-sm text-navy-500">{label}</p>
      {loading ? (
        <>
          <Bone className="mt-2 h-8 w-40" />
          <Bone className="mt-3 h-3 w-32" />
        </>
      ) : (
        children
      )}
    </div>
  );
}

/** Amounts per currency: the main one large, others smaller beside it. */
function Amounts({ rows }: { rows: { currency: string; total: number }[] }) {
  const ordered = byImportance(rows);
  if (!ordered.length) return <p className="mt-1 text-3xl text-navy-300 tabular-nums">—</p>;
  return (
    <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 tabular-nums">
      {ordered.map((r, i) => (
        <span
          key={r.currency}
          className={
            i === 0
              ? "text-3xl font-semibold tracking-tight text-navy-900"
              : "text-base font-medium text-navy-700"
          }
        >
          {money(r.total, r.currency)}
        </span>
      ))}
    </p>
  );
}

// ─── Trend ────────────────────────────────────────────────────────────────────

function TrendTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string | number;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-navy-100 bg-white px-3 py-2 shadow-card">
      <p className="text-xs text-navy-500">Día {label}</p>
      <p className="text-sm font-medium text-navy-900 tabular-nums">
        {money(payload[0].value ?? 0, currency)}
      </p>
    </div>
  );
}

function TrendChart({ trend, currency }: { trend: TrendPoint[]; currency: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.18} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#ecebf5" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fill: "#8a87a8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={16}
        />
        <YAxis
          tickFormatter={(v: number) => compact(v)}
          tick={{ fill: "#8a87a8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip
          content={<TrendTooltip currency={currency} />}
          cursor={{ stroke: "#c4b5fd", strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey={currency}
          stroke={ACCENT}
          strokeWidth={2}
          fill="url(#trend-fill)"
          dot={false}
          activeDot={{ r: 4, fill: ACCENT, stroke: "#fff", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Ranked list (categories, providers) ──────────────────────────────────────

/** Name, amount and a single-hue bar against the largest; values are labeled. */
function RankedList({
  rows,
  currency,
  empty,
}: {
  rows: { name: string; total: number; detail?: string }[];
  currency: string;
  empty: string;
}) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-navy-400">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.total));
  return (
    <ol className="space-y-3.5">
      {rows.map((r) => (
        <li key={r.name}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-navy-900" title={r.name}>
              {r.name}
            </span>
            <span className="flex-shrink-0 text-navy-700 tabular-nums">
              {money(r.total, currency)}
              {r.detail && <span className="ml-2 text-xs text-navy-400">{r.detail}</span>}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-navy-50" aria-hidden>
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(2, (r.total / max) * 100)}%`, background: ACCENT }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

function RankedSkeleton() {
  return (
    <div className="space-y-3.5" aria-hidden>
      {[80, 62, 48, 35, 24].map((w) => (
        <div key={w}>
          <div className="mb-1.5 flex justify-between">
            <Bone className="h-3.5 w-32" />
            <Bone className="h-3.5 w-20" />
          </div>
          <Bone className="h-1.5 rounded-full" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  workspaces: Workspace[];
  defaultYear: number;
  defaultMonth: number;
}

export default function DashboardClient({ workspaces, defaultYear, defaultMonth }: Props) {
  const [workspaceId, setWorkspaceId] = useState<string>(workspaces[0]?.id ?? "");
  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);
  const [stageId, setStageId] = useState("");
  const [levelId, setLevelId] = useState("");

  const [stages, setStages] = useState<Stage[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [projectTotals, setProjectTotals] = useState<WorkspaceTotal[] | null>(null);
  const [missingGuides, setMissingGuides] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!workspaceId) return;
    setStageId("");
    setLevelId("");
    setData(null);
    setProjectTotals(null);
    getFiltersData(workspaceId).then(({ stages: s, levels: l }) => {
      setStages(s);
      setLevels(l);
    });
    getWorkspaceTotal(workspaceId).then(setProjectTotals);
    setMissingGuides(0);
    getMissingGuidesCount(workspaceId).then(setMissingGuides);
  }, [workspaceId]);

  const loadData = useCallback(() => {
    if (!workspaceId) return;
    startTransition(async () => {
      setData(await getDashboardData(workspaceId, year, month, stageId || null, levelId || null));
    });
  }, [workspaceId, year, month, stageId, levelId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isCurrentMonth = year === defaultYear && month === defaultMonth;
  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (isCurrentMonth) return;
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const currentSlug = workspaces.find((w) => w.id === workspaceId)?.slug;
  const monthName = MONTHS[month - 1];
  const prevMonthName = MONTHS[(month + 10) % 12];
  const loading = !data || isPending;

  // This month, per currency, from the KPI rows.
  const thisMonth: MonthTotal[] = (data?.kpis ?? []).map((k) => ({
    currency: k.currency,
    total: k.total,
    count: k.count,
  }));
  const primary = byImportance(thisMonth)[0]?.currency ?? "PEN";
  const now = thisMonth.find((t) => t.currency === primary);
  const before = data?.previous.find((t) => t.currency === primary);
  const countNow = thisMonth.reduce((s, t) => s + t.count, 0);
  const countBefore = (data?.previous ?? []).reduce((s, t) => s + t.count, 0);
  const otherCurrencies = thisMonth.filter((t) => t.currency !== primary).map((t) => t.currency);

  const categories = (data?.categories ?? [])
    .filter((c) => c.currency === primary)
    .slice(0, 6)
    .map((c) => ({ name: c.name, total: c.total }));
  const providers = (data?.providers ?? [])
    .filter((p) => p.currency === primary)
    .slice(0, 6)
    .map((p) => ({
      name: p.name ?? "Sin proveedor",
      total: p.total,
      detail: `${p.count} ${p.count === 1 ? "gasto" : "gastos"}`,
    }));

  const navButton =
    "flex w-11 items-center justify-center text-navy-700 transition-colors hover:bg-navy-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:text-navy-300 disabled:hover:bg-transparent sm:w-9.5 cursor-pointer";

  if (!workspaces.length) {
    return (
      <FormSection title="Dashboard">
        <p className="py-16 text-center text-sm text-navy-500">
          Aún no tienes proyectos para mostrar.
        </p>
      </FormSection>
    );
  }

  return (
    <FormSection title="Dashboard">
      <div className="space-y-6">
        {/* Filters: one row above everything they affect. */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            aria-label="Proyecto"
            className={`${SELECT_CLASS} w-full sm:w-auto`}
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          <div
            role="group"
            aria-label="Mes"
            className="flex h-11 items-stretch overflow-hidden rounded-lg border border-navy-200 bg-white sm:h-9.5"
          >
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Mes anterior"
              className={navButton}
            >
              ‹
            </button>
            <span
              aria-live="polite"
              className="flex min-w-36 items-center justify-center px-2 text-sm text-navy-900 tabular-nums"
            >
              {monthName} {year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              disabled={isCurrentMonth}
              aria-label="Mes siguiente"
              className={navButton}
            >
              ›
            </button>
          </div>

          {stages.length > 0 && (
            <select
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              aria-label="Etapa"
              className={`${SELECT_CLASS} w-auto`}
            >
              <option value="">Todas las etapas</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          {levels.length > 0 && (
            <select
              value={levelId}
              onChange={(e) => setLevelId(e.target.value)}
              aria-label="Nivel"
              className={`${SELECT_CLASS} w-auto`}
            >
              <option value="">Todos los niveles</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          )}
          <ClearFiltersButton
            onClick={() => {
              setStageId("");
              setLevelId("");
            }}
            disabled={!stageId && !levelId}
          />
        </div>

        {/* A to-do for the accountant: invoices still waiting for their guide. */}
        {missingGuides > 0 && (
          <div
            role="status"
            className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900"
          >
            <GuideStatusBadge status="missing" />
            <span className="mr-auto">
              {missingGuides === 1
                ? "1 factura no tiene su guía de remisión."
                : `${missingGuides} facturas no tienen su guía de remisión.`}
            </span>
            {currentSlug && (
              <Link
                href={`/admin/workspaces/${currentSlug}/expenses?missingGuide=1`}
                className="font-medium text-amber-900 underline decoration-amber-400 underline-offset-4 hover:decoration-amber-700"
              >
                Ver cuáles
              </Link>
            )}
          </div>
        )}

        {/* Headline numbers. */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatTile label={`Gastado en ${monthName}`} loading={loading}>
            <Amounts rows={thisMonth} />
            <Delta now={now?.total ?? 0} before={before?.total ?? 0} label={prevMonthName} />
          </StatTile>

          <StatTile label="Gastos registrados" loading={loading}>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-navy-900 tabular-nums">
              {countNow}
            </p>
            <Delta now={countNow} before={countBefore} label={prevMonthName} />
          </StatTile>

          <StatTile label="Total del proyecto" loading={projectTotals === null}>
            <Amounts rows={projectTotals ?? []} />
            <p className="mt-2 text-xs text-navy-500 tabular-nums">
              {(projectTotals ?? []).reduce((s, t) => s + t.count, 0)} gastos desde el inicio
            </p>
          </StatTile>
        </div>

        {/* How the month went. */}
        <section className={CARD}>
          <CardTitle
            title="Gasto por día"
            hint={
              otherCurrencies.length
                ? `En ${symbol(primary)} · ${otherCurrencies.join(", ")} no se suma aquí`
                : `En ${symbol(primary)}, por fecha de pago`
            }
          />
          {loading ? (
            <div className="flex h-[220px] items-end gap-2 pb-6" aria-hidden>
              {[30, 55, 40, 70, 45, 85, 50, 65, 35, 60].map((h, i) => (
                <Bone key={i} className="flex-1 rounded-b-none" style={{ height: `${h}%` }} />
              ))}
            </div>
          ) : (data?.trend.length ?? 0) === 0 || !now ? (
            <p className="flex h-[220px] items-center justify-center text-sm text-navy-400">
              Sin gastos en {monthName} {year}
            </p>
          ) : (
            <TrendChart trend={data!.trend} currency={primary} />
          )}
        </section>

        {/* Where the money goes. */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className={CARD}>
            <CardTitle title="¿En qué se gasta?" hint={`Top categorías · ${symbol(primary)}`} />
            {loading ? (
              <RankedSkeleton />
            ) : (
              <RankedList rows={categories} currency={primary} empty="Sin gastos este mes" />
            )}
          </section>
          <section className={CARD}>
            <CardTitle title="Principales proveedores" hint={symbol(primary)} />
            {loading ? (
              <RankedSkeleton />
            ) : (
              <RankedList rows={providers} currency={primary} empty="Sin gastos este mes" />
            )}
          </section>
        </div>
      </div>
    </FormSection>
  );
}
