import AddTemplate from "@/components/AddTemplate";
import TemplatesTable from "@/components/TemplatesTable";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default async function Page() {
  const session = await auth();
  const userEmail = session?.user?.email;

  const { data: user } = await supabase
    .from("user")
    .select("id, role_id")
    .eq("email", userEmail)
    .single();

  const userId = user?.id;

  return (
    <>
      <h1 className="mb-6 font-semibold text-lg block">Locations</h1>
      <div className="border border-gray-200 rounded-xl bg-white">
        <TemplatesTable userId={userId} />
        <AddTemplate userId={userId} />
      </div>
    </>
  );
}
