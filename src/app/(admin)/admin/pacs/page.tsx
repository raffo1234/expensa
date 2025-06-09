import PacsPageContent from "@/components/PacsContentPage";
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

  return data?.role_id ? <PacsPageContent userRoleId={data?.role_id} /> : null;
}
