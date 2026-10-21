"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import PageTitle from "@/components/PageTitle";
import SearchInput from "@/components/SearchInput";
import ClearFiltersButton from "@/components/ClearFiltersButton";
import InputWithTooltip from "@/components/InputWithTooltip";
import type { MaterialReportRow } from "@/actions/materials";
import { formatAmount, formatTotals, totalsByCurrency } from "@/utils/formatAmount";
import { formatSafeDate } from "@/lib/formatSafeDate";
import { replaceUrl } from "@/utils/replaceUrl";
import { INPUT_CLASS, SELECT_CLASS } from "@/constants";
import { TAX_STATUS_LABELS, type TaxStatus } from "@/lib/invoiceTax";

type Option = [id: string, name: string];

const TAX_STATUS_OPTIONS = Object.entries(TAX_STATUS_LABELS) as Option[];

const BOX_CLASS = "min-w-0 border border-gray-200 rounded-xl px-2 py-1.5 bg-gray-50/50";
const LABEL_CLASS = "block text-[11px] font-medium text-gray-400 mb-1";

// Level is a "where am I working" choice, so it survives reloads and is not
// reset by "clear filters".
const levelStorageKey = (workspaceId: string) => `materials-level-filter:${workspaceId}`;

function readStoredLevel(workspaceId: string) {
  try {
    return localStorage.getItem(levelStorageKey(workspaceId)) ?? "";
  } catch {
    return "";
  }
}

function uniqueOptions(items: ({ id: string; name: string } | null)[]): Option[] {
  const map = new Map<string, string>();
  items.forEach((item) => item && map.set(item.id, item.name));
  return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
}

function FilterSelect({
  label,
  value,
  onChange,
  allLabel,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: Option[];
}) {
  return (
    <div className={BOX_CLASS}>
      <p className={LABEL_CLASS}>{label}</p>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={SELECT_CLASS}>
        <option value="">{allLabel}</option>
        {options.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function MaterialsClient({
  workspaceId,
  workspaceSlug,
  rows,
}: {
  workspaceId: string;
  workspaceSlug: string;
  rows: MaterialReportRow[];
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [materialId, setMaterialId] = useState(() => searchParams.get("material") ?? "");
  const [brandId, setBrandId] = useState(() => searchParams.get("brand") ?? "");
  const [providerId, setProviderId] = useState(() => searchParams.get("provider") ?? "");
  const [taxStatus, setTaxStatus] = useState(() => searchParams.get("tax") ?? "");
  const [levelId, setLevelId] = useState(() => searchParams.get("level") ?? "");
  const [month, setMonth] = useState(() => searchParams.get("month") ?? "");
  const [dateFrom, setDateFrom] = useState(() => searchParams.get("from") ?? "");
  const [dateTo, setDateTo] = useState(() => searchParams.get("to") ?? "");
  const [levelHydrated, setLevelHydrated] = useState(false);

  // Restore the saved level after mount (localStorage is not available on the server).
  useEffect(() => {
    if (!searchParams.get("level")) {
      const saved = readStoredLevel(workspaceId);
      if (saved) setLevelId(saved);
    }
    setLevelHydrated(true);
    // Only on mount: later URL changes come from this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  useEffect(() => {
    if (!levelHydrated) return;
    try {
      localStorage.setItem(levelStorageKey(workspaceId), levelId);
    } catch {}
  }, [levelId, workspaceId, levelHydrated]);

  useEffect(() => {
    if (!levelHydrated) return;
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (materialId) params.set("material", materialId);
      if (brandId) params.set("brand", brandId);
      if (providerId) params.set("provider", providerId);
      if (taxStatus) params.set("tax", taxStatus);
      if (levelId) params.set("level", levelId);
      if (month) params.set("month", month);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const qs = params.toString();
      replaceUrl(qs ? `${pathname}?${qs}` : pathname);
    }, 300);
    return () => clearTimeout(t);
  }, [
    search,
    materialId,
    brandId,
    providerId,
    taxStatus,
    levelId,
    month,
    dateFrom,
    dateTo,
    pathname,
    levelHydrated,
  ]);

  const materialOptions = useMemo(() => uniqueOptions(rows.map((r) => r.material)), [rows]);
  const brandOptions = useMemo(() => uniqueOptions(rows.map((r) => r.brand)), [rows]);
  const providerOptions = useMemo(() => uniqueOptions(rows.map((r) => r.provider)), [rows]);
  const levelOptions = useMemo(() => uniqueOptions(rows.map((r) => r.level)), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (materialId && r.material.id !== materialId) return false;
      if (brandId && r.brand?.id !== brandId) return false;
      if (providerId && r.provider?.id !== providerId) return false;
      if (taxStatus && r.tax_status !== taxStatus) return false;
      if (levelId && r.level?.id !== levelId) return false;
      const paidDay = r.paid_at?.slice(0, 10) ?? "";
      if (dateFrom && paidDay < dateFrom) return false;
      if (dateTo && paidDay > dateTo) return false;
      if (q) {
        const haystack = [r.material.name, r.brand?.name, r.provider?.name, r.invoice_ref]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, materialId, brandId, providerId, taxStatus, levelId, dateFrom, dateTo]);

  const totals = useMemo(() => {
    // Quantities add up across purchases; money is kept per currency.
    const map = new Map<
      string,
      {
        material: string;
        unit: string;
        quantity: number;
        lines: { currency: string; amount: number | null }[];
      }
    >();
    filtered.forEach((r) => {
      const key = `${r.material.id}__${r.unit.id}`;
      const prev = map.get(key) ?? {
        material: r.material.name,
        unit: r.unit.name,
        quantity: 0,
        lines: [],
      };
      prev.quantity += r.quantity;
      prev.lines.push({ currency: r.currency, amount: r.subtotal });
      map.set(key, prev);
    });
    return [...map.values()]
      .map(({ lines, ...t }) => ({ ...t, subtotals: totalsByCurrency(lines) }))
      .sort((a, b) => a.material.localeCompare(b.material));
  }, [filtered]);

  const filteredTotals = useMemo(
    () => totalsByCurrency(filtered.map((r) => ({ currency: r.currency, amount: r.subtotal }))),
    [filtered],
  );
  const hasFilters = !!(
    search ||
    materialId ||
    brandId ||
    providerId ||
    taxStatus ||
    month ||
    dateFrom ||
    dateTo
  );

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
  };

  const clearFilters = () => {
    setSearch("");
    setMaterialId("");
    setBrandId("");
    setProviderId("");
    setTaxStatus("");
    setMonth("");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="min-h-screen text-gray-900">
      <nav className="top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3 text-sm">
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-6">
          <PageTitle>Materiales</PageTitle>
          <p className="text-sm text-gray-500 mt-1">
            Todo lo comprado, agrupado por material y en detalle por gasto.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm font-semibold text-gray-700 mb-1">Sin materiales aún</p>
            <p className="text-xs text-gray-400">Agrega materiales a un gasto para verlos aquí.</p>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-col gap-3 rounded-xl border border-gray-200 p-3 sm:p-4 mb-6">
              <div className="flex gap-2 items-center">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Buscar material, marca, proveedor o factura..."
                  className="flex-1"
                />
                {hasFilters && <ClearFiltersButton onClick={clearFilters} />}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <FilterSelect
                  label="Material"
                  value={materialId}
                  onChange={setMaterialId}
                  allLabel="Todos los materiales"
                  options={materialOptions}
                />
                <FilterSelect
                  label="Marca"
                  value={brandId}
                  onChange={setBrandId}
                  allLabel="Todas las marcas"
                  options={brandOptions}
                />
                <FilterSelect
                  label="Proveedor"
                  value={providerId}
                  onChange={setProviderId}
                  allLabel="Todos los proveedores"
                  options={providerOptions}
                />
                <FilterSelect
                  label="Nivel"
                  value={levelId}
                  onChange={setLevelId}
                  allLabel="Todos los niveles"
                  options={levelOptions}
                />
                <FilterSelect
                  label="Tipo de compra"
                  value={taxStatus}
                  onChange={setTaxStatus}
                  allLabel="Todas"
                  options={TAX_STATUS_OPTIONS}
                />
              </div>

              <div className={BOX_CLASS}>
                <p className={LABEL_CLASS}>Fecha de pago</p>
                <div className="flex flex-wrap sm:flex-nowrap gap-2">
                  <InputWithTooltip label="Mes de pago" className="w-full sm:w-auto min-w-0">
                    <input
                      type="month"
                      value={month}
                      onChange={(e) => handleMonthChange(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </InputWithTooltip>
                  <InputWithTooltip label="Pagado desde" className="flex-1 min-w-0">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        setMonth("");
                      }}
                      className={INPUT_CLASS}
                    />
                  </InputWithTooltip>
                  <InputWithTooltip label="Pagado hasta" className="flex-1 min-w-0">
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setMonth("");
                      }}
                      className={INPUT_CLASS}
                    />
                  </InputWithTooltip>
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-16 text-sm text-gray-400">
                No se encontraron materiales para ese filtro.
              </div>
            ) : (
              <>
                {/* Totals summary */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6">
                  <div className="px-4 sm:px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                      Resumen por material
                    </span>
                  </div>
                  {totals.map((t, i) => (
                    <div
                      key={`${t.material}-${t.unit}-${i}`}
                      className={`flex items-center justify-between gap-4 px-4 sm:px-5 py-3 ${
                        i < totals.length - 1 ? "border-b border-gray-100" : ""
                      }`}
                    >
                      <span className="text-sm font-semibold text-gray-800 min-w-0">
                        {t.material}
                      </span>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <span className="text-sm text-gray-500">
                          {t.quantity} {t.unit}
                        </span>
                        <span className="text-sm font-semibold text-gray-700 min-w-24 text-right tabular-nums">
                          {t.subtotals.some((x) => x.amount > 0) ? formatTotals(t.subtotals) : "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-4 px-4 sm:px-5 py-3 border-t border-gray-200 bg-gray-50/60">
                    <span className="text-sm font-bold text-gray-800">Total</span>
                    <span className="text-sm font-bold text-gray-900">
                      {formatTotals(filteredTotals)}
                    </span>
                  </div>
                </div>

                {/* Detail list */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-4 sm:px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                      Detalle ({filtered.length})
                    </span>
                  </div>
                  {filtered.map((r, i) => (
                    <Link
                      key={r.id}
                      href={`/admin/workspaces/${workspaceSlug}/expenses/${r.expense_id}`}
                      className={`flex items-center justify-between gap-4 px-4 sm:px-5 py-3.5 hover:bg-gray-50/60 transition-colors ${
                        i < filtered.length - 1 ? "border-b border-gray-100" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-cyan-600 uppercase tracking-wide mb-0.5">
                          {r.level?.name ?? "Sin nivel"}
                        </p>
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {r.material.name}
                          {r.brand && (
                            <span className="text-gray-400 font-normal"> · {r.brand.name}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {formatSafeDate(r.paid_at, "d MMM yyyy")} · {r.quantity} {r.unit.name}
                          {r.provider && <> · {r.provider.name}</>}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <TaxBadge status={r.tax_status} />
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
                  <div className="flex items-center justify-between gap-4 px-4 sm:px-5 py-3 border-t border-gray-200 bg-gray-50/60">
                    <span className="text-sm font-bold text-gray-800">Total</span>
                    <span className="text-sm font-bold text-gray-900">
                      {formatTotals(filteredTotals)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Prices from purchases without IGV aren't comparable with invoiced ones, so
// they are labelled; "con IGV" is the normal case and stays unmarked.
function TaxBadge({ status }: { status: TaxStatus | null }) {
  if (status !== "sin_igv" && status !== "sin_comprobante") return null;
  return (
    <span className="mb-0.5 inline-block rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
      {TAX_STATUS_LABELS[status]}
    </span>
  );
}
