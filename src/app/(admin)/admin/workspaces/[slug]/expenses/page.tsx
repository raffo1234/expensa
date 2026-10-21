import { Suspense } from "react";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { sumExpenseAmounts } from "@/lib/sumExpenseAmounts";
import ExpensesClient from "@/components/ExpensesClient";
import FallbackExpenses from "@/components/FallbackExpenses";

const ITEMS_PER_PAGE = 10;

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
  const { data: workspace, error: wsError } = await supabase
    .from("workspace")
    .select("id, name, slug, created_at")
    .eq("slug", slug)
    .single();

  if (wsError || !workspace) throw new Error("Workspace not found");

  const [
    { data: rows, error: expError, count },
    initialTotals,
    { data: categories },
    { data: stages },
    { data: levels },
    { data: providers },
  ] = await Promise.all([
    supabase
      .from("expense")
      .select(
        `id, invoice_series, invoice_number, amount, currency,
         issued_at, paid_at, payment_method, notes, created_at,
         provider:provider_id(id, name, ruc),
         category:category_id(id, name, color)`,
        { count: "exact" },
      )
      .eq("workspace_id", workspace.id)
      .order("paid_at", { ascending: false })
      .order("id")
      .range(0, ITEMS_PER_PAGE - 1),
    sumExpenseAmounts(workspace.id),
    supabase
      .from("category")
      .select("id, name, color")
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

  const expenses = (rows ?? []).map((row) => {
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
    />
  );
}
