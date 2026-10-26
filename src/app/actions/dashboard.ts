"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAccessibleWorkspaceIds, requireAccess, requirePermission } from "@/lib/access";
import { pendingDocsExpenseIds } from "@/lib/pendingDocs";
import { Permissions } from "@/types/propertyState";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Workspace = { id: string; name: string; slug: string };
export type Stage = { id: string; name: string; color: string | null };
export type Level = { id: string; name: string };
export type FiltersData = { stages: Stage[]; levels: Level[] };

export type WorkspaceTotal = {
  currency: string;
  total: number; // centavos
  count: number;
};

export type KpiRow = {
  currency: string;
  total: number; // centavos
  count: number;
  average: number; // centavos
  max: number; // centavos
};

export type TrendPoint = { day: string; [key: string]: number | string };

export type CategoryRow = {
  name: string;
  color: string | null;
  currency: string;
  total: number; // centavos
};

export type ProviderRow = {
  name: string;
  currency: string;
  total: number; // centavos
  count: number;
};

export type MonthTotal = { currency: string; total: number; count: number };

export type DashboardData = {
  kpis: KpiRow[];
  /** Same filters, previous month: for "vs mes anterior". */
  previous: MonthTotal[];
  trend: TrendPoint[];
  currencies: string[];
  categories: CategoryRow[];
  providers: ProviderRow[];
  totalDays: number;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getWorkspaces(): Promise<Workspace[]> {
  await requirePermission(Permissions.VIEW_DASHBOARD);
  // Projects the user created or was assigned to (same rule as everywhere else).
  const ids = await getAccessibleWorkspaceIds();
  if (!ids.length) return [];

  const { data, error } = await supabaseAdmin
    .from("workspace")
    .select("id, name, slug")
    .in("id", ids)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getFiltersData(workspaceId: string): Promise<FiltersData> {
  await requireAccess({ workspaceId, permissions: [Permissions.VIEW_DASHBOARD] });
  const [s, l] = await Promise.all([
    supabaseAdmin
      .from("stage")
      .select("id, name, color")
      .eq("workspace_id", workspaceId)
      .order("order"),
    supabaseAdmin.from("level").select("id, name").eq("workspace_id", workspaceId).order("order"),
  ]);
  return { stages: s.data ?? [], levels: l.data ?? [] };
}

/**
 * Suma total acumulada del workspace (todos los meses, sin filtros de fecha).
 * Solo trae currency + amount para minimizar la transferencia.
 */
export async function getWorkspaceTotal(workspaceId: string): Promise<WorkspaceTotal[]> {
  const guard = requireAccess({ workspaceId, permissions: [Permissions.VIEW_DASHBOARD] });
  guard.catch(() => {}); // rejection is handled by Promise.all below

  // The database adds it up (one small row per currency) instead of sending
  // every expense of the project to be summed here.
  const [, aggregate] = await Promise.all([
    guard,
    supabaseAdmin
      .from("expense")
      .select("currency, total:amount.sum(), count:id.count()")
      .eq("workspace_id", workspaceId),
  ]);

  const map = new Map<string, WorkspaceTotal>();
  const add = (currency: string, total: number, count: number) => {
    const cur = currency.trim();
    const row = map.get(cur) ?? { currency: cur, total: 0, count: 0 };
    row.total += total;
    row.count += count;
    map.set(cur, row);
  };

  if (!aggregate.error) {
    for (const r of (aggregate.data ?? []) as unknown as {
      currency: string;
      total: number | null;
      count: number | null;
    }[]) {
      add(r.currency, Number(r.total ?? 0), Number(r.count ?? 0));
    }
  } else {
    // Aggregates turned off in the database API: fall back to summing here.
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabaseAdmin
        .from("expense")
        .select("currency, amount")
        .eq("workspace_id", workspaceId)
        .order("id")
        .range(from, from + 999);
      if (error) throw new Error(error.message);
      for (const e of data ?? []) add(e.currency as string, e.amount as number, 1);
      if (!data || data.length < 1000) break;
    }
  }

  return [...map.values()].sort((a, b) => b.total - a.total);
}

/**
 * Total and count per currency for a date range, added up by the database (one
 * row per currency). Falls back to summing here if aggregates are turned off.
 */
async function monthTotals(
  workspaceId: string,
  from: string,
  to: string,
  stageId?: string | null,
  levelId?: string | null,
): Promise<MonthTotal[]> {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const scope = (q: any) => {
    let r = q.eq("workspace_id", workspaceId).gte("paid_at", from).lte("paid_at", to);
    if (stageId) r = r.eq("stage_id", stageId);
    if (levelId) r = r.eq("level_id", levelId);
    return r;
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const map = new Map<string, MonthTotal>();
  const add = (currency: string, total: number, count: number) => {
    const cur = currency.trim();
    const row = map.get(cur) ?? { currency: cur, total: 0, count: 0 };
    row.total += total;
    row.count += count;
    map.set(cur, row);
  };
  const agg = await scope(
    supabaseAdmin.from("expense").select("currency, total:amount.sum(), count:id.count()"),
  );
  if (!agg.error) {
    for (const r of (agg.data ?? []) as {
      currency: string;
      total: number | null;
      count: number | null;
    }[])
      add(r.currency, Number(r.total ?? 0), Number(r.count ?? 0));
  } else {
    const { data, error } = await scope(supabaseAdmin.from("expense").select("currency, amount"));
    if (error) throw new Error(error.message);
    for (const e of (data ?? []) as { currency: string; amount: number }[])
      add(e.currency, e.amount, 1);
  }
  return [...map.values()];
}

export async function getDashboardData(
  workspaceId: string,
  year: number,
  month: number,
  stageId?: string | null,
  levelId?: string | null,
): Promise<DashboardData> {
  // Access check alongside the query; if it fails, no data leaves the server.
  const guard = requireAccess({ workspaceId, permissions: [Permissions.VIEW_DASHBOARD] });
  guard.catch(() => {}); // rejection is handled by Promise.all below

  const startDate = new Date(year, month - 1, 1).toISOString();
  const daysInMonth = new Date(year, month, 0).getDate();
  const endDate = new Date(year, month - 1, daysInMonth, 23, 59, 59, 999).toISOString();

  let q = supabaseAdmin
    .from("expense")
    // Names come embedded in the same query (they used to be 4 more lookups after it).
    .select(
      `id, paid_at, amount, currency,
       category_id, provider_id, stage_id, level_id,
       category:category_id(id, name, color), provider:provider_id(id, name),
       stage:stage_id(id, name), level:level_id(id, name)`,
    )
    .eq("workspace_id", workspaceId)
    .gte("paid_at", startDate)
    .lte("paid_at", endDate);

  if (stageId) q = q.eq("stage_id", stageId);
  if (levelId) q = q.eq("level_id", levelId);

  const prevStart = new Date(year, month - 2, 1).toISOString();
  const prevEnd = new Date(year, month - 1, 0, 23, 59, 59, 999).toISOString();

  const [, { data: expenses, error }, previous] = await Promise.all([
    guard,
    q,
    monthTotals(workspaceId, prevStart, prevEnd, stageId, levelId),
  ]);
  if (error) throw new Error(error.message);
  const list = expenses ?? [];

  if (list.length === 0) {
    return {
      kpis: [],
      previous,
      trend: [],
      currencies: [],
      categories: [],
      providers: [],
      totalDays: daysInMonth,
    };
  }

  // Lookup maps from the embedded rows (same shape the code below expects).
  type Named = { id: string; name: string; color?: string | null };
  const one = (v: unknown) => (Array.isArray(v) ? v[0] : v) as Named | null | undefined;
  const catMap = new Map<string, Named>();
  const provMap = new Map<string, Named>();
  const stgMap = new Map<string, Named>();
  const lvlMap = new Map<string, Named>();
  for (const e of list) {
    const [c, p, st, l] = [one(e.category), one(e.provider), one(e.stage), one(e.level)];
    if (c) catMap.set(c.id, c);
    if (p) provMap.set(p.id, p);
    if (st) stgMap.set(st.id, st);
    if (l) lvlMap.set(l.id, l);
  }

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpiMap = new Map<string, KpiRow>();
  for (const e of list) {
    const cur = (e.currency as string).trim();
    if (!kpiMap.has(cur))
      kpiMap.set(cur, { currency: cur, total: 0, count: 0, average: 0, max: 0 });
    const k = kpiMap.get(cur)!;
    k.total += e.amount;
    k.count += 1;
    k.max = Math.max(k.max, e.amount);
  }
  for (const k of kpiMap.values()) k.average = k.count > 0 ? Math.round(k.total / k.count) : 0;
  const kpis = [...kpiMap.values()].sort((a, b) => b.total - a.total);
  const currencies = kpis.map((k) => k.currency);

  // ── Trend (day × currency) ──────────────────────────────────────────────────
  const trendRaw = new Map<string, TrendPoint>();
  for (const e of list) {
    const day = (e.paid_at as string).slice(8, 10); // "01"–"31"
    const cur = (e.currency as string).trim();
    if (!trendRaw.has(day)) trendRaw.set(day, { day });
    const pt = trendRaw.get(day)!;
    pt[cur] = ((pt[cur] as number | undefined) ?? 0) + (e.amount as number);
  }
  const trend = [...trendRaw.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);

  // ── Categories ──────────────────────────────────────────────────────────────
  const catTmp = new Map<string, CategoryRow>();
  for (const e of list) {
    const cat = catMap.get(e.category_id);
    const cur = (e.currency as string).trim();
    const key = `${e.category_id ?? "__none"}|${cur}`;
    if (!catTmp.has(key)) {
      catTmp.set(key, {
        name: cat?.name ?? "Sin categoría",
        color: cat?.color ?? null,
        currency: cur,
        total: 0,
      });
    }
    catTmp.get(key)!.total += e.amount;
  }
  const categories = [...catTmp.values()].sort((a, b) => b.total - a.total).slice(0, 8);

  // ── Providers ───────────────────────────────────────────────────────────────
  const provTmp = new Map<string, ProviderRow>();
  for (const e of list) {
    const prov = provMap.get(e.provider_id);
    const cur = (e.currency as string).trim();
    const key = `${e.provider_id ?? "__none"}|${cur}`;
    if (!provTmp.has(key)) {
      provTmp.set(key, { name: prov?.name ?? "Sin proveedor", currency: cur, total: 0, count: 0 });
    }
    const row = provTmp.get(key)!;
    row.total += e.amount;
    row.count += 1;
  }
  const providers = [...provTmp.values()].sort((a, b) => b.total - a.total).slice(0, 6);

  return {
    kpis,
    previous,
    trend,
    currencies,
    categories,
    providers,
    totalDays: daysInMonth,
  };
}

/**
 * How many invoices of the project still lack a required document (factura,
 * guía, comprobante). All dates under the rule, not just the selected month:
 * it's a to-do, not a stat.
 */
export async function getPendingDocsCount(workspaceId: string): Promise<number> {
  const guard = requireAccess({ workspaceId, permissions: [Permissions.VIEW_DASHBOARD] });
  guard.catch(() => {}); // rejection is handled by Promise.all below
  const [, ids] = await Promise.all([guard, pendingDocsExpenseIds(workspaceId)]);
  return ids.length;
}
