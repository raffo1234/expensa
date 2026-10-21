import { SWRConfig } from "swr";
import { notFound, redirect } from "next/navigation";
import UploadExpensePage from "@/components/UploadExpensePage";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { checkPermissions } from "@/lib/checkPermissions";
import { loadExpenseFormLookups } from "@/lib/expenseFormData";
import { Permissions } from "@/types/propertyState";
import NoAccess from "@/components/NoAccess";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;

  // Form data loads alongside the permission check; it is only rendered once
  // the permission is confirmed.
  const lookupsPromise = loadExpenseFormLookups(slug);
  lookupsPromise.catch(() => {}); // handled below; avoid an unhandled rejection on early return

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roleId) return <NoAccess />;

  const permissions = await checkPermissions(user.roleId, [Permissions.CREATE_EXPENSE]);
  if (!permissions[Permissions.CREATE_EXPENSE]) return <NoAccess />;

  const lookups = await lookupsPromise;
  if (!lookups) notFound();

  return (
    <SWRConfig value={{ fallback: lookups.fallback }}>
      <UploadExpensePage userId={user.id} />
    </SWRConfig>
  );
}
