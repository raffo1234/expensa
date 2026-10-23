import { Suspense } from "react";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAccessibleWorkspaceIds } from "@/lib/access";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { checkPermissions } from "@/lib/checkPermissions";
import { Permissions } from "@/types/propertyState";
import NoAccess from "@/components/NoAccess";
import SummaryClient from "@/components/SummaryClient";
import FormSection from "@/components/FormSection";
import {
  Bone,
  HeaderLinksSkeleton,
  LabeledFieldSkeleton,
  ListPageSkeleton,
  SearchRowSkeleton,
  TabsSkeleton,
} from "@/components/Skeleton";
import { summaryColumns } from "@/lib/tableColumns";

export default async function Page() {
  return (
    <Suspense
      fallback={
        <FormSection title="Resumen de gastos" actions={<HeaderLinksSkeleton count={2} />}>
          <ListPageSkeleton
            columns={summaryColumns("facturas")}
            controls={
              <>
                <div className="w-full sm:max-w-xs">
                  <LabeledFieldSkeleton />
                  <Bone className="mt-3 h-3.5 w-20" />
                </div>
                <TabsSkeleton />
                <SearchRowSkeleton inputs={["sm:w-28", "sm:w-36"]} />
              </>
            }
          />
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

  const [permissions, workspaceIds] = await Promise.all([
    checkPermissions(user.roleId, [Permissions.VIEW_EXPENSES_SUMMARY]),
    // Projects the user created or was assigned to (same rule as everywhere else).
    getAccessibleWorkspaceIds(),
  ]);
  if (!permissions[Permissions.VIEW_EXPENSES_SUMMARY]) return <NoAccess />;

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
