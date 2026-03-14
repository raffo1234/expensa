import NoAccess from "@/components/NoAccess";
import SettingsContent from "@/components/SettingsContent";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { supabase } from "@/lib/supabase";
import { RoleType } from "@/types/roleType";
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
    <div>
      <h1 className="mb-6 font-semibold text-lg block">Global Settings</h1>
      <Suspense fallback={<FallBack />}>
        <SettingsSection />
      </Suspense>
    </div>
  );
}

async function SettingsSection() {
  const [user, { data: roles }] = await Promise.all([
    getCurrentUser(),
    supabase.from("role").select("id, name").order("name", { ascending: true }),
  ]);

  if (!user) return <NoAccess />;

  return (
    <SettingsContent
      userRoleId={user.roleId}
      roles={roles as RoleType[] | null}
    />
  );
}