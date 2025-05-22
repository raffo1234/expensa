import CheckPermission from "@/components/CheckPermission";
import FallbackPermission from "@/components/FallbackPermission";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PermissionType } from "@/types/permissionType";
import { Permissions } from "@/types/propertyState";

export default async function Page() {
  const { data: permissions } = (await supabase
    .from("permission")
    .select("*")
    .order("created_at", { ascending: false })) as {
    data: PermissionType[] | null;
  };

  const session = await auth();
  const userEmail = session?.user?.email;

  const { data: user } = await supabase
    .from("user")
    .select("id, role_id")
    .eq("email", userEmail)
    .single();

  if (!user) return null;

  return (
    <div>
      <h1 className="mb-6 font-semibold text-lg block">Permissions</h1>
      <CheckPermission
        userRoleId={user.role_id}
        requiredPermission={Permissions.MANAGE_PERMISSIONS}
        fallback={<FallbackPermission />}
      >
        <div className="border-x border-b border-gray-200 bg-white rounded-xl">
          {permissions?.map(({ id, description, slug }) => {
            return (
              <div
                className="px-6 py-5 first:rounded-t-xl border-t border-gray-200"
                key={id}
              >
                <div className="mb-1 text-xs">{slug}</div>
                <div className="text-sm text-gray-400">{description}</div>
              </div>
            );
          })}
        </div>
      </CheckPermission>
    </div>
  );
}
