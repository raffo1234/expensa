import { format, parseISO, formatDistanceToNow, isValid } from "date-fns";
import { es } from "date-fns/locale";

export type DateStyle = "short" | "long" | "relative" | "full" | "api";

export const formatTimestamp = (
  timestamp: string | null | undefined,
  style: DateStyle = "short",
): string => {
  if (!timestamp) return "";

  const date = parseISO(timestamp);

  if (!isValid(date)) {
    console.error(`Invalid timestamp provided to formatDate: ${timestamp}`);
    return "";
  }

  switch (style) {
    case "short":
      return format(date, "dd/MM/yyyy");

    case "long":
      return format(date, "d 'de' MMMM, yyyy", { locale: es });

    case "relative":
      return formatDistanceToNow(date, { addSuffix: true, locale: es });

    case "full":
      return format(date, "eeee, d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es });

    case "api":
      return format(date, "yyyy-MM-dd");

    default:
      return format(date, "dd/MM/yyyy");
  }
};
