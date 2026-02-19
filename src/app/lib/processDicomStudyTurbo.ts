// src/lib/dicom-processor.ts
import JSZip from "jszip";
import pLimit from "p-limit";
import { supabase } from "@/lib/supabase";
import uploadDicomProcessor from "./uploadDicomProcessor";
import getAgeFromYYYYMMDD from "./getAgeFromYYYYMMDD";
import { getDICOMMetadata } from "./getDICOMMetadata";

// --- Interfaces de Dominio ---
interface DicomInstance {
  sop_instance_uid: string;
  series_instance_uid: string;
  instance_number: number;
  storage_url: string;
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

export const processDicomStudyTurbo = async (
  zipFile: File,
  userId: string,
  onProgress?: (percent: number) => void,
): Promise<string[]> => {
  const zip = await new JSZip().loadAsync(zipFile);
  const studiesMap = new Map<string, DicomStudy>();
  const limit = pLimit(15);

  const allEntries = Object.keys(zip.files);
  // Filtramos archivos válidos (no directorios, no basura de sistema)
  const filesToProcess = allEntries.filter((path) => {
    const f = zip.files[path];
    return !f.dir && !path.includes("__MACOSX") && !path.toLowerCase().includes("dicomdir");
  });

  const totalFiles = filesToProcess.length;
  let processedCount = 0;

  // Extraemos el dominio una sola vez y validamos
  const storageDomain = process.env.NEXT_PUBLIC_STORAGE_DOMAIN?.replace(/\/$/, "");
  if (!storageDomain) throw new Error("NEXT_PUBLIC_STORAGE_DOMAIN no está configurada.");

  const tasks = filesToProcess.map((relativePath) => {
    const file = zip.files[relativePath];

    return limit(async () => {
      try {
        const content = await file.async("uint8array");
        if (content.length === 0) return;

        // Cast seguro para el Blob
        const fileBlob = new Blob([content as BlobPart], { type: "application/dicom" });
        const metadata = await getDICOMMetadata(fileBlob);

        if (metadata) {
          const { studyInstanceUID, seriesInstanceUID, sopInstanceUID, instanceNumber } = metadata;
          const storagePath = `dicom/${studyInstanceUID}/${seriesInstanceUID}/${sopInstanceUID}.dcm`;

          // Subida a R2
          await uploadDicomProcessor(fileBlob, storagePath, () => {});

          // Gestión del Map con tipado fuerte
          let study = studiesMap.get(studyInstanceUID);
          if (!study) {
            study = {
              study_instance_uid: studyInstanceUID,
              user_id: userId,
              modality: metadata.modality || "N/A",
              instances: [],
              patient_name: metadata.patientName || "Unknown Patient",
              patient_id: metadata.patientId || "Unknown ID",
              study_description: metadata.studyDescription || "No Description",
              study_date: metadata.studyDate || "Unknown Date",
              patient_age: String(
                metadata.patientAge || getAgeFromYYYYMMDD(metadata.patientBirthDate ?? ""),
              ),
              gender: metadata.patientSex || "Unknown Gender",
              birthday: metadata.patientBirthDate || "Unknown Birthday",
              institution: metadata.institutionName || "Unknown Institution",
            };
            studiesMap.set(studyInstanceUID, study);
          }

          study.instances.push({
            sop_instance_uid: sopInstanceUID,
            series_instance_uid: seriesInstanceUID,
            instance_number: Number(instanceNumber) || 0,
            storage_url: `${storageDomain}/${storagePath}`,
          });
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Error desconocido";
        console.error(`Error en archivo ${relativePath}:`, errorMsg);
      } finally {
        processedCount++;
        if (onProgress) {
          onProgress(Math.round((processedCount / totalFiles) * 100));
        }
      }
    });
  });

  // Esperamos a que todas las tareas de R2 terminen
  await Promise.all(tasks);

  // Inserción final en Supabase
  if (studiesMap.size > 0) {
    const upsertPromises = Array.from(studiesMap.values()).map((studyData) => {
      // Ordenamos las instancias por número antes de guardar
      studyData.instances.sort((a, b) => a.instance_number - b.instance_number);

      return supabase.from("dicom").insert(studyData);
    });

    const results = await Promise.all(upsertPromises);

    // Verificamos si hubo errores en la DB
    results.forEach((res) => {
      if (res.error) throw new Error(`Supabase Error: ${res.error.message}`);
    });
  }

  return Array.from(studiesMap.keys());
};
