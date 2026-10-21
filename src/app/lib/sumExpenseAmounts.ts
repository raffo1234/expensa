import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { totalsByCurrency, type CurrencyTotal } from "@/utils/formatAmount";

// Sums expense amounts (in cents) per currency for a workspace with any filters
// applied. Amounts in different currencies are never added together.
// Supabase returns at most 1,000 rows per request, so this asks the database
// for the grouped sum first (PostgREST aggregates) and falls back to summing
// page by page when aggregates are off.

const PAGE_SIZE = 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApplyFilters = (query: any) => any;

// Remember a refusal so we don't retry the aggregate on every filter change.
let aggregatesUnavailable = false;

export async function sumExpenseAmounts(
  workspaceId: string,
  applyFilters: ApplyFilters = (q) => q,
): Promise<CurrencyTotal[]> {
  if (!aggregatesUnavailable) {
    const { data, error } = await applyFilters(
      supabase.from("expense").select("currency, amount.sum()").eq("workspace_id", workspaceId),
    );
    if (!error) {
      return totalsByCurrency(
        ((data ?? []) as { currency: string | null; sum: number | null }[]).map((r) => ({
          currency: r.currency,
          amount: Number(r.sum ?? 0),
        })),
      );
    }
    aggregatesUnavailable = true;
  }

  const rows: { currency: string | null; amount: number | null }[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await applyFilters(
      supabase.from("expense").select("currency, amount").eq("workspace_id", workspaceId),
    )
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return totalsByCurrency(rows);
}
