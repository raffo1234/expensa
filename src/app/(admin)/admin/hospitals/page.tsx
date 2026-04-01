import { Suspense } from "react";
import { Permissions } from "@/types/propertyState";
import { checkPermissions } from "@/lib/checkPermissions";
import FallbackPermission from "@/components/FallbackPermission";
import NoAccess from "@/components/NoAccess";
import { getCurrentUser } from "@/lib/getCurrentUser";
import HospitalsTable from "@/components/HospitalsTable";
import PrimaryButton from "@/components/PrimaryButton";

export default async function Page() {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-semibold text-lg">Hospitals</h1>
        <PrimaryButton label="Add Hospital" href="/admin/hospitals/new"></PrimaryButton>
      </div>
      <Suspense
        fallback={
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 w-full bg-gray-100 animate-pulse rounded-xl" />
            ))}
          </div>
        }
      >
        <HospitalsSection />
      </Suspense>
    </>
  );
}

async function HospitalsSection() {
  const user = await getCurrentUser();
  if (!user) return <NoAccess />;

  const permissions = await checkPermissions(user.roleId, [Permissions.MANAGE_HOSPITALS]);
  if (!permissions[Permissions.MANAGE_HOSPITALS]) return <FallbackPermission />;

  return <HospitalsTable />;
}
