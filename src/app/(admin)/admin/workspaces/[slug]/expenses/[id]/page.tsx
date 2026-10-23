import { Suspense } from "react";
import { notFound } from "next/navigation";
import { findAccessibleWorkspaceBySlug } from "@/lib/access";
import { getExpenseItems } from "@/actions/expenses";
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
  const [expense, materialItems] = await Promise.all([
    fetchExpenseDetail(expenseId, workspace.id),
    // Own access check inside; an expense from another project 404s just below.
    getExpenseItems(expenseId).catch(() => []),
  ]);
  if (!expense) notFound();

  return (
    <ExpenseDetailView
      expense={expense}
      materialItems={materialItems}
      slug={slug}
      backUrl={backUrl}
    />
  );
}
