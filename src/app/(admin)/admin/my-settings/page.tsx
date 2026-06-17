import { getCurrentUser } from "@/lib/getCurrentUser";
import MySettings from "@/components/MySettings";
import { Suspense } from "react";
import NoAccess from "@/components/NoAccess";
import MySettingsPageFallBack from "@/components/MySettingsPageFallBack";
import FormSection from "@/components/FormSection";

export default async function Page() {
  return (
    <FormSection title="My Settings">
      <Suspense fallback={<MySettingsPageFallBack />}>
        <SettingsSection />
      </Suspense>
    </FormSection>
  );
}

async function SettingsSection() {
  const user = await getCurrentUser();
  if (!user) return <NoAccess />;

  return <MySettings userId={user.id} />;
}
