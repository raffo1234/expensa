import { getCurrentUser } from "@/lib/getCurrentUser";
import MySettings from "@/components/MySettings";
import { Suspense } from "react";
import NoAccess from "@/components/NoAccess";
import MySettingsPageFallBack from "@/components/MySettingsPageFallBack";

export default async function Page() {
  return (
    <>
      <h1 className="mb-6 font-semibold text-lg block">My Settings</h1>
      <Suspense fallback={<MySettingsPageFallBack />}>
        <SettingsSection />
      </Suspense>
    </>
  );
}

async function SettingsSection() {
  const user = await getCurrentUser();
  if (!user) return <NoAccess />;

  return <MySettings userId={user.id} />;
}
