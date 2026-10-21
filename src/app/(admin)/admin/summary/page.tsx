import { Suspense } from "react";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { checkPermissions } from "@/lib/checkPermissions";
import { Permissions } from "@/types/propertyState";
import NoAccess from "@/components/NoAccess";
import SummaryClient from "@/components/SummaryClient";
import FormSection from "@/components/FormSection";

export default async function Page() {
  return (
    <Suspense
      fallback={
        <FormSection title="Resumen de gastos">
          <div className="h-96 animate-pulse rounded-xl bg-gray-100" />
        </FormSection>
      }
    >
      <SummarySection />
    </Suspense>
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
      ? await supabaseAdmin
          .from("workspace")
          .select("id, name, slug")
          .in("id", workspaceIds)
          .order("name")
      : { data: [] };

  return <SummaryClient workspaces={workspaces ?? []} />;
}
