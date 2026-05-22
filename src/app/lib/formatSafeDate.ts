import { format } from "date-fns";
import { es } from "date-fns/locale";

function toSafeDate(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr.slice(0, 10) + "T12:00:00");
}

export function formatSafeDate(dateStr: string | null, fmt: string) {
  const d = toSafeDate(dateStr);
  return d ? format(d, fmt, { locale: es }) : "—";
}
