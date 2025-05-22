import CheckPermission from "@/components/CheckPermission";
import UsersTable from "@/components/UsersTable";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { UserType } from "@/types/userType";
import { Permissions } from "@/types/propertyState";
import FallbackPermission from "@/components/FallbackPermission";

export default async function Page() {
  const session = await auth();
  const userEmail = session?.user?.email;

  const { data: user } = await supabase
    .from("user")
    .select("id, role_id")
    .eq("email", userEmail)
    .single();

  const { data: users } = (await supabase
    .from("user")
    .select(
      `
      id,
      image_url,
      first_name,
      last_name,
      username,
      email,
      role_id,
      role(id, name)
      `
    )
    .order("created_at", { ascending: false })) as { data: UserType[] | null };

  if (!user) return null;
  return (
    <CheckPermission
      userRoleId={user.role_id}
      requiredPermission={Permissions.MANAGE_USERS}
      fallback={<FallbackPermission />}
    >
      <UsersTable currentUserId={user.id} users={users} />
    </CheckPermission>
  );
}
