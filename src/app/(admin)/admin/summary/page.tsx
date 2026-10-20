import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { checkPermissions } from "@/lib/checkPermissions";
import { Permissions } from "@/types/propertyState";
import NoAccess from "@/components/NoAccess";
import SummaryClient from "@/components/SummaryClient";
import FormSection from "@/components/FormSection";

export default async function Page() {
  return (
    <FormSection title="Expenses summary">
      <Suspense fallback={<div className="h-96 bg-gray-100 rounded-xl animate-pulse" />}>
        <SummarySection />
      </Suspense>
    </FormSection>
  );
}

async function SummarySection() {
  const user = await getCurrentUser();
  if (!user || !user.roleId) return <NoAccess />;

  const [permissions, { data: userWorkspaces }] = await Promise.all([
    checkPermissions(user.roleId, [Permissions.VIEW_EXPENSES_SUMMARY]),
    supabaseAdmin.from("user_workspace").select("workspace_id").eq("user_id", user.id),
  ]);
  if (!permissions[Permissions.VIEW_EXPENSES_SUMMARY]) return <NoAccess />;

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
