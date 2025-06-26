import MyStudiesPageContent from "@/components/MyStudiesPageContent";
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

  if (!data?.id || !data?.role_id) return null;

  return <MyStudiesPageContent userId={data.id} userRoleId={data.role_id} />;
}
