"use client";

import { useSWRConfig } from "swr";

// SWR keys of the cached lists that show expense data (rows, guide status,
// totals). Kept in sync with the keys used in ExpensesClient and SummaryClient.
const LIST_KEYS = new Set(["expenses", "expense-totals", "summary"]);

/**
 * Returns a function that drops the cached expense lists, so going back to
 * them shows fresh data instead of what was cached before a change (e.g. the
 * guide status after uploading or retyping an attachment). Lists on screen
 * refetch right away; the others load fresh the next time they're opened.
 */
export function useInvalidateExpenseLists() {
  const { mutate } = useSWRConfig();
  return () =>
    mutate((key) => Array.isArray(key) && LIST_KEYS.has(key[0] as string), undefined, {
      revalidate: true,
    });
}
