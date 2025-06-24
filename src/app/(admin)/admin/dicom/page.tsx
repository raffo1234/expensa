import UploaderPage from "@/components/UploaderPage";
import ViewAllDicomsLink from "@/components/ViewAllDicomsLink";
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

  if (!user?.id || !user?.email || !user.role_id) return null;

  return (
    <>
      <div className="flex justify-between">
        <h1 className="mb-6 font-semibold text-lg block">
          Upload Files
          <span className="text-sm text-gray-500 font-normal block pt-1">
            .dcm Compressed, Folder containing .dcm or a .dcm
          </span>
        </h1>
        <ViewAllDicomsLink userRoleId={user.role_id} />
      </div>
      <UploaderPage
        userEmail={user.email}
        userId={user.id}
        userRoleId={user.role_id}
      />
    </>
  );
}
