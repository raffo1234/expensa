import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { checkPermissions } from "@/lib/checkPermissions";
import { Permissions } from "@/types/propertyState";
import NoAccess from "@/components/NoAccess";
import SummaryClient from "@/components/SummaryClient";
import PageTitle from "@/components/PageTitle";

export default async function Page() {
  return (
    <>
      <PageTitle>Summary</PageTitle>
      <Suspense fallback={<div className="h-96 bg-gray-100 rounded-xl animate-pulse" />}>
        <SummarySection />
      </Suspense>
    </>
  );
}

async function SummarySection() {
  const user = await getCurrentUser();
  if (!user || !user.roleId) return <NoAccess />;

  const permissions = await checkPermissions(user.roleId, [Permissions.VIEW_EXPENSES_SUMMARY]);
  if (!permissions[Permissions.VIEW_EXPENSES_SUMMARY]) return <NoAccess />;

  const { data: userWorkspaces } = await supabaseAdmin
    .from("user_workspace")
    .select("workspace_id")
    .eq("user_id", user.id);

  const workspaceIds = (userWorkspaces ?? []).map((r) => r.workspace_id);

  const { data: workspaces } =
    workspaceIds.length > 0
      ? await supabase
          .from("workspace")
          .select("id, name, slug")
          .in("id", workspaceIds)
          .order("name")
      : { data: [] };

  return <SummaryClient workspaces={workspaces ?? []} />;
}
