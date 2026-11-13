"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAccess } from "@/lib/access";
import { Permissions } from "@/types/propertyState";
import { safePageSize } from "@/lib/pageSize";
import { sumExpenseAmounts } from "@/lib/sumExpenseAmounts";
import type { CurrencyTotal } from "@/utils/formatAmount";
import { categoryIdList } from "@/types/expenseFilters";
import { NO_ID, pendingDocsExpenseIds } from "@/lib/pendingDocs";

// Queries for the expenses summary page (invoices / expenses tabs), run on the
// server after checking the caller can access the workspace.

export type SummaryTab = "facturas" | "gastos";

export type SummaryFilters = {
  workspaceId: string;
  search: string;
  dateFrom: string;
  dateTo: string;
  tab: SummaryTab;
  categoryId: string;
  invoiceSeries: string;
  invoiceNumber: string;
  // Same filters as the expenses page (all optional).
  providerId?: string;
  stageId?: string;
  levelId?: string;
  amountMin?: string;
  amountMax?: string;
  /** "1": invoices still missing a required document (invoices tab only). */
  pendingDocs?: string;
};

const EXPORT_PAGE_SIZE = 1000;

/* eslint-disable @typescript-eslint/no-explicit-any */
type PreparedFilters = { providerIds: string[] | null; pendingIds: string[] | null };

/** The lookups some filters need (search by provider name, pending documents), side by side. */
async function prepareSummaryFilters(f: SummaryFilters): Promise<PreparedFilters> {
  // Characters with meaning in PostgREST filter strings are dropped so the
  // search text can't change the shape of the query.
  const term = f.search.replace(/[,()*%\\]/g, " ").trim();
  const [providerIds, pendingIds] = await Promise.all([
    term
      ? supabaseAdmin
          .from("provider")
          .select("id")
          .eq("workspace_id", f.workspaceId)
          .ilike("name", `%${term}%`)
          .then(({ data }) => (data ?? []).map((p) => p.id as string))
      : null,
    f.pendingDocs && f.tab === "facturas" ? pendingDocsExpenseIds(f.workspaceId) : null,
  ]);
  return { providerIds, pendingIds };
}

/**
 * Applies the summary filters to a query (synchronous, so the totals helper
 * can use it too). Lists, totals and exports all go through here.
 */
function applySummaryFilters(query: any, f: SummaryFilters, p: PreparedFilters): any {
  // The two tabs split ALL expenses: an invoice has both series and number;
  // everything else (one or both missing) is under "gastos", so no expense is
  // left out of both tabs.
  let q =
    f.tab === "facturas"
      ? query.not("invoice_series", "is", null).not("invoice_number", "is", null)
      : query.or("invoice_series.is.null,invoice_number.is.null");

  const term = f.search.replace(/[,()*%\\]/g, " ").trim();
  if (term) {
    q = q.or(
      [
        `invoice_series.ilike.%${term}%`,
        `invoice_number.ilike.%${term}%`,
        `notes.ilike.%${term}%`,
        ...(p.providerIds?.length ? [`provider_id.in.(${p.providerIds.join(",")})`] : []),
      ].join(","),
    );
  }

  // Several categories at once (comma-joined ids), as on the expenses page.
  const categoryIds = categoryIdList(f.categoryId);
  if (categoryIds.length === 1) q = q.eq("category_id", categoryIds[0]);
  if (categoryIds.length > 1) q = q.in("category_id", categoryIds);
  if (f.providerId) q = q.eq("provider_id", f.providerId);
  if (f.stageId) q = q.eq("stage_id", f.stageId);
  if (f.levelId) q = q.eq("level_id", f.levelId);
  const min = parseFloat(f.amountMin ?? "");
  const max = parseFloat(f.amountMax ?? "");
  if (!isNaN(min)) q = q.gte("amount", Math.round(min * 100));
  if (!isNaN(max)) q = q.lte("amount", Math.round(max * 100));
  if (p.pendingIds) q = q.in("id", p.pendingIds.length ? p.pendingIds : [NO_ID]);
  const series = f.invoiceSeries?.trim();
  const number = f.invoiceNumber?.trim();
  if (series) q = q.ilike("invoice_series", `%${series}%`);
  if (number) q = q.ilike("invoice_number", `%${number}%`);
  if (f.dateFrom) q = q.gte("issued_at", f.dateFrom);
  if (f.dateTo) q = q.lte("issued_at", f.dateTo);
  return q;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function listSummaryExpenses(filters: SummaryFilters, page: number, pageSize: number) {
  // The access check runs alongside the query instead of before it; if it
  // fails, Promise.all rejects and no data ever leaves the server.
  const guard = requireAccess({
    workspaceId: filters.workspaceId,
    permissions: [Permissions.VIEW_EXPENSES_SUMMARY],
  });
  guard.catch(() => {}); // rejection is handled by Promise.all below
  const size = safePageSize(pageSize);
  const from = page * size;
  const prepared = await prepareSummaryFilters(filters);
  const query = applySummaryFilters(
    supabaseAdmin
      .from("expense")
      .select(
        `id, invoice_series, invoice_number, amount, currency, issued_at, paid_at, payment_method, notes,
         provider:provider_id(id, name, ruc),
         category:category_id(id, name, color),
         expense_attachment(id, file_name, storage_path)`,
        { count: "exact" },
      )
      .eq("workspace_id", filters.workspaceId)
      .order("paid_at", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id") // stable paging when several expenses share a date
      .range(from, from + size - 1),
    filters,
    prepared,
  );
  const [, { data, count, error }] = await Promise.all([guard, query]);
  if (error) throw new Error(error.message);
  return { data: data ?? [], count: (count as number | null) ?? 0 };
}

export async function listAllSummaryExpenses(filters: SummaryFilters) {
  await requireAccess({
    workspaceId: filters.workspaceId,
    permissions: [Permissions.VIEW_EXPENSES_SUMMARY],
  });
  const prepared = await prepareSummaryFilters(filters);
  const all: unknown[] = [];
  for (let from = 0; ; from += EXPORT_PAGE_SIZE) {
    const query = applySummaryFilters(
      supabaseAdmin
        .from("expense")
        .select(
          `id, invoice_series, invoice_number, amount, currency, paid_at, payment_method, notes,
           provider:provider_id(id, name, ruc),
           category:category_id(id, name, color)`,
        )
        .eq("workspace_id", filters.workspaceId)
        .order("paid_at", { ascending: true })
        .order("created_at", { ascending: true })
        .order("id")
        .range(from, from + EXPORT_PAGE_SIZE - 1),
      filters,
      prepared,
    );
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    all.push(...(data ?? []));
    if (!data || data.length < EXPORT_PAGE_SIZE) break;
  }
  return all;
}

/**
 * Totals per currency for the current filters (all pages), like the expenses
 * page. Separate from the list, so changing page doesn't recompute them.
 */
export async function getSummaryTotals(filters: SummaryFilters): Promise<CurrencyTotal[]> {
  const guard = requireAccess({
    workspaceId: filters.workspaceId,
    permissions: [Permissions.VIEW_EXPENSES_SUMMARY],
  });
  guard.catch(() => {}); // rejection is handled by Promise.all below
  const prepared = await prepareSummaryFilters(filters);
  const [, totals] = await Promise.all([
    guard,
    sumExpenseAmounts(filters.workspaceId, (q) => applySummaryFilters(q, filters, prepared)),
  ]);
  return totals;
}
