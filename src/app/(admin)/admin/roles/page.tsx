import AddRole from "@/components/AddRole";
import AdminRoles from "@/components/AdminRoles";
import CheckPermission from "@/components/CheckPermission";
import FallbackPermission from "@/components/FallbackPermission";
import FallBackRolesList from "@/components/FallBackRolesList";
import NoAccess from "@/components/NoAccess";
import { getCurrentUser } from "@/lib/getCurrentUser";
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
  const rolesQuery = supabase.from("role").select("*").order("created_at", { ascending: false });

  const [user, { data: roles }] = await Promise.all([getCurrentUser(), rolesQuery]);

  if (!user) return <NoAccess />;
  if (!user.roleId) return <NoAccess />;

  return (
    <>
      <AdminRoles rolesFallBack={roles} />
      <AddRole />
    </>
  );

  // return (
  //   <CheckPermission
  //     userRoleId={user.roleId}
  //     requiredPermission={Permissions.MANAGE_ROLES}
  //     fallback={<FallbackPermission />}
  //     loadingComponent={<FallBackRolesList />}
  //   >
  //     <AdminRoles rolesFallBack={roles} />
  //     <AddRole />
  //   </CheckPermission>
  // );
}
