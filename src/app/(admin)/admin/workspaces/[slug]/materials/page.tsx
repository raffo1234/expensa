import { Suspense } from "react";
import { notFound } from "next/navigation";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { checkPermissions } from "@/lib/checkPermissions";
import { Permissions } from "@/types/propertyState";
import { getMaterialsReport } from "@/actions/materials";
import NoAccess from "@/components/NoAccess";
import MaterialsClient from "@/components/MaterialsClient";
import FormSection from "@/components/FormSection";
import ListPage from "@/components/ListPage";
import {
  PagerSkeleton,
  SearchRowSkeleton,
  TableSkeleton,
  TotalHeaderSkeleton,
} from "@/components/Skeleton";
import { MATERIAL_DETAIL_COLUMNS, MATERIAL_SUMMARY_COLUMNS } from "@/lib/tableColumns";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function MaterialsPage({ params }: PageProps) {
  const { slug } = await params;
  return (
    <Suspense fallback={<MaterialsFallback slug={slug} />}>
      <MaterialsSection slug={slug} />
    </Suspense>
  );
}

async function MaterialsSection({ slug }: { slug: string }) {
  const [user, { data: workspace }] = await Promise.all([
    getCurrentUser(),
    supabase.from("workspace").select("id").eq("slug", slug).maybeSingle(),
  ]);

  if (!user?.roleId) return <NoAccess />;
  if (!workspace) notFound();

  // The report is fetched alongside the permission check to save a round trip;
  // it is only rendered once the permission is confirmed.
  const [permissions, rows] = await Promise.all([
    checkPermissions(user.roleId, [Permissions.VIEW_MATERIALS]),
    getMaterialsReport(workspace.id),
  ]);
  if (!permissions[Permissions.VIEW_MATERIALS]) return <NoAccess />;

  return <MaterialsClient workspaceId={workspace.id} workspaceSlug={slug} rows={rows} />;
}

function MaterialsFallback({ slug }: { slug: string }) {
  return (
    <FormSection title="Materiales" backUrl={`/admin/workspaces/${slug}/expenses`}>
      <ListPage
        pager={<PagerSkeleton />}
        controls={
          <>
            <TotalHeaderSkeleton action={false} />
            <SearchRowSkeleton />
            <TableSkeleton columns={MATERIAL_SUMMARY_COLUMNS} rows={4} />
          </>
        }
      >
        <TableSkeleton columns={MATERIAL_DETAIL_COLUMNS} />
      </ListPage>
    </FormSection>
  );
}
