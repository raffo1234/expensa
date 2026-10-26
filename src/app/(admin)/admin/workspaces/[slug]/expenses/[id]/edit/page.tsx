import { SWRConfig, unstable_serialize } from "swr";
import { notFound } from "next/navigation";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { loadExpenseFormLookups } from "@/lib/expenseFormData";
import { getExpenseItems } from "@/actions/expenses";
import EditExpenseForm from "@/components/EditExpenseForm";
import { EXPENSE_EDIT_COLUMNS } from "@/lib/expenseEditColumns";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { checkPermissions } from "@/lib/checkPermissions";
import { Permissions } from "@/types/propertyState";

interface PageProps {
  params: Promise<{ slug: string; id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { slug, id } = await params;

  // Project lookups (with the access check), the expense and its materials all
  // load at once; the expense is only used if it belongs to that project.
  const user = await getCurrentUser();
  const [lookups, items, { data: row, error }, permissions] = await Promise.all([
    loadExpenseFormLookups(slug),
    getExpenseItems(id).catch(() => []),
    supabase
      .from("expense")
      .select(`workspace_id, ${EXPENSE_EDIT_COLUMNS}`)
      .eq("id", id)
      .maybeSingle(),
    user?.roleId ? checkPermissions(user.roleId, [Permissions.EXEMPT_GUIDE]) : {},
  ]);
  if (!lookups) notFound();
  if (error) throw error;
  if (!row || row.workspace_id !== lookups.workspace.id) notFound();
  const expense = row; // the extra workspace_id field is ignored by the form

  const fallback = {
    ...lookups.fallback,
    [unstable_serialize(["expense", id, lookups.workspace.id])]: expense,
    [unstable_serialize(["expense-items", id])]: items,
  };

  return (
    <SWRConfig value={{ fallback }}>
      <EditExpenseForm
        canExemptGuide={!!(permissions as Record<string, boolean>)[Permissions.EXEMPT_GUIDE]}
      />
    </SWRConfig>
  );
}
