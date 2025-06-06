import EditUserContent from "@/components/EditUserContent";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Params = Promise<{ id: string }>;

export default async function Page({ params }: { params: Params }) {
  const { id } = await params;
  const session = await auth();

  const { data: currentUser } = await supabase
    .from("user")
    .select("id, role_id, template_id")
    .eq("id", session?.user?.id)
    .single();

  if (!id) return null;

  return (
    <EditUserContent
      userId={id}
      currentUserId={currentUser?.id}
      currentUserRoleId={currentUser?.role_id}
    />
  );
}
