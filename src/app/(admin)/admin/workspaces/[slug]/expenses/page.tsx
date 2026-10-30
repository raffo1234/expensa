import { Suspense } from "react";
import { notFound } from "next/navigation";
import { findAccessibleWorkspaceBySlug } from "@/lib/access";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { checkPermissions } from "@/lib/checkPermissions";
import { Permissions } from "@/types/propertyState";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { sumExpenseAmounts } from "@/lib/sumExpenseAmounts";
import { EXPENSE_LIST_COLUMNS, onlyRequiredDocs } from "@/lib/expenseListColumns";
import ExpensesClient from "@/components/ExpensesClient";
import FallbackExpenses from "@/components/FallbackExpenses";

import { DEFAULT_PAGE_SIZE } from "@/lib/pageSize";
import type { ExpenseRow } from "@/types/ExpenseType";

// The first page is rendered at the default size; the list refetches if the
// user picked another size.
const ITEMS_PER_PAGE = DEFAULT_PAGE_SIZE;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ExpensesPage({ params }: PageProps) {
  const { slug } = await params;
  return (
    <Suspense fallback={<FallbackExpenses />}>
      <ExpensesSection slug={slug} />
    </Suspense>
  );
}

async function ExpensesSection({ slug }: { slug: string }) {
  // Only users who own or were assigned to this project may see it.
  const [workspace, user] = await Promise.all([
    findAccessibleWorkspaceBySlug(slug),
    getCurrentUser(),
  ]);
  if (!workspace || !user?.roleId) notFound();

  // Everything else in one round: rows, totals, filter options and permissions.
  const [
    permissions,
    { data: rows, error: expError, count },
    initialTotals,
    { data: categories },
    { data: stages },
    { data: levels },
    { data: providers },
  ] = await Promise.all([
    checkPermissions(user.roleId, [
      Permissions.CREATE_EXPENSE,
      Permissions.VIEW_MATERIALS,
      Permissions.EXEMPT_GUIDE,
    ]),
    onlyRequiredDocs(supabase.from("expense").select(EXPENSE_LIST_COLUMNS, { count: "exact" }))
      .eq("workspace_id", workspace.id)
      .order("paid_at", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id")
      .range(0, ITEMS_PER_PAGE - 1),
    sumExpenseAmounts(workspace.id),
    supabase
      .from("category")
      .select("id, name, color, requires_guide")
      .eq("workspace_id", workspace.id)
      .order("name"),
    supabase
      .from("stage")
      .select("id, name, color")
      .eq("workspace_id", workspace.id)
      .order("order"),
    supabase.from("level").select("id, name").eq("workspace_id", workspace.id).order("order"),
    supabase.from("provider").select("id, name").eq("workspace_id", workspace.id).order("name"),
  ]);

  if (expError) throw expError;

  const expenses = ((rows ?? []) as ExpenseRow[]).map((row) => {
    const cat = Array.isArray(row.category) ? row.category[0] : row.category;
    const prov = Array.isArray(row.provider) ? row.provider[0] : row.provider;

    return {
      ...row,
      invoice_ref:
        row.invoice_series && row.invoice_number
          ? `${row.invoice_series}-${row.invoice_number}`
          : undefined,
      invoice_series: row.invoice_series ?? undefined,
      invoice_number: row.invoice_number ?? undefined,
      issued_at: row.issued_at ?? undefined,
      payment_method: row.payment_method ?? undefined,
      notes: row.notes ?? undefined,
      provider: prov ?? undefined,
      category: cat ? { ...cat, color: cat.color ?? undefined } : { id: "other", name: "other" },
    };
  });

  return (
    <ExpensesClient
      slug={slug}
      workspace={workspace}
      initialExpenses={expenses}
      initialCount={count ?? 0}
      initialTotals={initialTotals}
      categories={categories ?? []}
      stages={stages ?? []}
      levels={levels ?? []}
      providers={providers ?? []}
      canCreateExpense={!!permissions[Permissions.CREATE_EXPENSE]}
      canViewMaterials={!!permissions[Permissions.VIEW_MATERIALS]}
      canManageGuideRules={!!permissions[Permissions.EXEMPT_GUIDE]}
    />
  );
}
