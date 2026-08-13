"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PageTitle from "@/components/PageTitle";
import CheckPermission from "@/components/CheckPermission";
import { Permissions } from "@/types/propertyState";
import { getMaterialsReport, type MaterialReportRow } from "@/actions/materials";
import { formatAmount } from "@/utils/formatAmount";
import { formatSafeDate } from "@/lib/formatSafeDate";
import { SECONDARY_BUTTON_CLASS } from "@/constants";

// ── Fetchers ──────────────────────────────────────────────────────────────────
async function fetchWorkspace(slug: string): Promise<{ id: string; name: string }> {
  const { data, error } = await supabase
    .from("workspace")
    .select("id, name")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  return data;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const inputCls =
  "w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 " +
  "placeholder:text-gray-400 focus:outline-none focus:border-cyan-500 " +
  "focus:ring-2 focus:ring-cyan-500/10 transition-all duration-150 shadow-sm";

const selectCls = inputCls;

// ── Page ──────────────────────────────────────────────────────────────────────
function MaterialsReportPage() {
  const params = useParams();
  const workspaceSlug = params.slug as string;

  const { data: workspace } = useSWR(
    workspaceSlug ? ["workspace", workspaceSlug] : null,
    ([, slug]) => fetchWorkspace(slug),
  );
  const workspaceId = workspace?.id ?? "";

  const { data: rows = [], isLoading } = useSWR(
    workspaceId ? ["materials-report", workspaceId] : null,
    ([, wid]) => getMaterialsReport(wid),
  );

  const [search, setSearch] = useState("");
  const [materialFilter, setMaterialFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [levelFilterHydrated, setLevelFilterHydrated] = useState(false);

  // Restore the last selected level filter for this workspace (persists until changed).
  useEffect(() => {
    if (!workspaceId) return;
    const saved = localStorage.getItem(`materials-level-filter:${workspaceId}`);
    if (saved) setLevelFilter(saved);
    setLevelFilterHydrated(true);
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId || !levelFilterHydrated) return;
    localStorage.setItem(`materials-level-filter:${workspaceId}`, levelFilter);
  }, [levelFilter, workspaceId, levelFilterHydrated]);

  const materialOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => map.set(r.material.id, r.material.name));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const brandOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => r.brand && map.set(r.brand.id, r.brand.name));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const levelOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => r.level && map.set(r.level.id, r.level.name));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (materialFilter && r.material.id !== materialFilter) return false;
      if (brandFilter && r.brand?.id !== brandFilter) return false;
      if (levelFilter && r.level?.id !== levelFilter) return false;
      if (q) {
        const hay = `${r.material.name} ${r.brand?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, materialFilter, brandFilter, levelFilter]);

  const totals = useMemo(() => {
    const map = new Map<
      string,
      { material: string; unit: string; quantity: number; subtotal: number }
    >();
    filtered.forEach((r) => {
      const key = `${r.material.id}__${r.unit.id}`;
      const prev = map.get(key) ?? {
        material: r.material.name,
        unit: r.unit.name,
        quantity: 0,
        subtotal: 0,
      };
      prev.quantity += r.quantity;
      prev.subtotal += r.subtotal ?? 0;
      map.set(key, prev);
    });
    return [...map.values()].sort((a, b) => a.material.localeCompare(b.material));
  }, [filtered]);

  const filteredTotal = useMemo(
    () => filtered.reduce((sum, r) => sum + (r.subtotal ?? 0), 0),
    [filtered],
  );

  const currency = rows[0]?.currency ?? "PEN";

  return (
    <div className="min-h-screen text-gray-900">
      {/* Nav */}
      <nav className="top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-3 text-sm">
          <Link
            href={`/admin/workspaces/${workspaceSlug}/expenses`}
            className="text-gray-500 hover:text-cyan-600 transition-colors px-2 py-1 rounded-md hover:bg-cyan-50"
          >
            Gastos
          </Link>
          <span className="text-gray-300">/</span>
          <Link
            href={`/admin/workspaces/${workspaceSlug}/providers`}
            className="text-gray-500 hover:text-cyan-600 transition-colors px-2 py-1 rounded-md hover:bg-cyan-50"
          >
            Proveedores
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900 font-medium px-2 py-1">Materiales</span>
        </div>
      </nav>

      {levelOptions.length > 0 && (
        <div className="max-w-4xl mx-auto px-6">
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
            Nivel
          </label>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className={`${selectCls} max-w-xs`}
          >
            <option value="">Todos los niveles</option>
            {levelOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <PageTitle>Materiales</PageTitle>
          <p className="text-sm text-gray-500 mt-1">
            Todo lo comprado, agrupado por material y en detalle por gasto.
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-32 text-gray-400 text-sm gap-2">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            Cargando materiales...
          </div>
        )}

        {!isLoading && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm font-semibold text-gray-700 mb-1">Sin materiales aún</p>
            <p className="text-xs text-gray-400">
              Agrega materiales a un gasto para verlos aquí.
            </p>
          </div>
        )}

        {!isLoading && rows.length > 0 && (
          <>
            {/* Totals summary */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  Resumen por material
                </span>
              </div>
              {totals.map((t, i) => (
                <div
                  key={`${t.material}-${t.unit}-${i}`}
                  className={`flex items-center justify-between gap-4 px-5 py-3 ${
                    i < totals.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                >
                  <span className="text-sm font-semibold text-gray-800">{t.material}</span>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-sm text-gray-500">
                      {t.quantity} {t.unit}
                    </span>
                    <span className="text-sm font-semibold text-gray-700 w-24 text-right">
                      {t.subtotal > 0 ? formatAmount(t.subtotal, currency) : "—"}
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4 px-5 py-3 border-t border-gray-200 bg-gray-50/60">
                <span className="text-sm font-bold text-gray-800">Total</span>
                <span className="text-sm font-bold text-gray-900">
                  {formatAmount(filteredTotal, currency)}
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <input
                type="text"
                placeholder="Buscar material o marca..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={inputCls}
              />
              <select
                value={materialFilter}
                onChange={(e) => setMaterialFilter(e.target.value)}
                className={selectCls}
              >
                <option value="">Todos los materiales</option>
                {materialOptions.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className={selectCls}
              >
                <option value="">Todas las marcas</option>
                {brandOptions.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
              {(search || materialFilter || brandFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setMaterialFilter("");
                    setBrandFilter("");
                  }}
                  className={`${SECONDARY_BUTTON_CLASS} justify-center flex-shrink-0`}
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            {/* Detail list */}
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-sm text-gray-400">
                No se encontraron materiales para ese filtro.
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Detalle ({filtered.length})
                  </span>
                </div>
                {filtered.map((r: MaterialReportRow, i) => (
                  <Link
                    key={r.id}
                    href={`/admin/workspaces/${workspaceSlug}/expenses/${r.expense_id}`}
                    className={`flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors ${
                      i < filtered.length - 1 ? "border-b border-gray-100" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-cyan-600 uppercase tracking-wide mb-0.5">
                        {r.level?.name ?? "Sin nivel"}
                      </p>
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {r.material.name}
                        {r.brand && <span className="text-gray-400 font-normal"> · {r.brand.name}</span>}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatSafeDate(r.paid_at, "d MMM yyyy")} · {r.quantity} {r.unit.name}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {r.unit_price != null && (
                        <p className="text-xs text-gray-400">
                          P. unit. {formatAmount(r.unit_price, r.currency)}
                        </p>
                      )}
                      <p className="text-sm font-semibold text-gray-700">
                        {r.subtotal != null ? formatAmount(r.subtotal, r.currency) : "—"}
                      </p>
                    </div>
                  </Link>
                ))}
                <div className="flex items-center justify-between gap-4 px-5 py-3 border-t border-gray-200 bg-gray-50/60">
                  <span className="text-sm font-bold text-gray-800">Total</span>
                  <span className="text-sm font-bold text-gray-900">
                    {formatAmount(filteredTotal, currency)}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function MaterialsPage() {
  const { data: session } = useSession();
  const userRoleId = session?.user?.role_id as string | undefined;

  return (
    <CheckPermission userRoleId={userRoleId ?? ""} requiredPermission={Permissions.VIEW_MATERIALS}>
      <MaterialsReportPage />
    </CheckPermission>
  );
}
