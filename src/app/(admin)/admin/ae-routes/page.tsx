import { Suspense } from "react";
import AeRoutesTable from "@/components/AeRoutesTable";
import NoAccess from "@/components/NoAccess";
import { Permissions } from "@/types/propertyState";
import { checkPermissions } from "@/lib/checkPermissions";
import { getCurrentUser } from "@/lib/getCurrentUser";

function Fallback() {
  return (
    <div className="bg-white shadow rounded-xl overflow-hidden">
      <div className="p-4 flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default async function AeRoutesPage() {
  const user = await getCurrentUser();
  if (!user) return <NoAccess />;

  const permissions = await checkPermissions(user.roleId, [Permissions.MANAGE_PACS]);
  if (!permissions[Permissions.MANAGE_PACS]) return <NoAccess />;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800">AE Routes</h1>
        <p className="text-sm text-gray-500 mt-1">External PACS connections for C-FIND / C-MOVE</p>
      </div>
      <Suspense fallback={<Fallback />}>
        <AeRoutesTable />
      </Suspense>
    </div>
  );
}
