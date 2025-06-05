import ReportsTable from "@/components/ReportsTable";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default async function Page() {
  const session = await auth();
  const user = session?.user;

  if (user?.id) {
    const { data } = await supabase
      .from("user")
      .select("role_id, template_id")
      .eq("id", user?.id)
      .single();

    user.role_id = data?.role_id;
    user.template_id = data?.template_id;
  }

  if (!user?.id || !user.role_id) return null;

  return (
    <>
      <h1 className="mb-6 font-semibold text-lg block">Reports</h1>
      {user && user.template_id ? (
        <ReportsTable
          userTemplateId={user.template_id}
          userRoleId={user.role_id}
          userId={user.id}
        />
      ) : null}
    </>
  );
}
