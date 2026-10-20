import { Suspense } from "react";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { checkPermissions } from "@/lib/checkPermissions";
import { Permissions } from "@/types/propertyState";
import { getMaterialsReport } from "@/actions/materials";
import NoAccess from "@/components/NoAccess";
import MaterialsClient from "@/components/MaterialsClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function MaterialsPage({ params }: PageProps) {
  const { slug } = await params;
  return (
    <Suspense fallback={<MaterialsFallback />}>
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

function MaterialsFallback() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 animate-pulse">
      <div className="h-4 w-48 bg-gray-200 rounded mb-10" />
      <div className="h-7 w-40 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-72 bg-gray-100 rounded mb-6" />
      <div className="h-44 rounded-xl border border-gray-200 bg-gray-50 mb-6" />
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex justify-between px-5 py-4 border-b border-gray-100">
            <div className="h-3 w-40 bg-gray-100 rounded" />
            <div className="h-3 w-16 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
