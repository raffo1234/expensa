import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import ResidentsPageContent from "@/components/ResidentsPageContent";

export default async function Page() {
  const session = await auth();
  const user = session?.user;

  const { data } = await supabase
    .from("user")
    .select("role_id")
    .eq("id", user?.id)
    .single();

  if (!user?.id || !data?.role_id) return null;

  return <ResidentsPageContent userId={user?.id} userRoleId={data?.role_id} />;
}
