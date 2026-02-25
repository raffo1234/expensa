import JSZip from "jszip";
import pLimit from "p-limit";
import { supabase } from "@/lib/supabase";
import { fileTypeFromBuffer } from "file-type";
import uploadDicomProcessor from "./uploadDicomProcessor";
import getAgeFromYYYYMMDD from "./getAgeFromYYYYMMDD";
import { getDICOMMetadata } from "./getDICOMMetadata";

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

interface DicomStudy {
  study_instance_uid: string;
  user_id: string;
  modality: string;
  instances: DicomInstance[];
  patient_name: string;
  patient_id: string;
  study_description: string;
  study_date: string;
  patient_age: string;
  gender: string;
  birthday: string;
  institution: string;
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

const isDicomBinary = (buffer: Uint8Array): boolean => {
  if (buffer.length < 132) return false;
  return new TextDecoder().decode(buffer.slice(128, 132)) === "DICM";
};

export const processDicomStudyTurbo = async (
  zipFile: File,
  userId: string,
  onProgress?: (percent: number) => void,
): Promise<string[]> => {
  const zip = await new JSZip().loadAsync(zipFile);
  const studiesMap = new Map<string, DicomStudy>();
  const limit = pLimit(15);

  const filesToProcess = Object.keys(zip.files).filter((path) => {
    const f = zip.files[path];
    return !f.dir && !path.includes("__MACOSX") && !path.toLowerCase().includes("dicomdir");
  });

  const totalFiles = filesToProcess.length;
  let processedCount = 0;
  const storageDomain = (process.env.NEXT_PUBLIC_STORAGE_DOMAIN || "").replace(/\/$/, "");

  const tasks = filesToProcess.map((relativePath) => {
    const file = zip.files[relativePath];
    return limit(async () => {
      try {
        const content = await file.async("uint8array");
        if (content.length === 0) return;

        const typeInfo = await fileTypeFromBuffer(content);
        if (!isDicomBinary(content) && typeInfo?.ext !== "dcm") return;

        const fileBlob = new Blob([content as BlobPart], { type: "application/dicom" });
        const metadata = await getDICOMMetadata(fileBlob);

        if (metadata?.studyInstanceUID) {
          const storagePath = `dicom/${metadata.studyInstanceUID}/${metadata.seriesInstanceUID}/${metadata.sopInstanceUID}.dcm`;

          await uploadDicomProcessor(fileBlob, storagePath, () => {});

          let study = studiesMap.get(metadata.studyInstanceUID);
          if (!study) {
            const finalAge =
              metadata.patientAge && metadata.patientAge !== ""
                ? metadata.patientAge
                : getAgeFromYYYYMMDD(metadata.patientBirthDate || "");

            // MAPEADO A COLUMNAS DE TU TABLA DICOM
            study = {
              study_instance_uid: metadata.studyInstanceUID,
              user_id: userId,
              modality: metadata.modality || "OT",
              instances: [],
              patient_name: metadata.patientName || "Unknown",
              patient_id: metadata.patientId || "Unknown",
              study_description: metadata.studyDescription || "",
              study_date: metadata.studyDate || "",
              patient_age: String(finalAge),
              gender: metadata.patientSex || "O",
              birthday: metadata.patientBirthDate || "",
              institution: metadata.institutionName || "",
            };
            studiesMap.set(metadata.studyInstanceUID, study);
          }

          study.instances.push({
            sop_instance_uid: metadata.sopInstanceUID,
            series_instance_uid: metadata.seriesInstanceUID,
            instance_number: metadata.instanceNumber || 0,
            storage_url: `${storageDomain}/${storagePath}`,
            sop_class_uid: metadata.sopClassUID,
            series_number: metadata.seriesNumber || 1,
            series_description: metadata.seriesDescription || "",
            rows: metadata.rows || 512,
            columns: metadata.columns || 512,
            bits_allocated: metadata.bitsAllocated || 16,
            bits_stored: metadata.bitsStored || 16,
            high_bit: metadata.highBit || 15,
            pixel_representation: metadata.pixelRepresentation || 0,
            pixel_spacing: metadata.pixelSpacing,
            image_orientation: metadata.imageOrientation,
            image_position: metadata.imagePosition,
            window_center: metadata.windowCenter,
            window_width: metadata.windowWidth,
            rescale_intercept: metadata.rescaleIntercept,
            rescale_slope: metadata.rescaleSlope,
          });
        }
      } catch (err) {
        console.error("Error procesando:", relativePath, err);
      } finally {
        processedCount++;
        onProgress?.(Math.round((processedCount / totalFiles) * 100));
      }
    });
  });

  await Promise.all(tasks);

  if (studiesMap.size > 0) {
    for (const [uid, studyData] of studiesMap.entries()) {
      const { data: exists } = await supabase
        .from("dicom")
        .select("study_instance_uid")
        .eq("study_instance_uid", uid)
        .maybeSingle();

      if (!exists) {
        studyData.instances.sort((a, b) => a.instance_number - b.instance_number);
        const { error: insertError } = await supabase.from("dicom").insert(studyData);
        if (insertError) console.error("Error insert:", insertError.message);
      }
    }
  }
  return Array.from(studiesMap.keys());
};
