export type DicomStudyType = {
  id: string;
  study_instance_uid: string;
  hospital_id: string;
  ae_title_source: string;
  ae_title_destination: string;
  patient_name: string | null;
  patient_id: string | null;
  patient_age: string | null;
  patient_sex: string | null;
  study_description: string | null;
  study_date: string | null;
  modality: string | null;
  instances: object[];
  receive_status: "receiving" | "complete" | "failed";
  received_at: string;
  completed_at: string | null;
  total_instances: number;
  received_instances: number;
  created_at: string;
  updated_at: string;
  hospital?: {
    id: string;
    name: string;
    ae_title: string;
  };
};
