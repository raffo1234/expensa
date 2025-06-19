import CheckPermission from "@/components/CheckPermission";
import { auth } from "@/lib/auth";
import { Permissions } from "@/types/propertyState";
import FallbackPermission from "@/components/FallbackPermission";
import UsersPageContent from "@/components/UsersPageContent";
import { supabase } from "@/lib/supabase";

export default async function Page() {
  const session = await auth();
  const user = session?.user;

  const { data } = await supabase
    .from("user")
    .select("role_id")
    .eq("id", user?.id)
    .single();

  if (!user?.id || !data?.role_id) return null;

  return (
    <CheckPermission
      userRoleId={data.role_id}
      requiredPermission={Permissions.MANAGE_USERS}
      fallback={<FallbackPermission />}
    >
      <UsersPageContent />
    </CheckPermission>
  );
}
