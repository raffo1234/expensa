import { getCurrentUser } from "@/lib/getCurrentUser";
import MySettings from "@/components/MySettings";
import { Suspense } from "react";
import NoAccess from "@/components/NoAccess";

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
    <>
      <h1 className="mb-6 font-semibold text-lg block">My Settings</h1>
      <Suspense fallback={<FallBack />}>
        <SettingsSection />
      </Suspense>
    </>
  );
}

async function SettingsSection() {
  const user = await getCurrentUser();
  if (!user) return <NoAccess />

  return <MySettings userId={user.id} />;
}