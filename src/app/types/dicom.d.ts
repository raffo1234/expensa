declare module "@cornerstonejs/tools";
declare module "@cornerstonejs/dicom-image-loader";

export interface DicomInstance {
  sop_instance_uid: string;
  series_instance_uid: string;
  instance_number: number;
  storage_url: string;
  sop_class_uid: string;
  series_number: number;
  series_description: string;
  rows: number;
  columns: number;
  bits_allocated: number;
  bits_stored: number;
  high_bit: number;
  pixel_representation: number;
  pixel_spacing?: [number, number];
  image_orientation?: [number, number, number, number, number, number];
  image_position?: [number, number, number];
  window_center?: number;
  window_width?: number;
  rescale_intercept?: number;
  rescale_slope?: number;
}

export interface DicomTableRow {
  id: string;
  user_id: string;
  study_instance_uid: string;
  patient_name: string;
  patient_id: string;
  patient_age: string;
  study_description: string;
  modality: string;
  study_date: string;
  gender: string;
  birthday: string;
  institution: string;
  instances: DicomInstance[];
  created_at: string;
}
