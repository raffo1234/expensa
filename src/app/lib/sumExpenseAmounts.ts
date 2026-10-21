import { supabase } from "@/lib/supabase";

// Sums expense amounts (in cents) for a workspace with any filters applied.
// Supabase returns at most 1,000 rows per request, so summing a plain
// `select("amount")` silently undercounts large workspaces. This asks the
// database for the sum first (needs PostgREST aggregates enabled) and falls
// back to summing page by page when aggregates are off.

const PAGE_SIZE = 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApplyFilters = (query: any) => any;

// Remember a refusal so we don't retry the aggregate on every filter change.
let aggregatesUnavailable = false;

export async function sumExpenseAmounts(
  workspaceId: string,
  applyFilters: ApplyFilters = (q) => q,
): Promise<number> {
  if (!aggregatesUnavailable) {
    const { data, error } = await applyFilters(
      supabase.from("expense").select("amount.sum()").eq("workspace_id", workspaceId),
    );
    if (!error) {
      const row = (data as Record<string, number | null>[] | null)?.[0];
      return Number(row ? (Object.values(row)[0] ?? 0) : 0);
    }
    aggregatesUnavailable = true;
  }

  let total = 0;
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await applyFilters(
      supabase.from("expense").select("amount").eq("workspace_id", workspaceId),
    )
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data ?? []) as { amount: number | null }[];
    total += rows.reduce((acc, r) => acc + (r.amount ?? 0), 0);
    if (rows.length < PAGE_SIZE) break;
  }
  return total;
}
