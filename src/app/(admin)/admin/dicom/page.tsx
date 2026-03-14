import UploaderPage from "@/components/UploaderPage";
import ViewAllDicomsLink from "@/components/ViewAllDicomsLink";
import CheckPermission from "@/components/CheckPermission";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Permissions } from "@/types/propertyState";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import NoAccess from "@/components/NoAccess";

function FallBack() {
  return (
    <div className="animate-pulse w-full h-[266px] rounded-2xl border border-dashed border-gray-200" />
  );
}

export default async function Page() {
  const t = await getTranslations("DicomPage");

  return (
    <>
      <div className="flex justify-between">
        <h1 className="font-semibold text-lg block">
          {t("title")}
          <span className="text-sm text-gray-500 font-normal block pt-1">
            {t("description")}
          </span>
        </h1>
      </div>
      <Suspense fallback={<FallBack />}>
        <UploaderSection />
      </Suspense>
    </>
  );
}

async function UploaderSection() {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !user?.email) return null;

  const { data } = await supabase
    .from("user")
    .select("role_id")
    .eq("id", user.id)
    .single();

  if (!data?.role_id) return <NoAccess />;

  return (
    <>
      <div className="flex justify-end mb-6">
        <CheckPermission
          userRoleId={data.role_id}
          requiredPermission={Permissions.VIEW_DICOMS}
          fallback={null}
          loadingComponent={
            <div className="h-11 w-[110px] rounded-lg animate-pulse bg-gray-100" />
          }
        >
          <ViewAllDicomsLink userRoleId={data.role_id} />
        </CheckPermission>
      </div>
      <CheckPermission
        userRoleId={data.role_id}
        requiredPermission={Permissions.UPLOAD_DICOM}
        fallback={<NoAccess />}
        loadingComponent={<div>
          <div className="flex gap-2 mb-4">
            <div className="h-[38px] w-[96px] rounded-lg animate-pulse bg-gray-100"></div>
            <div className="h-[38px] w-[82px] rounded-lg animate-pulse bg-gray-100"></div>
            <div className="h-[38px] w-[73px] rounded-lg animate-pulse bg-gray-100"></div>
          </div>
          <div className="h-[320px] w-full rounded-2xl animate-pulse bg-gray-100" />
        </div>}
      >
        <UploaderPage
          userEmail={user.email}
          userId={user.id}
          userRoleId={data.role_id}
        />
      </CheckPermission>
    </>
  );
}