import ReportsTable from "@/components/ReportsTable";
import { auth } from "@/lib/auth";

export default async function Page() {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !user.role_id) return null;

  return (
    <>
      <h1 className="mb-6 font-semibold text-lg block">Reports</h1>
      {user && user.template_id ? (
        <ReportsTable
          userTemplateId={user.template_id}
          userRoleId={user.role_id}
          userId={user.id}
        />
      ) : null}
    </>
  );
}
