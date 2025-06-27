import { UserType } from "./userType";

export type DicomUserType = {
    dicom_id: string;
    user_id: string;
    assigned_by?: UserType; 
}