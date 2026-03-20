import { supabase } from "@/lib/supabase";
import { DicomType } from "@/types/dicomType";
import { UUIDTypes } from "uuid";

export default async function fetcherDicom(id: UUIDTypes) {
  const { data } = (await supabase
    .from("dicom")
    .select("*, template(*), user:user_id(*)")
    .eq("id", id)
    .maybeSingle()) as { data: DicomType | null };
  return data;
}
