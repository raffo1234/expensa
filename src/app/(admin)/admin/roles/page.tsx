import AddRole from "@/components/AddRole";
import AdminRoles from "@/components/AdminRoles";
import CheckPermission from "@/components/CheckPermission";
import FallbackPermission from "@/components/FallbackPermission";
import FallBackRolesList from "@/components/FallBackRolesList";
import NoAccess from "@/components/NoAccess";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Permissions } from "@/types/propertyState";
import { Suspense } from "react";

export default async function Page() {
  return (
    <>
      <h1 className="mb-6 font-semibold text-lg block">Roles</h1>
      <div className="border border-gray-200 rounded-xl bg-white">
        <Suspense fallback={<FallBackRolesList />}>
          <RolesSection />
        </Suspense>
      </div>
    </>
  );
}

async function RolesSection() {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) return null;

  const { data } = await supabase
    .from("user")
    .select("role_id")
    .eq("id", user.id)
    .single();

  if (!data?.role_id) return <NoAccess />;

  return (
    <CheckPermission
      userRoleId={data.role_id}
      requiredPermission={Permissions.MANAGE_ROLES}
      fallback={<FallbackPermission />}
      loadingComponent={<FallBackRolesList />}
    >
      <AdminRoles />
      <AddRole />
    </CheckPermission>
  );
}