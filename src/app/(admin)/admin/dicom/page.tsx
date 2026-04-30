import UploaderPage from "@/components/UploaderPage";
import ViewAllDicomsLink from "@/components/ViewAllDicomsLink";
import { Permissions } from "@/types/propertyState";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import NoAccess from "@/components/NoAccess";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { checkPermissions } from "@/lib/checkPermissions";
import FallBackSeeDicomsLink from "@/components/FallBackSeeDicomsLink";

function FallBackUploader() {
  return (
    <>
      <div className="mb-6 flex justify-end">
        <FallBackSeeDicomsLink />
      </div>
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
          <span className="text-sm text-gray-500 font-normal block pt-1">{t("description")}</span>
        </h1>
      </div>
      <Suspense fallback={<FallBackUploader />}>
        <UploaderSection />
      </Suspense>
    </>
  );
}

async function UploaderSection() {
  const user = await getCurrentUser();
  if (!user) return <NoAccess />;
  if (!user.roleId) return <NoAccess />;
  const [permissions] = await Promise.all([
    checkPermissions(user.roleId, [Permissions.UPLOAD_DICOM]),
  ]);
  if (!permissions) return <NoAccess />;

  return (
    <>
      <div className="flex justify-end mb-6">
        <ViewAllDicomsLink userRoleId={user.roleId} />
      </div>
      <UploaderPage userEmail={user.email} userId={user.id} userRoleId={user.roleId} />
    </>
  );
}
