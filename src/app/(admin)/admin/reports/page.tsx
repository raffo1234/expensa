import ReportsTable from "@/components/ReportsTable";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default async function Page() {
  const session = await auth();
  const user = session?.user;

  const { data } = await supabase
    .from("user")
    .select("id, role_id, template_id")
    .eq("email", user?.email)
    .single();

  return (
    <>
      <h1 className="mb-6 font-semibold text-lg block">Reports</h1>
      {data && data.template_id ? (
        <ReportsTable
          userTemplateId={data.template_id}
          userRoleId={data.role_id}
          userId={data.id}
        />
      ) : null}
    </>
  );
}
