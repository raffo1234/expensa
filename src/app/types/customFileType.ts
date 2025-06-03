export enum CustomFileStateType {
  selected = "Selected",
  processing = "Processing...",
  processed = "Processed",
  duplicated = "Duplicated",
  inserted = "Inserted",
  noTag = "No Tag found",
  noDcimFile = "No DICOM file",
  fileNotSupported = "File no supported!",
  errorLoading = "Error loading!",
}

export type CustomFileType = {
  id: string;
  studies: Study[];
  file: File;
  patientName: string;
  state: CustomFileStateType;
  bgColor: string;
};

export type Study = { id: string; state: CustomFileStateType };
