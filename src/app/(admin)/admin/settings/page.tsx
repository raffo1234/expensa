import SettingsContent from "@/components/SettingsContent";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { RoleType } from "@/types/roleType";

export default async function Page() {
  const session = await auth();
  const user = session?.user;

  const { data } = await supabase.from("user").select("role_id").eq("id", user?.id).single();

  const { data: roles } = (await supabase
    .from("role")
    .select("id, name")
    .order("name", { ascending: true })) as { data: RoleType[] | null };

  if (!user || !data) return null;

  return (
    <div>
      <h1 className="mb-6 font-semibold text-lg block">Global Settings</h1>
      <SettingsContent userRoleId={data.role_id} roles={roles} />
    </div>
  );
}
