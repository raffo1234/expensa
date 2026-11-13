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
  HeaderLinksSkeleton,
  LabeledFieldSkeleton,
  ListPageSkeleton,
  SearchRowSkeleton,
  TabsSkeleton,
  TotalHeaderSkeleton,
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
                {/* Total on the left, project on the right, like the real header. */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <TotalHeaderSkeleton action={false} />
                  <LabeledFieldSkeleton className="w-full sm:max-w-xs" />
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
