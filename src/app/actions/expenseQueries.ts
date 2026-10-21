"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireWorkspaceAccess } from "@/lib/access";
import { sumExpenseAmounts } from "@/lib/sumExpenseAmounts";
import { categoryIdList, type ExpenseFilters } from "@/types/expenseFilters";
import type { ExpenseRow } from "@/types/ExpenseType";

// Expense list, totals and exports for the expenses page. They run on the
// server with the caller's workspace access checked, instead of querying the
// database from the browser.

const LIST_COLUMNS = `id, invoice_series, invoice_number, amount, currency,
  issued_at, paid_at, payment_method, notes, created_at,
  provider:provider_id(id, name, ruc),
  category:category_id(id, name, color)`;

const EXPORT_COLUMNS = `id, invoice_series, invoice_number, amount, currency,
  issued_at, paid_at, payment_method, notes,
  provider:provider_id(id, name, ruc),
  category:category_id(id, name, color)`;

const EXPORT_PAGE_SIZE = 1000;

// Supabase builder types change with every chained call; treat them loosely here.
/* eslint-disable @typescript-eslint/no-explicit-any */
function applyExpenseFilters(query: any, filters: ExpenseFilters, orClause: string | null): any {
  let q = query;
  const ids = categoryIdList(filters.categoryId);
  if (ids.length === 1) q = q.eq("category_id", ids[0]);
  if (ids.length > 1) q = q.in("category_id", ids);
  if (filters.stageId) q = q.eq("stage_id", filters.stageId);
  if (filters.levelId) q = q.eq("level_id", filters.levelId);
  if (filters.providerId) q = q.eq("provider_id", filters.providerId);
  if (filters.invoiceSeries) q = q.ilike("invoice_series", `%${filters.invoiceSeries}%`);
  if (filters.invoiceNumber) q = q.ilike("invoice_number", `%${filters.invoiceNumber}%`);
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

export async function listExpenses(
  workspaceId: string,
  page: number,
  pageSize: number,
  search: string,
  filters: ExpenseFilters,
): Promise<{ rows: ExpenseRow[]; count: number; totalAmount: number }> {
  await requireWorkspaceAccess(workspaceId);
  const from = (page - 1) * pageSize;
  const orClause = await buildSearchClause(workspaceId, search);

  const query = applyExpenseFilters(
    supabaseAdmin
      .from("expense")
      .select(LIST_COLUMNS, { count: "exact" })
      .eq("workspace_id", workspaceId)
      .order("paid_at", { ascending: false })
      .order("id") // stable paging when several expenses share a date
      .range(from, from + pageSize - 1),
    filters,
    orClause,
  );

  const [{ data, error, count }, totalAmount] = await Promise.all([
    query,
    sumExpenseAmounts(workspaceId, (q) => applyExpenseFilters(q, filters, orClause)),
  ]);
  if (error) throw new Error(error.message);

  return { rows: (data ?? []) as unknown as ExpenseRow[], count: count ?? 0, totalAmount };
}

export async function listAllFilteredExpenses(
  workspaceId: string,
  search: string,
  filters: ExpenseFilters,
): Promise<ExpenseRow[]> {
  await requireWorkspaceAccess(workspaceId);
  const orClause = await buildSearchClause(workspaceId, search);

  const all: ExpenseRow[] = [];
  for (let from = 0; ; from += EXPORT_PAGE_SIZE) {
    const { data, error } = await applyExpenseFilters(
      supabaseAdmin
        .from("expense")
        .select(EXPORT_COLUMNS)
        .eq("workspace_id", workspaceId)
        .order("paid_at", { ascending: true })
        // Tie-breaker: without it, rows sharing a date can be skipped or repeated across pages.
        .order("id")
        .range(from, from + EXPORT_PAGE_SIZE - 1),
      filters,
      orClause,
    );
    if (error) throw new Error(error.message);
    all.push(...((data ?? []) as unknown as ExpenseRow[]));
    if (!data || data.length < EXPORT_PAGE_SIZE) break;
  }
  return all;
}
