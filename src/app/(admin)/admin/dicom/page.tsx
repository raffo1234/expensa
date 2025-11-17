import UploaderPage from "@/components/UploaderPage";
import ViewAllDicomsLink from "@/components/ViewAllDicomsLink";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export default async function Page() {
  const session = await auth();
  const user = session?.user;
  const t = await getTranslations("DicomPage");

  const { data } = await supabase.from("user").select("role_id").eq("id", user?.id).single();

  return (
    <>
      <div className="flex justify-between">
        <h1 className="mb-6 font-semibold text-lg block">
          {t("title")}
          <span className="text-sm text-gray-500 font-normal block pt-1">{t("description")}</span>
        </h1>
        <Suspense>
          {data?.role_id ? <ViewAllDicomsLink userRoleId={data.role_id} /> : null}
        </Suspense>
      </div>
      <Suspense>
        {user?.email && data?.role_id ? (
          <UploaderPage userEmail={user.email} userId={user.id} userRoleId={data.role_id} />
        ) : null}
      </Suspense>
    </>
  );
}
