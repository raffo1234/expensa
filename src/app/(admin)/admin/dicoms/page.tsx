import { auth } from "@/lib/auth";
import DicomsTable from "@/components/DicomsTable";
import { supabase } from "@/lib/supabase";
import { Suspense } from "react";

export default async function Page() {
  const session = await auth();
  const user = session?.user;

  if (user?.id) {
    const { data } = await supabase
      .from("user")
      .select("role_id, template_id")
      .eq("id", user?.id)
      .single();

    user.role_id = data?.role_id;
    user.template_id = data?.template_id;
  }

  if (!user?.id || !user.role_id) return null;

  return (
    <Suspense>
      <DicomsTable userId={user.id} userRoleId={user.role_id} />
    </Suspense>
  );
}
