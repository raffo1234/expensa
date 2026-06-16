import { getWorkspaces } from "@/actions/dashboard";
import DashboardClient from "@/components/DashboardClient";
import { getCurrentUser } from "@/lib/getCurrentUser";

import { Permissions } from "@/types/propertyState";
import { checkPermissions } from "@/lib/checkPermissions";
import NoAccess from "@/components/NoAccess";

export default async function DashboardPage() {
  const workspaces = await getWorkspaces();
  const now = new Date();

  const user = await getCurrentUser();

  if (!user) return <NoAccess />;
  if (!user.roleId) return <NoAccess />;

  const permissions = await checkPermissions(user.roleId, [Permissions.VIEW_DASHBOARD]);

  if (!permissions[Permissions.VIEW_DASHBOARD]) return <NoAccess />;

  return (
    <DashboardClient
      workspaces={workspaces}
      defaultYear={now.getFullYear()}
      defaultMonth={now.getMonth() + 1}
    />
  );
}
