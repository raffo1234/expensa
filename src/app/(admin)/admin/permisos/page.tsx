import PermissionsPage from "@/components/PermissionsPage";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PermissionType } from "@/types/permissionType";

export default async function Page() {
  const { data: permissions } = (await supabase
    .from("permission")
    .select("*")
    .order("created_at", { ascending: false })) as {
    data: PermissionType[] | null;
  };

  const session = await auth();
  const user = session?.user;

  if (!user?.id || !user.role_id) return null;

  return (
    <PermissionsPage userRoleId={user.role_id} permissions={permissions} />
  );
}
