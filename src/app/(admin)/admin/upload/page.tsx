import UploaderPage from "@/components/UploaderPage";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";

export default async function Page() {
  const session = await auth();
  const user = session?.user;

  if (user?.id) {
    const { data } = await supabase
      .from("user")
      .select("role_id, template_id")
      .eq("id", user?.id)
      .single();

    user.role_id = data?.role_id;
    user.template_id = data?.template_id;
  }

  if (!user?.id || !user.role_id) return null;

  return (
    <>
      <div className="flex justify-between">
        <h1 className="mb-6 font-semibold text-lg block">
          Upload Files - Beta-0.0.1
          <span className="text-sm text-gray-500 font-normal block pt-1">
            DCM, Compressed files
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
      <UploaderPage userId={user.id} userRoleId={user.role_id} />
    </>
  );
}
