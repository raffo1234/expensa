import PacsPageContent from "@/components/PacsPageContent";
import { getCurrentUser } from "@/lib/getCurrentUser";
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
      <PacsSection />
    </Suspense>
  );
}

async function PacsSection() {
  const user = await getCurrentUser();
  if (!user) return null;

  return <PacsPageContent userId={user.id} userRoleId={user.roleId} />;
}