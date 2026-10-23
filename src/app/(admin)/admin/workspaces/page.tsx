import NoAccess from "@/components/NoAccess";
import WorkspaceClient from "@/components/WorkspaceClient";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAccessibleWorkspaceIds } from "@/lib/access";
import { Permissions } from "@/types/propertyState";
import { checkPermissions } from "@/lib/checkPermissions";
import FormSection from "@/components/FormSection";
import { Suspense } from "react";
import { ListPageSkeleton, SearchRowSkeleton, TotalHeaderSkeleton } from "@/components/Skeleton";
import { WORKSPACE_COLUMNS } from "@/lib/tableColumns";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  created_by: string;
  created_at: string;
};

export default function WorkspacePage() {
  return (
    <FormSection title="Proyectos">
      <Suspense
        fallback={
          <ListPageSkeleton
            columns={WORKSPACE_COLUMNS}
            controls={
              <>
                <TotalHeaderSkeleton />
                <SearchRowSkeleton filters={false} />
              </>
            }
          />
        }
      >
        <WorkspacesSection />
      </Suspense>
    </FormSection>
  );
}

async function WorkspacesSection() {
  const user = await getCurrentUser();

  if (!user) return <NoAccess />;
  if (!user.roleId) return <NoAccess />;

  // Projects the user created or was assigned to (same rule as everywhere else).
  const ids = await getAccessibleWorkspaceIds();
  const { data: workspaces, error } = ids.length
    ? await supabaseAdmin
        .from("workspace")
        .select("id, name, slug, created_by, created_at, expense(*)")
        .in("id", ids)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (error) {
    console.error("workspace fetch error:", error);
  }

  const permissions = await checkPermissions(user.roleId, [
    Permissions.HANDLE_WORKSPACES,
    Permissions.CREATE_EXPENSE,
  ]);

  if (!permissions[Permissions.HANDLE_WORKSPACES]) return <NoAccess />;

  return (
    <WorkspaceClient
      workspaces={workspaces ?? []}
      currentUserId={user.id}
      canCreateExpense={!!permissions[Permissions.CREATE_EXPENSE]}
    />
  );
}
