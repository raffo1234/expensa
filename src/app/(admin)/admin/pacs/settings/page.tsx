import PacsSettingsPageContent from "@/components/PacsSettingsPageContent";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default async function Page() {
  const session = await auth();
  const user = session?.user;

  const { data } = await supabase
    .from("user")
    .select("id, role_id")
    .eq("id", user?.id)
    .single();

  return data?.role_id && data?.id ? (
    <PacsSettingsPageContent userId={data?.id} userRoleId={data?.role_id} />
  ) : null;
}
