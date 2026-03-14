import NoAccess from "@/components/NoAccess";
import PermissionsPage from "@/components/PermissionsPage";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { supabase } from "@/lib/supabase";
import { PermissionType } from "@/types/permissionType";
import { Suspense } from "react";

function FallBack() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="h-8 w-full bg-gray-200 animate-pulse rounded" />
      ))}
    </div>
  );
}

export default async function Page() {
  return (
    <Suspense fallback={<FallBack />}>
      <PermissionsSection />
    </Suspense>
  );
}

async function PermissionsSection() {
  const permissionsQuery = supabase
    .from("permission")
    .select("*")
    .order("created_at", { ascending: false });

  const [user, { data: permissions }] = await Promise.all([
    getCurrentUser(),
    permissionsQuery,
  ]);

  if (!user) return <NoAccess />;

  return (
    <PermissionsPage
      userRoleId={user.roleId}
      permissions={permissions as PermissionType[] | null}
    />
  );
}