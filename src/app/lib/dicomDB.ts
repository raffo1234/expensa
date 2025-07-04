import { DicomMetadata } from "@/types/dicomMetadata";
import { SupabaseClient } from "@supabase/supabase-js";
import getAgeFromYYYYMMDD from "@/lib/getAgeFromYYYYMMDD";
import { DicomImageData, InsertImageOperationResult } from "@/types/DicomImageData";

interface InsertOperationResult {
  id: string | null; // Null if insertion failed
  error: Error | null;
}

interface CheckResult {
  id: string | null; // Null if not found
  error: Error | null;
}

export async function checkIfStudyExists(
  supabase: SupabaseClient,
  userId: string,
  dataSet: DicomMetadata,
): Promise<CheckResult> {
  const table = "dicom";

  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("study_instance_uid", dataSet.studyInstanceUID)
    .eq("user_id", userId)
    .limit(1);

  if (error) {
    console.error("Error checking for existing record:", error.message);
    return { id: null, error: new Error(error.message) };
  }

  if (data && data.length > 0) {
    return { id: data[0].id, error: null };
  } else {
    return { id: null, error: null };
  }
}

export async function insertToDicom(
  supabase: SupabaseClient,
  userId: string,
  dataSet: DicomMetadata,
  publicUrl: string | undefined,
): Promise<InsertOperationResult> {
  const table = "dicom";

  const { data, error } = await supabase
    .from(table)
    .insert([
      {
        user_id: userId,
        study_instance_uid: dataSet.studyInstanceUID,
        patient_name: dataSet.patientName,
        patient_id: dataSet.patientId,
        patient_age: dataSet.patientAge || getAgeFromYYYYMMDD(dataSet.patientBirthDate ?? ""),
        study_description: dataSet.studyDescription,
        modality: dataSet.modality,
        study_date: dataSet.studyDate,
        gender: dataSet.patientSex,
        birthday: dataSet.patientBirthDate,
        institution: dataSet.institutionName,
        dicom_url: publicUrl,
      },
    ])
    .select("id")
    .single();

  if (error) {
    console.error("Error inserting record:", error.message);
    return { id: null, error: new Error(error.message) };
  }

  if (data) {
    return { id: data.id, error: null };
  } else {
    console.error("Insert operation returned no data despite no error.");
    return { id: null, error: new Error("Insert operation returned no data.") };
  }
}

export async function insertToDicomImage(
  supabase: SupabaseClient,
  imageData: DicomImageData,
): Promise<InsertImageOperationResult> {
  const table = "dicom_image";

  const { data, error } = await supabase
    .from(table)
    .insert([
      {
        dicom_id: imageData.dicomId,
        image_url: imageData.imageUrl,
        series_instance_uid: imageData.seriesInstanceUID,
        sop_instance_uid: imageData.sopInstanceUID,
        instance_number: imageData.instanceNumber,
        series_number: imageData.seriesNumber,
        file_path_in_archive: imageData.filePathInArchive,
        acquisition_date: imageData.acquisitionDate,
        acquisition_time: imageData.acquisitionTime,
        image_type: imageData.imageType,
        rows: imageData.rows,
        columns: imageData.columns,
        pixel_spacing: imageData.pixelSpacing,
        bits_stored: imageData.bitsStored,
        high_bit: imageData.highBit,
        pixel_representation: imageData.pixelRepresentation,
        photometric_interpretation: imageData.photometricInterpretation,
        window_center: imageData.windowCenter,
        window_width: imageData.windowWidth,
        series_description: imageData.seriesDescription,
        body_part_examined: imageData.bodyPartExamined,
        protocol_name: imageData.protocolName,
        patient_position: imageData.patientPosition,
        image_orientation_patient: imageData.imageOrientationPatient,
        image_position_patient: imageData.imagePositionPatient,
        kvp: imageData.kvp,
        x_ray_tube_current: imageData.xRayTubeCurrent,
        exposure_time: imageData.exposureTime,
        gantry_detector_tilt: imageData.gantryDetectorTilt,
      },
    ])
    .select("id")
    .single();

  if (error) {
    console.error("Error inserting record into dicom_image:", error.message);
    return { id: null, error: new Error(error.message) };
  }

  if (data) {
    return { id: data.id, error: null };
  } else {
    console.error("Dicom image insert operation returned no data despite no error.");
    return { id: null, error: new Error("Dicom image insert operation returned no data.") };
  }
}
