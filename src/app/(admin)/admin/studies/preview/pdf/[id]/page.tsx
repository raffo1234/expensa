import PDFPreview from "@/components/PDFPreview";
import { supabase } from "@/lib/supabase";

type Params = Promise<{ id: string }>;

export default async function Page({ params }: { params: Params }) {
  const { id } = await params;

  const { data: dicom } = await supabase
    .from("dicom")
    .select("*, template(*)")
    .eq("id", id)
    .single();

  if (!dicom) return null;

  return <PDFPreview dicom={dicom} />;
}
