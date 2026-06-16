import NoAccess from "@/components/NoAccess";
import WorkspaceClient from "@/components/WorkspaceClient";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Permissions } from "@/types/propertyState";
import { checkPermissions } from "@/lib/checkPermissions";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  created_by: string;
  created_at: string;
};

export default async function WorkspacePage() {
  const user = await getCurrentUser();

  if (!user) return <NoAccess />;
  if (!user.roleId) return <NoAccess />;

  const { data: workspaces, error } = await supabaseAdmin
    .from("workspace")
    .select("id, name, slug, created_by, created_at, expense(*)")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("workspace fetch error:", error);
  }

  const permissions = await checkPermissions(user.roleId, [Permissions.HANDLE_WORKSPACES]);

  if (!permissions[Permissions.HANDLE_WORKSPACES]) return <NoAccess />;

  return <WorkspaceClient workspaces={workspaces ?? []} />;
}
