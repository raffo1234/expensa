import FormSection from "@/components/FormSection";
import NoAccess from "@/components/NoAccess";
import PermissionsPage from "@/components/PermissionsPage";
import SkeletonPermissionsPage from "@/components/SkeletonPermissionsPage";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { supabase } from "@/lib/supabase";
import { PermissionType } from "@/types/permissionType";
import { Suspense } from "react";

export default async function Page() {
  return (
    <FormSection title="Permissions">
      <Suspense fallback={<SkeletonPermissionsPage />}>
        <PermissionsSection />
      </Suspense>
    </FormSection>
  );
}

async function PermissionsSection() {
  const permissionsQuery = supabase
    .from("permission")
    .select("*")
    .order("created_at", { ascending: false });

  const [user, { data: permissions }] = await Promise.all([getCurrentUser(), permissionsQuery]);

  if (!user) return <NoAccess />;
  if (!user.roleId) return <NoAccess />;
  return (
    <PermissionsPage
      userRoleId={user.roleId}
      permissions={permissions as PermissionType[] | null}
    />
  );
}
