import NoAccess from "@/components/NoAccess";
import PermissionsPage from "@/components/PermissionsPage";
import SkeletonPermissionsPage from "@/components/SkeletonPermissionsPage";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { supabase } from "@/lib/supabase";
import { PermissionType } from "@/types/permissionType";
import { Suspense } from "react";

export default async function Page() {
  return (
    <>
      <h1 className="mb-6 font-semibold text-lg block">Permissions</h1>
      <Suspense fallback={<SkeletonPermissionsPage />}>
        <PermissionsSection />
      </Suspense>
    </>
  );
}

async function PermissionsSection() {
  const permissionsQuery = supabase
    .from("permission")
    .select("*")
    .order("created_at", { ascending: false });

  const [user, { data: permissions }] = await Promise.all([getCurrentUser(), permissionsQuery]);

  if (!user) return <NoAccess />;

  return (
    <PermissionsPage
      userRoleId={user.roleId}
      permissions={permissions as PermissionType[] | null}
    />
  );
}
