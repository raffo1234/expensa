import NoAccess from "@/components/NoAccess";
import WorkspaceClient from "@/components/WorkspaceClient";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

  const { data: workspaces, error } = await supabaseAdmin
    .from("workspace")
    .select("id, name, slug, created_by, created_at, expense(*)")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("workspace fetch error:", error);
  }

  return <WorkspaceClient workspaces={workspaces ?? []} />;
}
