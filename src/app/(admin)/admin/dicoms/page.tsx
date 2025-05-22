import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import DicomsTable from "@/components/DicomsTable";

export default async function Page() {
  const session = await auth();
  const userEmail = session?.user?.email;

  const { data: user } = await supabase
    .from("user")
    .select("id, role_id")
    .eq("email", userEmail)
    .single();

  if (!user?.id || !user.role_id) return null;

  return <DicomsTable userId={user.id} userRoleId={user.role_id} />;
}
