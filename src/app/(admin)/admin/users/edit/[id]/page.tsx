import EditUserContent from "@/components/EditUserContent";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Params = Promise<{ id: string }>;

export default async function Page({ params }: { params: Params }) {
  const { id } = await params;
  const session = await auth();
  const user = session?.user;

  const { data } = await supabase
    .from("user")
    .select("role_id, template_id")
    .eq("id", user?.id)
    .single();

  if (!user?.id) return null;

  return (
    <EditUserContent
      userId={id}
      currentUserRoleId={data?.role_id}
      currentUserId={user?.id}
    />
  );
}
