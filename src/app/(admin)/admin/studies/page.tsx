import DicomsTable from "@/components/DicomsTable";
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
      <DicomsSection />
    </Suspense>
  );
}

async function DicomsSection() {
  const user = await getCurrentUser();
  if (!user) return null;

  return <DicomsTable userId={user.id} userRoleId={user.roleId} />;
}