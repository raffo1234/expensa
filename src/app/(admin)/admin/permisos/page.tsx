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
    <PermissionsPage userRoleId={user.role_id} permissions={permissions} />
  );
}
