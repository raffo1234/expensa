import { getCurrentUser } from "@/lib/getCurrentUser";
import { checkPermissions } from "@/lib/checkPermissions";
import { Permissions } from "@/types/propertyState";
import NoAccess from "@/components/NoAccess";
import NewWorkspaceForm from "@/components/NewWorkspaceForm";

export default async function NewWorkspacePage() {
  const user = await getCurrentUser();

  if (!user) return <NoAccess />;
  if (!user.roleId) return <NoAccess />;

  const permissions = await checkPermissions(user.roleId, [Permissions.HANDLE_WORKSPACES]);

  if (!permissions[Permissions.HANDLE_WORKSPACES]) return <NoAccess />;

  return <NewWorkspaceForm />;
}
