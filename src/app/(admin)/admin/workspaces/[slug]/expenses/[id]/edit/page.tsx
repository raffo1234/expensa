import { SWRConfig, unstable_serialize } from "swr";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { loadExpenseFormLookups } from "@/lib/expenseFormData";
import { getExpenseItems } from "@/actions/expenses";
import EditExpenseForm from "@/components/EditExpenseForm";

interface PageProps {
  params: Promise<{ slug: string; id: string }>;
}

// Same columns the form's own fetcher reads, so the prefilled data matches.
const EXPENSE_COLUMNS = `
  id, amount, currency, issued_at, paid_at, payment_method, notes, created_at, invoice_series, invoice_number, tax_status,
  provider:provider_id(id, name),
  category:category_id(id, name, color),
  stage:stage_id(id, name, color),
  level:level_id(id, name),
  expense_attachment(id, file_name, storage_path)
`;

export default async function Page({ params }: PageProps) {
  const { slug, id } = await params;

  const [lookups, items] = await Promise.all([loadExpenseFormLookups(slug), getExpenseItems(id)]);
  if (!lookups) notFound();

  const { data: expense, error } = await supabase
    .from("expense")
    .select(EXPENSE_COLUMNS)
    .eq("id", id)
    .eq("workspace_id", lookups.workspace.id)
    .maybeSingle();
  if (error) throw error;
  if (!expense) notFound();

  const fallback = {
    ...lookups.fallback,
    [unstable_serialize(["expense", id, lookups.workspace.id])]: expense,
    [unstable_serialize(["expense-items", id])]: items,
  };

  return (
    <SWRConfig value={{ fallback }}>
      <EditExpenseForm />
    </SWRConfig>
  );
}
