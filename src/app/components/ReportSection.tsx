import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import CheckPermission from "./CheckPermission";
import { Permissions } from "@/types/propertyState";
import FallbackPermission from "./FallbackPermission";
import LoadingReportComponent from "./LoadingReportComponent";
import Report from "@/components/Report";
import { TemplateType } from "@/types/templateType";
import NoAccess from "./NoAccess";

export default async function ReportSection({ dicomId }: { dicomId: string }) {
    const session = await auth();
    const user = session?.user;
    if (!user?.id) return null;

    const [{ data }, { data: templates }] = await Promise.all([
        supabase.from("user").select("role_id").eq("id", user.id).single(),
        supabase
            .from("template")
            .select("id, name, description, header_image_url, sign_image_url, footer_image_url")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
    ]);

    if (!data?.role_id) return <NoAccess />;

    return (
        <CheckPermission
            userRoleId={data.role_id}
            requiredPermission={Permissions.GENERATE_REPORT}
            fallback={<FallbackPermission />}
            loadingComponent={<LoadingReportComponent />}
        >
            <Report
                dicomId={dicomId}
                userRoleId={data.role_id}
                templates={(templates as TemplateType[]) || []}
            />
        </CheckPermission>
    );
}