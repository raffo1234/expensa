import { auth } from "@/lib/auth";
import DicomsTable from "@/components/DicomsTable";
import { supabase } from "@/lib/supabase";
import { Suspense } from "react";

async function DicomsTableLoader({ userId }: { userId: string }) {
  const { data } = await supabase
    .from("user")
    .select("role_id, template_id")
    .eq("id", userId)
    .single();

  if (!data?.role_id) return null;

  return <DicomsTable userId={userId} userRoleId={data.role_id} />;
}

function DicomsTableSkeleton() {
  return (
    <div className="animate-pulse space-y-2 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-10 rounded-md bg-slate-200" />
      ))}
    </div>
  );
}

export default async function Page() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return null;

  return (
    <Suspense fallback={<DicomsTableSkeleton />}>
      <DicomsTableLoader userId={userId} />
    </Suspense>
  );
}