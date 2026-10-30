"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireWorkspaceAccess } from "@/lib/access";
import { sumExpenseAmounts } from "@/lib/sumExpenseAmounts";
import { safePageSize } from "@/lib/pageSize";
import { EXPENSE_LIST_COLUMNS as LIST_COLUMNS, onlyRequiredDocs } from "@/lib/expenseListColumns";
import { NO_ID, pendingDocsExpenseIds } from "@/lib/pendingDocs";
import { categoryIdList, type ExpenseFilters } from "@/types/expenseFilters";
import type { ExpenseRow } from "@/types/ExpenseType";
import type { CurrencyTotal } from "@/utils/formatAmount";

// Expense list, totals and exports for the expenses page. They run on the
// server with the caller's workspace access checked, instead of querying the
// database from the browser.

const EXPORT_COLUMNS = `id, invoice_series, invoice_number, amount, currency,
  issued_at, paid_at, payment_method, notes,
  provider:provider_id(id, name, ruc),
  category:category_id(id, name, color)`;

const EXPORT_PAGE_SIZE = 1000;

// Supabase builder types change with every chained call; treat them loosely here.
/* eslint-disable @typescript-eslint/no-explicit-any */
function applyExpenseFilters(
  query: any,
  filters: ExpenseFilters,
  orClause: string | null,
  pendingIds: string[] | null = null,
): any {
  let q = query;
  // Invoices still missing a required document (computed by pendingDocsExpenseIds).
  if (filters.pendingDocs && pendingIds) q = q.in("id", pendingIds.length ? pendingIds : [NO_ID]);
  const ids = categoryIdList(filters.categoryId);
  if (ids.length === 1) q = q.eq("category_id", ids[0]);
  if (ids.length > 1) q = q.in("category_id", ids);
  if (filters.stageId) q = q.eq("stage_id", filters.stageId);
  if (filters.levelId) q = q.eq("level_id", filters.levelId);
  if (filters.providerId) q = q.eq("provider_id", filters.providerId);
  const series = filters.invoiceSeries?.trim();
  const number = filters.invoiceNumber?.trim();
  if (series) q = q.ilike("invoice_series", `%${series}%`);
  if (number) q = q.ilike("invoice_number", `%${number}%`);
  if (orClause) q = q.or(orClause);
  if (filters.issuedFrom) q = q.gte("issued_at", filters.issuedFrom);
  if (filters.issuedTo) q = q.lte("issued_at", filters.issuedTo);
  if (filters.amountMin) q = q.gte("amount", Math.round(parseFloat(filters.amountMin) * 100));
  if (filters.amountMax) q = q.lte("amount", Math.round(parseFloat(filters.amountMax) * 100));
  return q;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function buildSearchClause(workspaceId: string, search: string): Promise<string | null> {
  // Characters with meaning in PostgREST filter strings are dropped so the
  // search text can't change the shape of the query.
  const q = search.replace(/[,()*%\\]/g, " ").trim();
  if (!q) return null;

  const clauses: string[] = [
    `invoice_series.ilike.%${q}%`,
    `invoice_number.ilike.%${q}%`,
    `notes.ilike.%${q}%`,
  ];

  const { data: matchingProviders } = await supabaseAdmin
    .from("provider")
    .select("id")
    .eq("workspace_id", workspaceId)
    .or(`name.ilike.%${q}%,ruc.ilike.%${q}%`);
  const providerIds = (matchingProviders ?? []).map((p) => p.id);
  if (providerIds.length > 0) clauses.push(`provider_id.in.(${providerIds.join(",")})`);

  const num = parseFloat(q);
  if (!isNaN(num) && num > 0) clauses.push(`amount.eq.${Math.round(num * 100)}`);

  return clauses.join(",");
}

/** Search clause and (only when filtering by it) the documents lookup, side by side. */
async function prepareFilters(workspaceId: string, search: string, filters: ExpenseFilters) {
  const [orClause, pendingIds] = await Promise.all([
    buildSearchClause(workspaceId, search),
    filters.pendingDocs ? pendingDocsExpenseIds(workspaceId) : null,
  ]);
  return { orClause, pendingIds };
}

export async function listExpenses(
  workspaceId: string,
  page: number,
  pageSize: number,
  search: string,
  filters: ExpenseFilters,
): Promise<{ rows: ExpenseRow[]; count: number }> {
  // The access check runs alongside the queries instead of before them; if it
  // fails, Promise.all rejects and no data ever leaves the server.
  const guard = requireWorkspaceAccess(workspaceId);
  guard.catch(() => {}); // rejection is handled by Promise.all below

  const size = safePageSize(pageSize);
  const from = (page - 1) * size;
  const { orClause, pendingIds } = await prepareFilters(workspaceId, search, filters);

  const [, { data, error, count }] = await Promise.all([
    guard,
    applyExpenseFilters(
      onlyRequiredDocs(
        supabaseAdmin
          .from("expense")
          .select(LIST_COLUMNS, { count: "exact" })
          .eq("workspace_id", workspaceId)
          .order("paid_at", { ascending: false })
          .order("created_at", { ascending: false })
          .order("id") // stable paging when several expenses share a date
          .range(from, from + size - 1),
      ),
      filters,
      orClause,
      pendingIds,
    ),
  ]);
  if (error) throw new Error(error.message);

  return { rows: (data ?? []) as unknown as ExpenseRow[], count: count ?? 0 };
}

/**
 * Totals per currency for the current filters. Separate from the list so
 * changing page doesn't recompute them (they don't depend on the page).
 */
export async function getExpenseTotals(
  workspaceId: string,
  search: string,
  filters: ExpenseFilters,
): Promise<CurrencyTotal[]> {
  const guard = requireWorkspaceAccess(workspaceId);
  guard.catch(() => {}); // rejection is handled by Promise.all below
  const { orClause, pendingIds } = await prepareFilters(workspaceId, search, filters);
  const [, totals] = await Promise.all([
    guard,
    sumExpenseAmounts(workspaceId, (q) => applyExpenseFilters(q, filters, orClause, pendingIds)),
  ]);
  return totals;
}

export async function listAllFilteredExpenses(
  workspaceId: string,
  search: string,
  filters: ExpenseFilters,
): Promise<ExpenseRow[]> {
  await requireWorkspaceAccess(workspaceId);
  const { orClause, pendingIds } = await prepareFilters(workspaceId, search, filters);

  const all: ExpenseRow[] = [];
  for (let from = 0; ; from += EXPORT_PAGE_SIZE) {
    const { data, error } = await applyExpenseFilters(
      supabaseAdmin
        .from("expense")
        .select(EXPORT_COLUMNS)
        .eq("workspace_id", workspaceId)
        .order("paid_at", { ascending: true })
        .order("created_at", { ascending: true })
        // Tie-breaker: without it, rows sharing a date can be skipped or repeated across pages.
        .order("id")
        .range(from, from + EXPORT_PAGE_SIZE - 1),
      filters,
      orClause,
      pendingIds,
    );
    if (error) throw new Error(error.message);
    all.push(...((data ?? []) as unknown as ExpenseRow[]));
    if (!data || data.length < EXPORT_PAGE_SIZE) break;
  }
  return all;
}
