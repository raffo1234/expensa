import UploaderPage from "@/components/UploaderPage";
import ViewAllDicomsLink from "@/components/ViewAllDicomsLink";
import CheckPermission from "@/components/CheckPermission";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Permissions } from "@/types/propertyState";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import NoAccess from "@/components/NoAccess";

function FallBackUploader() {
  return (
    <>
      <div className="flex gap-2 mb-4">
        <div className="h-[38px] w-[96px] rounded-lg animate-pulse bg-gray-100"></div>
        <div className="h-[38px] w-[82px] rounded-lg animate-pulse bg-gray-100"></div>
        <div className="h-[38px] w-[73px] rounded-lg animate-pulse bg-gray-100"></div>
      </div>
      <div className="h-[320px] w-full rounded-2xl animate-pulse bg-gray-100" />
    </>
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
      <Suspense fallback={<FallBackUploader />}>
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
        <ViewAllDicomsLink userRoleId={data.role_id} />
      </div>
      <CheckPermission
        userRoleId={data.role_id}
        requiredPermission={Permissions.UPLOAD_DICOM}
        fallback={<NoAccess />}
        loadingComponent={<FallBackUploader />}
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