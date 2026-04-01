import { Suspense } from "react";
import { Permissions } from "@/types/propertyState";
import { checkPermissions } from "@/lib/checkPermissions";
import FallbackPermission from "@/components/FallbackPermission";
import NoAccess from "@/components/NoAccess";
import { getCurrentUser } from "@/lib/getCurrentUser";
import Link from "next/link";
import { Icon } from "@iconify/react/dist/iconify.js";
import EditHospitalForm from "@/components/EditHospitalForm";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/hospitals"
          className="text-gray-400 hover:text-gray-700 transition-colors duration-300"
        >
          <Icon icon="solar:arrow-left-outline" fontSize={20} />
        </Link>
        <h1 className="font-semibold text-lg">Edit Hospital</h1>
      </div>
      <Suspense
        fallback={
          <div className="space-y-4 max-w-xl">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 w-full bg-gray-100 animate-pulse rounded-xl" />
            ))}
          </div>
        }
      >
        <EditHospitalSection id={id} />
      </Suspense>
    </>
  );
}

async function EditHospitalSection({ id }: { id: string }) {
  const user = await getCurrentUser();
  if (!user) return <NoAccess />;

  const permissions = await checkPermissions(user.roleId, [Permissions.MANAGE_HOSPITALS]);
  if (!permissions[Permissions.MANAGE_HOSPITALS]) return <FallbackPermission />;

  return <EditHospitalForm hospitalId={id} />;
}
