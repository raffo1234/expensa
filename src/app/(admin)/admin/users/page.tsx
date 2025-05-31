import CheckPermission from "@/components/CheckPermission";
import { auth } from "@/lib/auth";
import { Permissions } from "@/types/propertyState";
import FallbackPermission from "@/components/FallbackPermission";
import UsersPageContent from "@/components/UsersPageContent";

export default async function Page() {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !user.role_id) return null;

  return (
    <CheckPermission
      userRoleId={user.role_id}
      requiredPermission={Permissions.MANAGE_USERS}
      fallback={<FallbackPermission />}
    >
      <UsersPageContent currentUserId={user.id} userRoleId={user.role_id} />
    </CheckPermission>
  );
}
