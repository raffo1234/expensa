import { Suspense } from "react";
import AddTemplate from "@/components/AddTemplate";
import CheckPermission from "@/components/CheckPermission";
import NoAccess from "@/components/NoAccess";
import TemplatesTable from "@/components/TemplatesTable";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Permissions } from "@/types/propertyState";
import FallbackTemplatesList from "@/components/FallbackTemplatesList";
import { getCurrentUser } from "@/lib/getCurrentUser";

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
  const user = await getCurrentUser();
  if (!user) return <NoAccess />;

  return (
    <>
      <CheckPermission
        userRoleId={user.roleId}
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