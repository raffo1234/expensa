import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { checkPermissions } from "@/lib/checkPermissions";
import { Permissions } from "@/types/propertyState";
import NoAccess from "@/components/NoAccess";
import { AccessError, requireRowAccess } from "@/lib/access";
import { getExpenseItems } from "@/actions/expenses";
import ExpenseDetailView, {
  ExpenseDetailFallback,
  fetchExpenseDetail,
} from "@/components/ExpenseDetailView";

type Params = Promise<{ id: string }>;

const BACK_URL = "/admin/summary";

// Same expense detail as the project's expense page; only "back" returns to
// the summary. Access: the summary permission plus access to the expense.
export default async function Page({ params }: { params: Params }) {
  const { id } = await params;
  if (!id) notFound();
  return (
    <Suspense fallback={<ExpenseDetailFallback backUrl={BACK_URL} />}>
      <SummaryExpenseDetail expenseId={id} />
    </Suspense>
  );
}

async function SummaryExpenseDetail({ expenseId }: { expenseId: string }) {
  const user = await getCurrentUser();
  if (!user?.roleId) return <NoAccess />;

  // Permission, access to the expense and its data, side by side.
  const [permissions, access, expense, materialItems] = await Promise.all([
    checkPermissions(user.roleId, [Permissions.VIEW_EXPENSES_SUMMARY]),
    requireRowAccess("expense", expenseId).then(
      () => true,
      (err) => {
        if (err instanceof AccessError) return false;
        throw err;
      },
    ),
    fetchExpenseDetail(expenseId),
    getExpenseItems(expenseId).catch(() => []),
  ]);
  // Data is only rendered after both checks pass.
  if (!permissions[Permissions.VIEW_EXPENSES_SUMMARY] || !access) return <NoAccess />;
  if (!expense?.workspace?.slug) notFound();

  return (
    <ExpenseDetailView
      expense={expense}
      materialItems={materialItems}
      slug={expense.workspace.slug}
      backUrl={BACK_URL}
      // The summary is view only: nothing can be edited from here.
      readOnly
    />
  );
}
