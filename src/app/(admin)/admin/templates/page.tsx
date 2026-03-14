import { Suspense } from "react";
import AddTemplate from "@/components/AddTemplate";
import CheckPermission from "@/components/CheckPermission";
import NoAccess from "@/components/NoAccess";
import TemplatesTable from "@/components/TemplatesTable";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Permissions } from "@/types/propertyState";

function FallBack() {
  return (
    <div className="border border-gray-200 rounded-xl bg-white p-4 space-y-3">
      <div className="h-8 w-full bg-gray-200 animate-pulse rounded" />
      <div className="h-8 w-full bg-gray-200 animate-pulse rounded" />
      <div className="h-8 w-3/4 bg-gray-200 animate-pulse rounded" />
    </div>
  )
}

export default async function Page() {
  return (
    <>
      <h1 className="mb-6 font-semibold text-lg block">Template Locations</h1>
      <Suspense fallback={<FallBack />}>
        <TemplatesSection />
      </Suspense>
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
    <CheckPermission
      userRoleId={data.role_id}
      requiredPermission={Permissions.VIEW_TEMPLATES}
      fallback={<NoAccess />}
    >
      <div className="border border-gray-200 rounded-xl bg-white">
        <TemplatesTable userId={user.id} />
        <AddTemplate userId={user.id} />
      </div>
    </CheckPermission>
  );
}