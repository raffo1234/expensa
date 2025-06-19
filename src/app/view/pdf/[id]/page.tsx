import PDFPreview from "@/components/PDFPreview";
import { supabase } from "@/lib/supabase";
import { SharedLinkType } from "@/types/sharedLinkType";

type Params = Promise<{ id: string }>;

function hasExpired(expirationTimestamp: Date): boolean {
  const expiryDate = new Date(expirationTimestamp);
  const now = new Date();

  return expiryDate.getTime() < now.getTime();
}

export default async function Page({ params }: { params: Params }) {
  const { id } = await params;

  const { data } = (await supabase
    .from("shared_link")
    .select("expire_at, dicom_id, dicom(*, template(*))")
    .eq("id", id)
    .single()) as { data: SharedLinkType | null };

  if (!data) return null;

  if (!hasExpired(data.expire_at)) {
    console.log("Not expire yet:", data.expire_at);
  }

  if (!data.dicom) return null;

  return <PDFPreview dicom={data.dicom} />;
}
