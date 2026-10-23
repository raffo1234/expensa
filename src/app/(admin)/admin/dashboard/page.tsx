import { getWorkspaces } from "@/actions/dashboard";
import DashboardClient from "@/components/DashboardClient";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { Permissions } from "@/types/propertyState";
import { checkPermissions } from "@/lib/checkPermissions";
import NoAccess from "@/components/NoAccess";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user?.roleId) return <NoAccess />;

  // Permission first: getWorkspaces requires it and would throw otherwise.
  const permissions = await checkPermissions(user.roleId, [Permissions.VIEW_DASHBOARD]);
  if (!permissions[Permissions.VIEW_DASHBOARD]) return <NoAccess />;

  const workspaces = await getWorkspaces();
  const now = new Date();

  return (
    <DashboardClient
      workspaces={workspaces}
      defaultYear={now.getFullYear()}
      defaultMonth={now.getMonth() + 1}
    />
  );
}
