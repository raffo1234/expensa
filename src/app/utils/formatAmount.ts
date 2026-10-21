const LOCALE_BY_CURRENCY: Record<string, string> = {
  PEN: "es-PE",
  USD: "en-US",
  EUR: "es-ES",
  MXN: "es-MX",
  COP: "es-CO",
  CLP: "es-CL",
  ARS: "es-AR",
  BRL: "pt-BR",
};

export function formatAmount(amount: number, currency?: string | null): string {
  const code = currency?.toUpperCase() ?? "PEN";
  const locale = LOCALE_BY_CURRENCY[code] ?? "es-PE";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

export type CurrencyTotal = { currency: string; amount: number };

/**
 * Formats totals that may span several currencies as "S/ 1,200.00 · US$ 300.00".
 * Amounts in different currencies are never added together.
 */
export function formatTotals(totals: CurrencyTotal[], fallbackCurrency = "PEN"): string {
  const nonZero = totals.filter((t) => t.amount !== 0);
  if (!nonZero.length) return formatAmount(0, fallbackCurrency);
  return [...nonZero]
    .sort((a, b) => (a.currency === "PEN" ? -1 : b.currency === "PEN" ? 1 : b.amount - a.amount))
    .map((t) => formatAmount(t.amount, t.currency))
    .join(" · ");
}

/** Adds amounts per currency (codes are trimmed and upper-cased). */
export function totalsByCurrency(
  items: { currency?: string | null; amount: number | null | undefined }[],
): CurrencyTotal[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const code = (item.currency ?? "PEN").trim().toUpperCase() || "PEN";
    map.set(code, (map.get(code) ?? 0) + (item.amount ?? 0));
  }
  return [...map].map(([currency, amount]) => ({ currency, amount }));
}
