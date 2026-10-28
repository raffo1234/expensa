"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAccess } from "@/lib/access";
import { Permissions } from "@/types/propertyState";
import { safePageSize } from "@/lib/pageSize";

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
};

const EXPORT_PAGE_SIZE = 1000;

/* eslint-disable @typescript-eslint/no-explicit-any */
async function applySummaryFilters(query: any, f: SummaryFilters): Promise<any> {
  let q =
    f.tab === "facturas"
      ? query.not("invoice_series", "is", null).not("invoice_number", "is", null)
      : query.is("invoice_series", null).is("invoice_number", null);

  // Characters with meaning in PostgREST filter strings are dropped so the
  // search text can't change the shape of the query.
  const term = f.search.replace(/[,()*%\\]/g, " ").trim();
  if (term) {
    const { data: providers } = await supabaseAdmin
      .from("provider")
      .select("id")
      .eq("workspace_id", f.workspaceId)
      .ilike("name", `%${term}%`);
    const providerIds = (providers ?? []).map((p) => p.id);
    q = q.or(
      [
        `invoice_series.ilike.%${term}%`,
        `invoice_number.ilike.%${term}%`,
        `notes.ilike.%${term}%`,
        ...(providerIds.length ? [`provider_id.in.(${providerIds.join(",")})`] : []),
      ].join(","),
    );
  }

  if (f.categoryId) q = q.eq("category_id", f.categoryId);
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
  const query = await applySummaryFilters(
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
      .order("id") // stable paging when several expenses share a date
      .range(from, from + size - 1),
    filters,
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
  const all: unknown[] = [];
  for (let from = 0; ; from += EXPORT_PAGE_SIZE) {
    const query = await applySummaryFilters(
      supabaseAdmin
        .from("expense")
        .select(
          `id, invoice_series, invoice_number, amount, currency, paid_at, payment_method, notes,
           provider:provider_id(id, name, ruc),
           category:category_id(id, name, color)`,
        )
        .eq("workspace_id", filters.workspaceId)
        .order("paid_at", { ascending: true })
        .order("id")
        .range(from, from + EXPORT_PAGE_SIZE - 1),
      filters,
    );
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    all.push(...(data ?? []));
    if (!data || data.length < EXPORT_PAGE_SIZE) break;
  }
  return all;
}
