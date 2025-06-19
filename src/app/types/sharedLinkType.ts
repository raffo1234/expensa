import { DicomType } from "./dicomType";

export type SharedLinkType = {
  id: string;
  emamil: string;
  dicom_id: string;
  created_by: string;
  created_at: Date;
  expire_at: Date;
  dicom?: DicomType;
  user?: DicomType;
};