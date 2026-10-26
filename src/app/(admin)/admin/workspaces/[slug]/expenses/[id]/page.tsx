import { Suspense } from "react";
import { notFound } from "next/navigation";
import { findAccessibleWorkspaceBySlug } from "@/lib/access";
import { getExpenseItems } from "@/actions/expenses";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { checkPermissions } from "@/lib/checkPermissions";
import { Permissions } from "@/types/propertyState";
import ExpenseDetailView, {
  ExpenseDetailFallback,
  fetchExpenseDetail,
} from "@/components/ExpenseDetailView";

interface PageProps {
  params: Promise<{ slug: string; id: string }>;
}

export default async function ExpenseDetailPage({ params }: PageProps) {
  const { slug, id } = await params;
  const backUrl = `/admin/workspaces/${slug}/expenses`;
  return (
    <Suspense fallback={<ExpenseDetailFallback backUrl={backUrl} />}>
      <ExpenseDetail slug={slug} expenseId={id} backUrl={backUrl} />
    </Suspense>
  );
}

async function ExpenseDetail({
  slug,
  expenseId,
  backUrl,
}: {
  slug: string;
  expenseId: string;
  backUrl: string;
}) {
  // Only users with access to the project see its expenses; others get a 404.
  const workspace = await findAccessibleWorkspaceBySlug(slug);
  if (!workspace) notFound();
  const user = await getCurrentUser();
  const [expense, materialItems, permissions] = await Promise.all([
    fetchExpenseDetail(expenseId, workspace.id),
    // Own access check inside; an expense from another project 404s just below.
    getExpenseItems(expenseId).catch(() => []),
    user?.roleId ? checkPermissions(user.roleId, [Permissions.EXEMPT_GUIDE]) : {},
  ]);
  if (!expense) notFound();

  return (
    <ExpenseDetailView
      expense={expense}
      materialItems={materialItems}
      slug={slug}
      backUrl={backUrl}
      canExemptGuide={!!(permissions as Record<string, boolean>)[Permissions.EXEMPT_GUIDE]}
    />
  );
}
