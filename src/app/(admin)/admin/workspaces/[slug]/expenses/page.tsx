import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import ExpensesClient from "@/components/ExpensesClient";
import FallbackExpenses from "@/components/FallbackExpenses";

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

// Runs on the server — both queries fire in parallel
async function ExpensesSection({ slug }: { slug: string }) {
  const workspaceQuery = supabase
    .from("workspace")
    .select("id, name, slug, created_at")
    .eq("slug", slug)
    .single();

  const [{ data: workspace, error: wsError }] = await Promise.all([workspaceQuery]);

  if (wsError || !workspace) throw new Error("Workspace not found");

  const { data: rows, error: expError } = await supabase
    .from("expense")
    .select(
      `*,
       provider:provider_id(id, name),
       category:category_id(id, name, color)`,
    )
    .eq("workspace_id", workspace.id)
    .order("paid_at", { ascending: false });

  if (expError) throw expError;

  const expenses = (rows ?? []).map((row) => ({
    ...row,
    invoice_ref:
      row.invoice_series && row.invoice_number
        ? `${row.invoice_series}-${row.invoice_number}`
        : undefined,
    category: row.category?.name ?? "other",
  }));

  return <ExpensesClient slug={slug} workspace={workspace} initialExpenses={expenses} />;
}
