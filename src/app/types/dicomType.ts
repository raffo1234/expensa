import { DicomStateEnum } from "@/enums/dicomStateEnum";
import { UserType } from "./userType";
import { TemplateType } from "./templateType";

export type AssignedByType = {
  first_name: string;
  id: string;
  last_name: string;
  image_url: string;
  role: {
    id: string;
    name: string;
  }
}

export type DicomType = {
  id: string;
  dicom_url: string;
  user_id: string;
  user?: UserType;
  patient_name: string;
  patient_age: string;
  patient_id: string;
  study_description: string;
  modality: string;
  study_date: string;
  series_description: string;
  created_at: Date;
  completed_at: Date;
  state: DicomStateEnum;
  template_id?: string;
  report: string;
  gender: string;
  birthday: string;
  institution: string;
  template?: TemplateType | undefined;
  assigned_by?: AssignedByType | null;
  comment?: string | null;
};

export type PartialDicomWithTemplate = Partial<Omit<DicomType, "template">> & {
  template?: Partial<TemplateType>;
};
