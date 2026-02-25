import JSZip from "jszip";
import pLimit from "p-limit";
import { supabase } from "@/lib/supabase";
import { fileTypeFromBuffer } from "file-type";
import uploadDicomProcessor from "./uploadDicomProcessor";
import getAgeFromYYYYMMDD from "./getAgeFromYYYYMMDD";
import { getDICOMMetadata } from "./getDICOMMetadata";

// Definición estricta de la instancia para evitar errores de mapeo
export interface DicomInstance {
  sop_instance_uid: string;
  series_instance_uid: string;
  instance_number: number;
  storage_url: string;
  sop_class_uid: string;
  series_number: number; // Tag (0020,0011)
  series_description: string; // Tag (0008,103E)
  rows: number;
  columns: number;
  bits_allocated: number;
  bits_stored: number;
  high_bit: number;
  pixel_representation: number;
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
            instance_number: Number(metadata.instanceNumber) || 0,
            storage_url: `${storageDomain}/${storagePath}`,
            sop_class_uid: metadata.sopClassUID,
            series_number: Number(metadata.seriesNumber) || 1,
            series_description: metadata.seriesDescription || "",
            rows: metadata.rows || 512,
            columns: metadata.columns || 512,
            bits_allocated: metadata.bitsAllocated || 16,
            bits_stored: metadata.bitsStored || 16,
            high_bit: metadata.highBit || 15,
            pixel_representation: metadata.pixelRepresentation || 0,
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
        await supabase.from("dicom").insert(studyData);
      }
    }
  }
  return Array.from(studiesMap.keys());
};
