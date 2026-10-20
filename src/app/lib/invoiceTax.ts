// Turns the line items read from an invoice into "what was actually paid",
// using the invoice's own tax summary. No fixed IGV rate is assumed: some
// invoices carry no IGV (exonerada, inafecta, Nuevo RUS) and some sectors use a
// reduced rate, so the factor always comes from the document itself.

export type TaxStatus = "con_igv" | "sin_igv" | "sin_comprobante";

export const TAX_STATUS_LABELS: Record<TaxStatus, string> = {
  con_igv: "Con IGV",
  sin_igv: "Sin IGV",
  sin_comprobante: "Sin comprobante",
};

export type DocumentType = "factura" | "boleta" | "nota_venta" | "recibo" | "voucher" | "otro";

export type ExtractedItem = {
  description: string;
  material: string;
  brand: string | null;
  quantity: number;
  unit: string | null;
  unit_price: number | null;
  line_total: number | null;
  is_material: boolean;
  taxed: boolean | null;
};

export type TaxSummary = {
  taxable: number | null;
  exempt: number | null;
  unaffected: number | null;
  igv: number | null;
  total: number | null;
} | null;

/**
 * ok          lines already add up to the amount paid
 * adjusted    lines were pre-tax; IGV was added using the invoice's own ratio
 * mismatch    lines don't add up to the total; left untouched for review
 * unverified  no total to compare against
 */
export type TotalsCheck = "ok" | "adjusted" | "mismatch" | "unverified";

export type PaidItem = ExtractedItem & {
  paid_total: number | null;
  paid_unit_price: number | null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

const lineTotal = (item: ExtractedItem) =>
  item.line_total ?? (item.unit_price != null ? item.quantity * item.unit_price : null);

// Invoices round each line, so allow a few cents of drift.
const tolerance = (total: number) => Math.max(0.05, Math.abs(total) * 0.002);

function withFactor(item: ExtractedItem, factor: number): PaidItem {
  const total = lineTotal(item);
  const paidTotal = total != null ? round2(total * factor) : null;
  return {
    ...item,
    paid_total: paidTotal,
    paid_unit_price:
      paidTotal != null && item.quantity > 0 ? round2(paidTotal / item.quantity) : item.unit_price,
  };
}

export function normalizeItemsToPaid(
  items: ExtractedItem[],
  summary: TaxSummary,
  invoiceTotal: number | null,
): { items: PaidItem[]; check: TotalsCheck } {
  const asIs = items.map((item) => withFactor(item, 1));
  const total = summary?.total ?? invoiceTotal;
  if (!items.length) return { items: [], check: "ok" };
  if (total == null) return { items: asIs, check: "unverified" };

  const totals = items.map(lineTotal);
  if (totals.some((t) => t == null)) return { items: asIs, check: "mismatch" };

  const tol = tolerance(total);
  const sum = (totals as number[]).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - total) <= tol) return { items: asIs, check: "ok" };

  // Lines are pre-tax: they add up to the taxable base (Op. Gravada) plus any
  // exempt/unaffected lines. Only taxed lines get the invoice's IGV ratio.
  const igv = summary?.igv ?? 0;
  const taxable = summary?.taxable ?? 0;
  if (igv > 0 && taxable > 0) {
    const taxedSum = items
      .filter((item) => item.taxed !== false)
      .reduce((acc, item) => acc + (lineTotal(item) ?? 0), 0);

    if (Math.abs(taxedSum - taxable) <= tol) {
      const factor = (taxable + igv) / taxable;
      const adjusted = items.map((item) => withFactor(item, item.taxed === false ? 1 : factor));
      const adjustedSum = adjusted.reduce((acc, item) => acc + (item.paid_total ?? 0), 0);
      if (Math.abs(adjustedSum - total) <= tol) return { items: adjusted, check: "adjusted" };
    }
  }

  return { items: asIs, check: "mismatch" };
}

export function resolveTaxStatus({
  documentType,
  igv,
  hasInvoiceRef,
}: {
  documentType: DocumentType | null;
  igv: number | null;
  hasInvoiceRef: boolean;
}): TaxStatus | null {
  // A payment voucher (transfer, Yape) proves payment, not the kind of purchase.
  if (documentType === "voucher") return null;
  if (igv != null && igv > 0) return "con_igv";
  const isFormal = hasInvoiceRef || documentType === "factura" || documentType === "boleta";
  if (igv === 0 && isFormal) return "sin_igv";
  if (!isFormal && documentType != null) return "sin_comprobante";
  // A formal receipt that doesn't state its IGV: let the user decide.
  return null;
}
