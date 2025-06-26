import useSWR from "swr";
import { supabase } from "@/lib/supabase";

const fetchHasAssignments = async (dicomId: string): Promise<boolean> => {
  const { count, error } = await supabase
    .from("dicom_user")
    .select("user_id", { count: "exact", head: true })
    .eq("dicom_id", dicomId);

  if (error) throw error;

  return (count ?? 0) > 0;
};

export function useDicomHasAssignments(dicomId: string) {
  const key = dicomId ? `dicom-has-assignments-${dicomId}` : null;

  const swr = useSWR(key, () => fetchHasAssignments(dicomId));

  return swr;
}
