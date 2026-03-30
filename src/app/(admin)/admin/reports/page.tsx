import NoAccess from "@/components/NoAccess";
import ReportsTable from "@/components/ReportsTable";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { Suspense } from "react";
import TableSkeleton from "@/components/FormSkeleton";

export default async function Page() {
  const user = await getCurrentUser();

  if (!user?.id || !user.roleId) return <NoAccess />;

  return (
    <>
      <h1 className="mb-6 font-semibold text-lg block">Reports</h1>
      <Suspense fallback={<TableSkeleton rows={20} cols={7} />}>
        {user.templateId ? (
          <ReportsTable
            userTemplateId={user.templateId}
            userRoleId={user.roleId}
            userId={user.id}
          />
        ) : null}
      </Suspense>
    </>
  );
}
