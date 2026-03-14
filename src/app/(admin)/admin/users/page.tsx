import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import CheckPermission from "@/components/CheckPermission";
import { Permissions } from "@/types/propertyState";
import FallbackPermission from "@/components/FallbackPermission";
import UsersTable from "@/components/UsersTable";

export default async function Page() {
  return (
    <Suspense fallback={
      <div className="space-y-3">
        <div className="h-8 w-full bg-gray-200 animate-pulse rounded" />
        <div className="h-8 w-full bg-gray-200 animate-pulse rounded" />
        <div className="h-8 w-3/4 bg-gray-200 animate-pulse rounded" />
      </div>
    }>
      <UsersSection />
    </Suspense>
  );
}

async function UsersSection() {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) return null;

  const { data } = await supabase
    .from("user")
    .select("role_id")
    .eq("id", user.id)
    .single();

  if (!data?.role_id) return null;

  return (
    <CheckPermission
      userRoleId={data.role_id}
      requiredPermission={Permissions.MANAGE_USERS}
      fallback={<FallbackPermission />}
    >
      <UsersTable />
    </CheckPermission>
  );
}