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
  }).format(amount);
}
