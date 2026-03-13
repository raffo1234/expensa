import { auth } from "@/lib/auth";
import DicomsTable from "@/components/DicomsTable";
import { supabase } from "@/lib/supabase";
import { Suspense } from "react";
import UploadLink from "@/components/UploadLink";

async function DicomsTableLoader({ userId }: { userId: string }) {
  const { data } = await supabase
    .from("user")
    .select("role_id, template_id")
    .eq("id", userId)
    .single();

  if (!data?.role_id) return null;

  return <DicomsTable userId={userId} userRoleId={data.role_id} />;
}

export default async function Page() {
  const session = await auth();
  const userId = session?.user?.id;

  return (
    <>
      <div className="mb-6 w-fit">
        <UploadLink />
      </div>
      <Suspense>
        {userId ? <DicomsTableLoader userId={userId} /> : null}
      </Suspense>
    </>
  );
}