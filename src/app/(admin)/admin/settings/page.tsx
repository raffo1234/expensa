import NoAccess from "@/components/NoAccess";
import SettingsContent from "@/components/SettingsContent";
import SettingsPageFallBack from "@/components/SettingsPageFallBack";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { supabase } from "@/lib/supabase";
import { RoleType } from "@/types/roleType";
import { Suspense } from "react";

export default async function Page() {
  return (
    <>
      <h1 className="mb-6 font-semibold text-lg block">Global Settings</h1>
      <Suspense fallback={<SettingsPageFallBack />}>
        <SettingsSection />
      </Suspense>
    </>
  );
}

async function SettingsSection() {
  const [user, { data: roles }] = await Promise.all([
    getCurrentUser(),
    supabase.from("role").select("id, name").order("name", { ascending: true }),
  ]);

  if (!user) return <NoAccess />;
  if (!user.roleId) return <NoAccess />;
  return <SettingsContent userRoleId={user.roleId} roles={roles as RoleType[] | null} />;
}
