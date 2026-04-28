import { auth } from "@/lib/auth";
import Link from "next/link";
import { Suspense } from "react";
import StudiesTable from "@/components/StudiesTable";
import { Permissions } from "@/types/propertyState";
import { checkPermissions } from "@/lib/checkPermissions";
import NoAccess from "@/components/NoAccess";
import FormSection from "@/components/FormSection";

function StudiesTableFallback() {
  return (
    <div className="bg-white shadow rounded-xl overflow-hidden">
      <div className="p-4 flex flex-col gap-3">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default async function StudiesPage() {
  const session = await auth();
  const userRoleId = session?.user?.role_id;

  if (!userRoleId) return <NoAccess />;

  const permissions = await checkPermissions(userRoleId, [Permissions.MANAGE_PACS]);
  if (!permissions.MANAGE_PACS) return <NoAccess />;

  return (
    <FormSection>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Studies</h1>
        <p className="text-sm text-gray-500 mt-1">
          DICOM studies received via SCP · 137.66.1.186:11112 ·{" "}
          <Link target="_blank" href="/admin/hospitals" className="text-cyan-600 hover:underline">
            Manage hospitals
          </Link>
        </p>
      </div>
      <Suspense fallback={<StudiesTableFallback />}>
        {userRoleId ? <StudiesTable userRoleId={userRoleId} /> : null}
      </Suspense>
    </FormSection>
  );
}
