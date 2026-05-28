"use server";

import { getCurrentUser } from "@/lib/getCurrentUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Workspace = { id: string; name: string; slug: string };
export type Stage    = { id: string; name: string; color: string | null };
export type Level    = { id: string; name: string };
export type FiltersData = { stages: Stage[]; levels: Level[] };

export type WorkspaceTotal = {
  currency: string;
  total: number; // centavos
  count: number;
};

export type KpiRow = {
  currency: string;
  total: number;   // centavos
  count: number;
  average: number; // centavos
  max: number;     // centavos
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

export type RecentRow = {
  id: string;
  paid_at: string;
  amount: number;
  currency: string;
  invoice_series: string | null;
  invoice_number: string | null;
  category_name: string | null;
  category_color: string | null;
  provider_name: string | null;
  stage_name: string | null;
  level_name: string | null;
  notes: string | null;
};

export type DashboardData = {
  kpis: KpiRow[];
  trend: TrendPoint[];
  currencies: string[];
  categories: CategoryRow[];
  providers: ProviderRow[];
  recent: RecentRow[];
  totalDays: number;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getWorkspaces(): Promise<Workspace[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabaseAdmin
    .from("workspace")
    .select("id, name, slug")
    .eq("created_by", user.id)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getFiltersData(workspaceId: string): Promise<FiltersData> {
  const [s, l] = await Promise.all([
    supabaseAdmin.from("stage").select("id, name, color").eq("workspace_id", workspaceId).order("order"),
    supabaseAdmin.from("level").select("id, name").eq("workspace_id", workspaceId).order("order"),
  ]);
  return { stages: s.data ?? [], levels: l.data ?? [] };
}

/**
 * Suma total acumulada del workspace (todos los meses, sin filtros de fecha).
 * Solo trae currency + amount para minimizar la transferencia.
 */
export async function getWorkspaceTotal(workspaceId: string): Promise<WorkspaceTotal[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabaseAdmin
    .from("expense")
    .select("currency, amount")
    .eq("workspace_id", workspaceId);

  if (error) throw new Error(error.message);

  const map = new Map<string, WorkspaceTotal>();
  for (const e of data ?? []) {
    const cur = (e.currency as string).trim();
    if (!map.has(cur)) map.set(cur, { currency: cur, total: 0, count: 0 });
    const row = map.get(cur)!;
    row.total += e.amount as number;
    row.count += 1;
  }

  return [...map.values()].sort((a, b) => b.total - a.total);
}

export async function getDashboardData(
  workspaceId: string,
  year: number,
  month: number,
  stageId?: string | null,
  levelId?: string | null
): Promise<DashboardData> {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autenticado");

  const startDate   = new Date(year, month - 1, 1).toISOString();
  const daysInMonth = new Date(year, month, 0).getDate();
  const endDate     = new Date(year, month - 1, daysInMonth, 23, 59, 59, 999).toISOString();

  let q = supabaseAdmin
    .from("expense")
    .select("id, paid_at, amount, currency, invoice_series, invoice_number, notes, category_id, provider_id, stage_id, level_id")
    .eq("workspace_id", workspaceId)
    .gte("paid_at", startDate)
    .lte("paid_at", endDate);

  if (stageId) q = q.eq("stage_id", stageId);
  if (levelId) q = q.eq("level_id", levelId);

  const { data: expenses, error } = await q;
  if (error) throw new Error(error.message);
  const list = expenses ?? [];

  if (list.length === 0) {
    return { kpis: [], trend: [], currencies: [], categories: [], providers: [], recent: [], totalDays: daysInMonth };
  }

  // Collect unique IDs for lookups
  const catIds  = [...new Set(list.map((e) => e.category_id).filter(Boolean))];
  const provIds = [...new Set(list.map((e) => e.provider_id).filter(Boolean))];
  const stgIds  = [...new Set(list.map((e) => e.stage_id).filter(Boolean))];
  const lvlIds  = [...new Set(list.map((e) => e.level_id).filter(Boolean))];

  const [catsRes, provsRes, stgsRes, lvlsRes] = await Promise.all([
    catIds.length  ? supabaseAdmin.from("category").select("id, name, color").in("id", catIds)  : { data: [] },
    provIds.length ? supabaseAdmin.from("provider").select("id, name").in("id", provIds)         : { data: [] },
    stgIds.length  ? supabaseAdmin.from("stage").select("id, name").in("id", stgIds)             : { data: [] },
    lvlIds.length  ? supabaseAdmin.from("level").select("id, name").in("id", lvlIds)             : { data: [] },
  ]);

  const catMap  = new Map((catsRes.data  ?? []).map((x) => [x.id, x]));
  const provMap = new Map((provsRes.data ?? []).map((x) => [x.id, x]));
  const stgMap  = new Map((stgsRes.data  ?? []).map((x) => [x.id, x]));
  const lvlMap  = new Map((lvlsRes.data  ?? []).map((x) => [x.id, x]));

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpiMap = new Map<string, KpiRow>();
  for (const e of list) {
    const cur = (e.currency as string).trim();
    if (!kpiMap.has(cur)) kpiMap.set(cur, { currency: cur, total: 0, count: 0, average: 0, max: 0 });
    const k = kpiMap.get(cur)!;
    k.total += e.amount;
    k.count += 1;
    k.max = Math.max(k.max, e.amount);
  }
  for (const k of kpiMap.values()) k.average = k.count > 0 ? Math.round(k.total / k.count) : 0;
  const kpis      = [...kpiMap.values()].sort((a, b) => b.total - a.total);
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
  const trend = [...trendRaw.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);

  // ── Categories ──────────────────────────────────────────────────────────────
  const catTmp = new Map<string, CategoryRow>();
  for (const e of list) {
    const cat = catMap.get(e.category_id);
    const cur = (e.currency as string).trim();
    const key = `${e.category_id ?? "__none"}|${cur}`;
    if (!catTmp.has(key)) {
      catTmp.set(key, { name: cat?.name ?? "Sin categoría", color: cat?.color ?? null, currency: cur, total: 0 });
    }
    catTmp.get(key)!.total += e.amount;
  }
  const categories = [...catTmp.values()].sort((a, b) => b.total - a.total).slice(0, 8);

  // ── Providers ───────────────────────────────────────────────────────────────
  const provTmp = new Map<string, ProviderRow>();
  for (const e of list) {
    const prov = provMap.get(e.provider_id);
    const cur  = (e.currency as string).trim();
    const key  = `${e.provider_id ?? "__none"}|${cur}`;
    if (!provTmp.has(key)) {
      provTmp.set(key, { name: prov?.name ?? "Sin proveedor", currency: cur, total: 0, count: 0 });
    }
    const row = provTmp.get(key)!;
    row.total += e.amount;
    row.count += 1;
  }
  const providers = [...provTmp.values()].sort((a, b) => b.total - a.total).slice(0, 6);

  // ── Recent ──────────────────────────────────────────────────────────────────
  const recent: RecentRow[] = list
    .sort((a, b) => new Date(b.paid_at as string).getTime() - new Date(a.paid_at as string).getTime())
    .slice(0, 10)
    .map((e) => ({
      id:             e.id,
      paid_at:        e.paid_at,
      amount:         e.amount,
      currency:       (e.currency as string).trim(),
      invoice_series: e.invoice_series,
      invoice_number: e.invoice_number,
      category_name:  catMap.get(e.category_id)?.name  ?? null,
      category_color: catMap.get(e.category_id)?.color ?? null,
      provider_name:  provMap.get(e.provider_id)?.name ?? null,
      stage_name:     stgMap.get(e.stage_id)?.name     ?? null,
      level_name:     lvlMap.get(e.level_id)?.name     ?? null,
      notes:          e.notes,
    }));

  return { kpis, trend, currencies, categories, providers, recent, totalDays: daysInMonth };
}
