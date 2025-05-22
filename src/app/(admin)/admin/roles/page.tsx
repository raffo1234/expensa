import AdminRoles from "@/components/AdminRoles";
import CheckPermission from "@/components/CheckPermission";
import FallbackPermission from "@/components/FallbackPermission";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Permissions } from "@/types/propertyState";

export default async function Page() {
  const session = await auth();
  const userEmail = session?.user?.email;

  const { data: user } = await supabase
    .from("user")
    .select("id, role_id")
    .eq("email", userEmail)
    .single();

  if (!user) return null;

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
