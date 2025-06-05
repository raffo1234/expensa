import CheckPermission from "@/components/CheckPermission";
import { auth } from "@/lib/auth";
import { Permissions } from "@/types/propertyState";
import FallbackPermission from "@/components/FallbackPermission";
import UsersPageContent from "@/components/UsersPageContent";
import { supabase } from "@/lib/supabase";

export default async function Page() {
  const session = await auth();
  const user = session?.user;

  if (user?.id) {
    const { data } = await supabase
      .from("user")
      .select("role_id, template_id")
      .eq("id", user?.id)
      .single();

    user.role_id = data?.role_id;
    user.template_id = data?.template_id;
  }

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
