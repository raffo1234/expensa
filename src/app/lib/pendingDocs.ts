// Which invoices of a project still lack a required document. Server only.
import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DOCS_DATE_CLAUSE, REQUIRED_DOCS, docsStatus } from "@/lib/expenseDocs";

/**
 * Ids of the project's invoices under the documents rule that are still
 * missing something. Uses the same docsStatus() as the screens (category rule
 * and exemptions included), so the filter, the counts and the table agree.
 * Callers check access first.
 */
export async function pendingDocsExpenseIds(workspaceId: string): Promise<string[]> {
  // Only invoices under the rule (from the start date): a short list.
  const { data: invoices, error } = await supabaseAdmin
    .from("expense")
    .select(
      "id, invoice_series, invoice_number, issued_at, paid_at, guide_exempt_reason, category:category_id(requires_guide)",
    )
    .eq("workspace_id", workspaceId)
    .not("invoice_series", "is", null)
    .not("invoice_number", "is", null)
    .or(DOCS_DATE_CLAUSE);
  if (error) throw new Error(error.message);
  if (!invoices?.length) return [];

  const { data: attached, error: attError } = await supabaseAdmin
    .from("expense_attachment")
    .select("expense_id, kind")
    .in("kind", [...REQUIRED_DOCS])
    .in(
      "expense_id",
      invoices.map((e) => e.id),
    );
  if (attError) throw new Error(attError.message);

  const kindsByExpense = new Map<string, string[]>();
  for (const a of attached ?? []) {
    const list = kindsByExpense.get(a.expense_id) ?? [];
    list.push(a.kind);
    kindsByExpense.set(a.expense_id, list);
  }

  return invoices
    .filter((e) => {
      const category = Array.isArray(e.category) ? e.category[0] : e.category;
      return docsStatus({ ...e, category }, kindsByExpense.get(e.id) ?? []).state === "pending";
    })
    .map((e) => e.id);
}

/** A uuid no row has: makes `id in (...)` match nothing when the list is empty. */
export const NO_ID = "00000000-0000-0000-0000-000000000000";
