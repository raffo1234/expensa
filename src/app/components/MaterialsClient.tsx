"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import FormSection from "@/components/FormSection";
import SearchInput from "@/components/SearchInput";
import ClearFiltersButton from "@/components/ClearFiltersButton";
import FiltersButton from "@/components/FiltersButton";
import Field from "@/components/Field";
import ListPage from "@/components/ListPage";
import PageNavigator from "@/components/PageNavigator";
import DataTable, { DataTableRow, RowLink, Td, type DataTableColumn } from "@/components/DataTable";
import { usePageSize } from "@/hooks/usePageSize";
import type { MaterialReportRow } from "@/actions/materials";
import { formatAmount, formatTotals, totalsByCurrency } from "@/utils/formatAmount";
import { formatSafeDate } from "@/lib/formatSafeDate";
import { replaceUrl } from "@/utils/replaceUrl";
import { INPUT_CLASS, SELECT_CLASS } from "@/constants";
import { TAX_STATUS_LABELS, type TaxStatus } from "@/lib/invoiceTax";

type Option = [id: string, name: string];

const TAX_STATUS_OPTIONS = Object.entries(TAX_STATUS_LABELS) as Option[];

const SUMMARY_COLUMNS: DataTableColumn[] = [
  { label: "Material" },
  { label: "Cantidad", align: "right" },
  { label: "Subtotal", align: "right" },
];

const DETAIL_COLUMNS: DataTableColumn[] = [
  { label: "Material" },
  { label: "Marca" },
  { label: "Nivel" },
  { label: "Proveedor" },
  { label: "Fecha de pago" },
  { label: "Cantidad", align: "right" },
  { label: "P. unit.", align: "right" },
  { label: "Subtotal", align: "right" },
];

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
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={SELECT_CLASS}>
        <option value="">{allLabel}</option>
        {options.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </Field>
  );
}

// Footer row with the filtered total, aligned to the last column.
function TotalRow({ colSpan, total }: { colSpan: number; total: string }) {
  return (
    <tr className="bg-navy-50">
      <Td colSpan={colSpan} className="font-book text-navy-900">
        Total
      </Td>
      <Td align="right" className="font-book text-navy-900 tabular-nums">
        {total}
      </Td>
    </tr>
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
  // Open the panel on load when the URL already carries panel filters.
  const [showFilters, setShowFilters] = useState(() =>
    ["material", "brand", "provider", "tax", "level", "month", "from", "to"].some((k) =>
      searchParams.get(k),
    ),
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizePref] = usePageSize();
  const setPageSize = (size: number) => {
    setPageSizePref(size);
    setPage(1);
  };

  // A new filter starts back on the first page.
  useEffect(() => {
    setPage(1);
  }, [search, materialId, brandId, providerId, taxStatus, levelId, dateFrom, dateTo]);

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

  // Filters inside the panel (search is always visible, so it isn't counted).
  const advancedFilterCount = [
    materialId,
    brandId,
    providerId,
    taxStatus,
    levelId,
    month || dateFrom || dateTo,
  ].filter(Boolean).length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);
  const filteredTotal = formatTotals(filteredTotals);

  // Largest-impact currency first; soles lead when present (same as expenses).
  const primaryTotals = [...filteredTotals]
    .filter((t) => t.amount !== 0)
    .sort((a, b) => (a.currency === "PEN" ? -1 : b.currency === "PEN" ? 1 : b.amount - a.amount));

  const emptyMessage =
    rows.length === 0
      ? "Sin materiales aún. Agrega materiales a un gasto para verlos aquí."
      : "No se encontraron materiales para ese filtro.";

  // Always shown (disabled on a single page) so the table never jumps.
  const pager = (
    <PageNavigator
      page={currentPage}
      totalPages={totalPages}
      onPrev={() => setPage(Math.max(1, currentPage - 1))}
      onNext={() => setPage(Math.min(totalPages, currentPage + 1))}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
    />
  );

  return (
    <FormSection title="Materiales" backUrl={`/admin/workspaces/${workspaceSlug}/expenses`}>
      <ListPage
        pager={pager}
        controls={
          <>
            {/* 1 · How much was bought. */}
            <div>
              <p className="text-sm text-gray-600">
                {hasFilters ? "Total con los filtros aplicados" : "Total en materiales"}
              </p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 tabular-nums">
                {primaryTotals.length === 0 ? (
                  <span className="text-3xl font-semibold tracking-tight text-gray-900">
                    {formatTotals([])}
                  </span>
                ) : (
                  primaryTotals.map((t, i) => (
                    <span
                      key={t.currency}
                      className={
                        i === 0
                          ? "text-3xl font-semibold tracking-tight text-gray-900"
                          : "text-lg font-medium text-gray-700"
                      }
                    >
                      {formatTotals([t])}
                    </span>
                  ))
                )}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {filtered.length} {filtered.length === 1 ? "registro" : "registros"}
              </p>
            </div>

            {/* 2 · Search, plus the rest of the filters on demand. */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Buscar material, marca, proveedor o factura…"
                  className="col-span-2 sm:flex-1"
                />
                <div className="col-span-2 flex items-center gap-2 sm:contents">
                  <FiltersButton
                    open={showFilters}
                    count={advancedFilterCount}
                    controls="material-filters"
                    onClick={() => setShowFilters((v) => !v)}
                  />
                  <ClearFiltersButton onClick={clearFilters} disabled={!hasFilters} />
                </div>
              </div>

              {showFilters && (
                <div
                  id="material-filters"
                  className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50/70 p-4 sm:grid-cols-2 lg:grid-cols-4"
                >
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
                  <Field label="Mes de pago">
                    <input
                      type="month"
                      value={month}
                      onChange={(e) => handleMonthChange(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </Field>
                  <Field label="Pagado desde">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        setMonth("");
                      }}
                      className={INPUT_CLASS}
                    />
                  </Field>
                  <Field label="Pagado hasta">
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setMonth("");
                      }}
                      className={INPUT_CLASS}
                    />
                  </Field>
                </div>
              )}
            </div>

            {/* 3 · Totals per material for the current filters. */}
            <DataTable
              columns={SUMMARY_COLUMNS}
              numbered
              isEmpty={totals.length === 0}
              emptyMessage={emptyMessage}
            >
              {totals.map((t, i) => (
                <DataTableRow key={`${t.material}-${t.unit}-${i}`} number={i + 1}>
                  <Td className="font-book text-navy-900">{t.material}</Td>
                  <Td align="right" className="tabular-nums">
                    {t.quantity} {t.unit}
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {t.subtotals.some((x) => x.amount > 0) ? formatTotals(t.subtotals) : "—"}
                  </Td>
                </DataTableRow>
              ))}
              {totals.length > 0 && (
                <TotalRow colSpan={SUMMARY_COLUMNS.length} total={filteredTotal} />
              )}
            </DataTable>
          </>
        }
      >
        {/* 4 · Every purchase, linked to its expense. */}
        <DataTable
          columns={DETAIL_COLUMNS}
          numbered
          isEmpty={filtered.length === 0}
          emptyMessage={emptyMessage}
        >
          {pageRows.map((r, i) => {
            const href = `/admin/workspaces/${workspaceSlug}/expenses/${r.expense_id}`;
            return (
              <DataTableRow key={r.id} href={href} number={pageStart + i + 1}>
                <Td className="font-book text-navy-900">
                  <RowLink href={href}>
                    {r.material.name}
                    <span className="sr-only"> — ver gasto</span>
                  </RowLink>
                </Td>
                <Td>{r.brand?.name ?? "—"}</Td>
                <Td>{r.level?.name ?? "Sin nivel"}</Td>
                <Td>
                  <span className="block max-w-56 truncate">{r.provider?.name ?? "—"}</span>
                </Td>
                <Td>{formatSafeDate(r.paid_at, "d MMM yyyy")}</Td>
                <Td align="right" className="tabular-nums">
                  {r.quantity} {r.unit.name}
                </Td>
                <Td align="right" className="tabular-nums">
                  {r.unit_price != null ? formatAmount(r.unit_price, r.currency) : "—"}
                </Td>
                <Td align="right" className="font-book text-navy-900 tabular-nums">
                  <span className="inline-flex items-center justify-end gap-2">
                    <TaxBadge status={r.tax_status} />
                    {r.subtotal != null ? formatAmount(r.subtotal, r.currency) : "—"}
                  </span>
                </Td>
              </DataTableRow>
            );
          })}
          {filtered.length > 0 && (
            <TotalRow colSpan={DETAIL_COLUMNS.length} total={filteredTotal} />
          )}
        </DataTable>
      </ListPage>
    </FormSection>
  );
}

// Prices from purchases without IGV aren't comparable with invoiced ones, so
// they are labelled; "con IGV" is the normal case and stays unmarked.
function TaxBadge({ status }: { status: TaxStatus | null }) {
  if (status !== "sin_igv" && status !== "sin_comprobante") return null;
  return (
    <span className="inline-block rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
      {TAX_STATUS_LABELS[status]}
    </span>
  );
}
