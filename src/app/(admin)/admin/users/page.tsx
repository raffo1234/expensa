import { Suspense } from "react";
import { Permissions } from "@/types/propertyState";
import { checkPermissions } from "@/lib/checkPermissions";
import FallbackPermission from "@/components/FallbackPermission";
import UsersTable from "@/components/UsersTable";
import NoAccess from "@/components/NoAccess";
import { getCurrentUser } from "@/lib/getCurrentUser";

export default async function Page() {
  return (
    <>
      <h1 className="mb-6 font-semibold text-lg block">Users</h1>
      <Suspense
        fallback={
          <>
            <div className="mb-6 flex gap-2">
              <div className="w-[89px] h-[38px] bg-gray-100 rounded-lg animate-pulse"></div>
              <div className="w-[89px] h-[38px] bg-gray-100 rounded-lg animate-pulse"></div>
            </div>
            <div className="h-[38px] mb-6 bg-gray-100 rounded-lg animate-pulse"></div>
            <div className="space-y-3">
              <div className="h-8 w-full bg-gray-100 animate-pulse rounded" />
              <div className="h-8 w-full bg-gray-100 animate-pulse rounded" />
              <div className="h-8 w-3/4 bg-gray-100 animate-pulse rounded" />
            </div>
          </>
        }
      >
        <UsersSection />
      </Suspense>
    </>
  );
}

async function UsersSection() {
  const user = await getCurrentUser();
  // if (!user) return <NoAccess />;
  // if (!user.roleId) return <NoAccess />;
  // const permissions = await checkPermissions(user.roleId, [Permissions.MANAGE_USERS]);

  // if (!permissions[Permissions.MANAGE_USERS]) return <FallbackPermission />;

  return <UsersTable />;
}
