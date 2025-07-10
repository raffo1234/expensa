import UploaderPage from "@/components/UploaderPage";
import ViewAllDicomsLink from "@/components/ViewAllDicomsLink";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default async function Page() {
  const session = await auth();
  const user = session?.user;

  const { data } = await supabase
    .from("user")
    .select("role_id, template_id")
    .eq("id", user?.id)
    .single();

  if (!user?.id || !user?.email || !data?.role_id) return null;

  return (
    <>
      <div className="flex justify-between">
        <h1 className="mb-6 font-semibold text-lg block">
          Upload Files
          <span className="text-sm text-gray-500 font-normal block pt-1">
            .dcm Compressed, Folder containing .dcm or a .dcm
          </span>
        </h1>
        <ViewAllDicomsLink userRoleId={data.role_id} />
      </div>
      <UploaderPage userEmail={user.email} userId={user.id} userRoleId={data.role_id} />
    </>
  );
}
