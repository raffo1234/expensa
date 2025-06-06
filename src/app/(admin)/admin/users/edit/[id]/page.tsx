import EditUserContent from "@/components/EditUserContent";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Params = Promise<{ id: string }>;

export default async function Page({ params }: { params: Params }) {
  const { id } = await params;
  const session = await auth();

  const { data: user } = await supabase
    .from("user")
    .select("id, role_id, template_id")
    .eq("id", id)
    .single();

  const { data: currentUser } = await supabase
    .from("user")
    .select("id, role_id, template_id")
    .eq("id", session?.user?.id)
    .single();

  if (!user?.id) return null;

  return (
    <EditUserContent
      userId={user?.id}
      userRoleId={user?.role_id}
      currentUserId={currentUser?.id}
      currentUserRoleId={currentUser?.role_id}
    />
  );
}
