import { getCurrentUser } from "@/lib/getCurrentUser";
import MySettings from "@/components/MySettings";
import { Suspense } from "react";
import NoAccess from "@/components/NoAccess";
import MySettingsPageFallBack from "@/components/MySettingsPageFallBack";
import PageTitle from "@/components/PageTitle";

export default async function Page() {
  return (
    <>
      <PageTitle>My Settings</PageTitle>
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
