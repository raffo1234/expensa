import CheckPermission from "@/components/CheckPermission";
import FallbackPermission from "@/components/FallbackPermission";
import Uploader from "@/components/Uploader";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Permissions } from "@/types/propertyState";
import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";

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
      <div className="flex justify-between">
        <h1 className="mb-6 font-semibold text-lg block">
          Upload Files
          <span className="text-sm text-gray-500 font-normal block pt-1">
            Compressed files containing DICOM files
          </span>
        </h1>
        <Link
          href="/admin/dicoms"
          className="flex items-center gap-2 cursor-pointer text-center p-3 text-cyan-400 group"
          title="View All"
        >
          <Icon icon="solar:file-text-line-duotone" fontSize={24} />
          <span className="group-hover:underline">View All</span>
        </Link>
      </div>
      <CheckPermission
        userRoleId={user.role_id}
        requiredPermission={Permissions.UPLOAD_DICOM}
        fallback={<FallbackPermission />}
      >
        <Uploader userId={userId} />
      </CheckPermission>
    </>
  );
}
