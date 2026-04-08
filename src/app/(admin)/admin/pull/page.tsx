import { Suspense } from "react";
import { Permissions } from "@/types/propertyState";
import { checkPermissions } from "@/lib/checkPermissions";
import FallbackPermission from "@/components/FallbackPermission";
import NoAccess from "@/components/NoAccess";
import { getCurrentUser } from "@/lib/getCurrentUser";
import PullStudies from "@/components/PullStudies";

export default async function Page() {
  return (
    <>
      <h1 className="mb-6 font-semibold text-lg block">Pull Studies</h1>
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-12 w-full bg-gray-100 animate-pulse rounded-xl" />
            <div className="h-12 w-full bg-gray-100 animate-pulse rounded-xl" />
            <div className="h-64 w-full bg-gray-100 animate-pulse rounded-xl" />
          </div>
        }
      >
        <PullSection />
      </Suspense>
    </>
  );
}

async function PullSection() {
  const user = await getCurrentUser();
  if (!user) return <NoAccess />;

  const permissions = await checkPermissions(user.roleId, [Permissions.MANAGE_PACS]);
  if (!permissions[Permissions.MANAGE_PACS]) return <FallbackPermission />;

  return <PullStudies />;
}
