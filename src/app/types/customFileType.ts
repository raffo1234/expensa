export enum CustomFileStateType {
  verifying = "Verifying ...",
  selected = "Selected",
  inserting = "Inserting...",
  processing = "Processing...",
  uploading = "Uploading...",
  processed = "Processed",
  duplicated = "Duplicated",
  inserted = "Inserted",
  noTag = "No Tag found",
  noDcimFile = "No DICOM file",
  fileNotSupported = "File no supported!",
  errorLoading = "Error loading!",
  errorInserting = "Error inserting!",
  errorUploading = "Error uploading!",
}

export type CustomFileType = {
  id: string;
  studies: Study[];
  file: File;
  patientName: string;
  state: CustomFileStateType;
  isAvailableForR2Upload: boolean;
  bgColor: string;
  uploadPercentage: number;
};

export type Study = { id: string; state: CustomFileStateType };
