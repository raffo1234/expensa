export interface DicomMetadata {
  studyInstanceUID?: string;
  seriesInstanceUID?: string;
  sopInstanceUID?: string;
  instanceNumber?: string;
  patientName?: string;
  patientId?: string;
  patientAge?: string;
  studyDescription?: string;
  modality?: string;
  studyDate?: string;
  patientSex?: string;
  patientBirthDate?: string;
  institutionName?: string;
}
