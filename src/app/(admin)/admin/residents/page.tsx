import FallBackResidents from "@/components/FallBackResidents";
import NoAccess from "@/components/NoAccess";
import ResidentsPageContent from "@/components/ResidentsPageContent";
import { checkPermissions } from "@/lib/checkPermissions";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { Suspense } from "react";
import { Permissions } from "@/types/propertyState";
import { residentsFetcher } from "@/fetchers/residentsFetcher";

export default async function Page() {
  return (
    <>
      <h1 className="mb-6 font-semibold text-lg block">Residents</h1>
      <Suspense fallback={<FallBackResidents />}>
        <ResidentsSection />
      </Suspense>
    </>
  );
}

async function ResidentsSection() {
  const user = await getCurrentUser();
  if (!user) return <NoAccess />;
  if (!user.roleId) return <NoAccess />;
  const [permissions, residents] = await Promise.all([
    checkPermissions(user.roleId, [Permissions.VIEW_RESIDENTS]),
    residentsFetcher(user.id),
  ]);

  if (!permissions) return <NoAccess />;
  return <ResidentsPageContent residentsFallback={residents} userId={user.id} />;
}
