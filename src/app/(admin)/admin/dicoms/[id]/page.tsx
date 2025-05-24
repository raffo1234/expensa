import { supabase } from "@/lib/supabase";
import Report from "@/components/Report";
import { TemplateType } from "@/types/templateType";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Icon } from "@iconify/react/dist/iconify.js";

type Params = Promise<{ id: string }>;

export default async function Page({ params }: { params: Params }) {
  const { id } = await params;
  const session = await auth();
  const userEmail = session?.user?.email;

  const { data: user } = await supabase
    .from("user")
    .select("id, role_id")
    .eq("email", userEmail)
    .single();

  const userId = user?.id;

  const { data: templates } = (await supabase
    .from("template")
    .select("id, name, header_image_url, sign_image_url, footer_image_url")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })) as {
    data: TemplateType[] | null;
  };

  if (!user) return null;

  return (
    <>
      <div className="flex mb-4 print:hidden items-center justify-between">
        <h1 className="font-semibold text-lg block">Medical Report</h1>
        <Link
          href="/admin/dicoms"
          title="Templates"
          className="p-2 hover:text-cyan-400 transition-colors duration-300"
        >
          <Icon icon="solar:backspace-line-duotone" fontSize={36} />
        </Link>
      </div>
      <Report dicomId={id} templates={templates || []} userId={userId} />
    </>
  );
}
