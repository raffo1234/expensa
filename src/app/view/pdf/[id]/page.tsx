import PDFPreview from "@/components/PDFPreview";
import { supabase } from "@/lib/supabase";
import { SharedLinkType } from "@/types/sharedLinkType";

type Params = Promise<{ id: string }>;

export default async function Page({ params }: { params: Params }) {
  const { id } = await params;

  const { data } = (await supabase
    .from("shared_link")
    .select("expire_at, dicom_id, dicom(*, template(*))")
    .eq("id", id)
    .gt("expire_at", new Date().toISOString())
    .single()) as { data: SharedLinkType | null };

  if (!data) return null;

  if (!data.dicom) return null;
  return <PDFPreview dicom={data.dicom} />;
}
