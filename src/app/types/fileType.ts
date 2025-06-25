export interface FileType {
    id: string;
    dicom_id: string;
    path: string;
    extension: string;
    size: string;
    mime_type?: string;
    name?: string;
    description?: string;
    created_at: Date;
  }
  