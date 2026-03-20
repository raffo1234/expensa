import { supabase } from "@/lib/supabase";
import Report from "@/components/Report";
import { TemplateType } from "@/types/templateType";
import { auth } from "@/lib/auth";
import Link from "next/link";
import CheckPermission from "@/components/CheckPermission";
import { Permissions } from "@/types/propertyState";
import FallbackPermission from "@/components/FallbackPermission";
import LoadingReportComponent from "@/components/LoadingReportComponent";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import NoAccess from "@/components/NoAccess";

type Params = Promise<{ id: string }>;

export default async function Page({ params }: { params: Params }) {
  const { id } = await params;

  if (!id) notFound();

  return (
    <>
      <div className="flex mb-4 print:hidden items-center justify-between">
        <h1 className="font-semibold text-lg block">Report Editor</h1>
        <Link
          href="/admin/dicoms"
          title="List of Studies"
          className="p-2 hover:text-cyan-400 transition-colors duration-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="36"
            height="36"
            viewBox="0 0 24 24"
          >
            <g fill="none" stroke="currentColor" strokeWidth="1.5">
              <path
                d="M11.142 20c-2.227 0-3.341 0-4.27-.501c-.93-.502-1.52-1.42-2.701-3.259l-.681-1.06C2.497 13.634 2 12.86 2 12s.497-1.634 1.49-3.18l.68-1.06c1.181-1.838 1.771-2.757 2.701-3.259S8.915 4 11.142 4h2.637c3.875 0 5.813 0 7.017 1.172S22 8.229 22 12s0 5.657-1.204 6.828S17.654 20 13.78 20z"
                opacity="0.5"
              />
              <path strokeLinecap="round" d="m15.5 9.5l-5 5m0-5l5 5" />
            </g>
          </svg>
        </Link>
      </div>
      <Suspense fallback={<LoadingReportComponent />}>
        <ReportSection dicomId={id} />
      </Suspense>
    </>
  );
}

async function ReportSection({ dicomId }: { dicomId: string }) {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) return null;
  const userId = user.id;

  const [{ data: userData }, { data: templates }, { data: dicom }] =
    await Promise.all([
      supabase.from("user").select("role_id").eq("id", userId).single(),

      supabase
        .from("template")
        .select(
          "id, name, description, header_image_url, sign_image_url, footer_image_url"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),

      supabase
        .from("dicom")
        .select("*, template(*), user(*)")
        .eq("id", dicomId)
        .single(),
    ]);

  if (!userData?.role_id) return <NoAccess />;

  return (
    <CheckPermission
      userRoleId={userData.role_id}
      requiredPermission={Permissions.GENERATE_REPORT}
      fallback={<FallbackPermission />}
      loadingComponent={<LoadingReportComponent />}
    >
      <Report
        dicomId={dicomId}
        userRoleId={userData.role_id}
        templates={(templates as TemplateType[]) || []}
        fallbackDicom={dicom ?? undefined}
      />
    </CheckPermission>
  );
}
