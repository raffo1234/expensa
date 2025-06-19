import { supabase } from "@/lib/supabase";
import { DicomType } from "@/types/dicomType";
import { UUIDTypes } from "uuid";

export default async function fetcherDicom (id: UUIDTypes) {
    const { data } = (await supabase
      .from("dicom")
      .select("*, template(*)")
      .eq("id", id)
      .single()) as { data: DicomType | null };
    return data;
  };