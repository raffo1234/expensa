import PacsPageContent from "@/components/PacsPageContent";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default async function Page() {
  const session = await auth();
  const user = session?.user;

  const { data } = await supabase
    .from("user")
    .select("role_id")
    .eq("id", user?.id)
    .single();

  return data?.role_id ? (
    <PacsPageContent userId={user?.id} userRoleId={data?.role_id} />
  ) : null;
}
