import AddTemplate from "@/components/AddTemplate";
import CheckPermission from "@/components/CheckPermission";
import FallbackPermission from "@/components/FallbackPermission";
import TemplatesTable from "@/components/TemplatesTable";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Permissions } from "@/types/propertyState";

export default async function Page() {
  const session = await auth();
  const userEmail = session?.user?.email;

  const { data: user } = await supabase
    .from("user")
    .select("id, role_id")
    .eq("email", userEmail)
    .single();

  const userId = user?.id;

  if (!userId) return null;

  return (
    <>
      <h1 className="mb-6 font-semibold text-lg block">Locations</h1>
      <CheckPermission
        userRoleId={user.role_id}
        requiredPermission={Permissions.VIEW_TEMPLATES}
        fallback={<FallbackPermission />}
      >
        <>
          <div className="border border-gray-200 rounded-xl bg-white">
            <TemplatesTable userId={userId} />
            <AddTemplate userId={userId} />
          </div>
        </>
      </CheckPermission>
    </>
  );
}
