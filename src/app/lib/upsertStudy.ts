import { DicomType } from "@/types/dicomType";
import { supabase } from "./supabase";
import { v4 as uuidv4 } from "uuid";
import { formatYYYYMMDDtoABY } from "./DateFormatterLib";

export default async function upsertStudy(
  user_id: string,
  aet_server: string,
  dataset: Partial<DicomType>
) {
  const matchFields = {
    user_id,
    study_date: dataset.study_date,
    patient_name: dataset.patient_name,
    study_description: dataset.study_description,
  };

  const { data: existing, error: fetchError } = await supabase
    .from("dicom")
    .select("id")
    .match(matchFields)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing) {
    return { id: existing.id, isNew: false };
  }

  const newRecord: Partial<DicomType> = {
    id: uuidv4(),
    user_id,
    study_date: dataset.study_date,
    institution: aet_server,
    modality: dataset.modality,
    patient_age: dataset.birthday ? formatYYYYMMDDtoABY(dataset.birthday) : "",
    study_description: dataset.study_description,
    patient_name: dataset.patient_name,
    patient_id: dataset.patient_id,
    birthday: dataset.birthday,
    gender: dataset.gender,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("dicom")
    .insert(newRecord)
    .select("id")
    .single();

  if (insertError) throw insertError;

  return { id: inserted.id, isNew: true };
}
