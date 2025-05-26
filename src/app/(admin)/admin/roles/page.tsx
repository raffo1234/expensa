import AdminRoles from "@/components/AdminRoles";
import CheckPermission from "@/components/CheckPermission";
import FallbackPermission from "@/components/FallbackPermission";
import { auth } from "@/lib/auth";
import { Permissions } from "@/types/propertyState";

export default async function Page() {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !user.role_id) return null;

  return (
    <>
      <h1 className="mb-6 font-semibold text-lg block">Roles</h1>
      <CheckPermission
        userRoleId={user.role_id}
        requiredPermission={Permissions.MANAGE_ROLES}
        fallback={<FallbackPermission />}
      >
        <AdminRoles />
      </CheckPermission>
    </>
  );
}
