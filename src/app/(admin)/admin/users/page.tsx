import { Suspense } from "react";
import { Permissions } from "@/types/propertyState";
import { checkPermissions } from "@/lib/checkPermissions";

import UsersTable from "@/components/UsersTable";
import NoAccess from "@/components/NoAccess";
import { getCurrentUser } from "@/lib/getCurrentUser";
import FormSection from "@/components/FormSection";
import {
  Bone,
  PagerSkeleton,
  SearchRowSkeleton,
  TabsSkeleton,
  UserCardSkeleton,
} from "@/components/Skeleton";

export default async function Page() {
  return (
    <FormSection title="Usuarios">
      <Suspense
        fallback={
          <>
            <div className="mb-6">
              <TabsSkeleton />
            </div>
            <div className="mb-8">
              <SearchRowSkeleton filters={false} />
            </div>
            <Bone className="mb-4 h-3.5 w-20" />
            <div className="mb-4">
              <PagerSkeleton pageSize={false} />
            </div>
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}
            >
              {Array.from({ length: 9 }, (_, i) => (
                <UserCardSkeleton key={i} />
              ))}
            </div>
          </>
        }
      >
        <UsersSection />
      </Suspense>
    </FormSection>
  );
}

async function UsersSection() {
  const user = await getCurrentUser();
  if (!user) return <NoAccess />;
  if (!user.roleId) return <NoAccess />;
  const permissions = await checkPermissions(user.roleId, [Permissions.MANAGE_USERS]);

  if (!permissions[Permissions.MANAGE_USERS]) return <NoAccess />;

  return <UsersTable />;
}
