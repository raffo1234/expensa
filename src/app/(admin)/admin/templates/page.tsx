import { Suspense } from "react";
import AddTemplate from "@/components/AddTemplate";
import CheckPermission from "@/components/CheckPermission";
import NoAccess from "@/components/NoAccess";
import TemplatesTable from "@/components/TemplatesTable";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Permissions } from "@/types/propertyState";
import FallbackTemplatesList from "@/components/FallbackTemplatesList";

export default async function Page() {
  return (
    <>
      <h1 className="mb-6 font-semibold text-lg block">Template Locations</h1>
      <div className="border border-gray-200 rounded-xl bg-white">
        <Suspense fallback={<FallbackTemplatesList />}>
          <TemplatesSection />
        </Suspense>
      </div>
    </>
  );
}

async function TemplatesSection() {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) return null;

  const { data } = await supabase
    .from("user")
    .select("role_id, template_id")
    .eq("id", user.id)
    .single();

  if (!data?.role_id) return <NoAccess />;

  return (
    <>
      <CheckPermission
        userRoleId={data.role_id}
        requiredPermission={Permissions.VIEW_TEMPLATES}
        fallback={<NoAccess />}
        loadingComponent={<FallbackTemplatesList />}
      >
        <TemplatesTable userId={user.id} />
        <AddTemplate userId={user.id} />
      </CheckPermission>
    </>
  );
}