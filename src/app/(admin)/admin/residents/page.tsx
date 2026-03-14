import NoAccess from "@/components/NoAccess";
import ResidentsPageContent from "@/components/ResidentsPageContent";
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
    <>
      <h1 className="mb-6 font-semibold text-lg block">Residents</h1>
      <Suspense fallback={<FallBack />}>
        <ResidentsSection />
      </Suspense>
    </>
  );
}

async function ResidentsSection() {
  const user = await getCurrentUser();
  if (!user) return <NoAccess />;

  return <ResidentsPageContent userId={user.id} userRoleId={user.roleId} />;
}