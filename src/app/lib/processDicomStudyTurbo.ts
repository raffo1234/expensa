import JSZip from "jszip";
import pLimit from "p-limit";
import { supabase } from "@/lib/supabase";
import { fileTypeFromBuffer } from "file-type";
import { Archive } from "libarchive.js";
import uploadDicomProcessor from "./uploadDicomProcessor";
import getAgeFromYYYYMMDD from "./getAgeFromYYYYMMDD";
import { getDICOMMetadata } from "./getDICOMMetadata";
import { CustomFileStateType } from "@/types/customFileType";

// --- INTERFACES ---
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
  slice_thickness?: number;
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
  slice_thickness?: number;
  study_date: string;
  gender: string;
  birthday: string;
  institution: string;
  instances: DicomInstance[];

  created_at: string;
}

interface ArchiveFile {
  arrayBuffer: () => Promise<ArrayBuffer>;
}

const isDicomBinary = (buffer: Uint8Array): boolean => {
  if (buffer.length < 132) return false;
  return new TextDecoder().decode(buffer.slice(128, 132)) === "DICM";
};

/**
 * PROCESADOR DICOM TURBO - ESTRATEGIA DE AISLAMIENTO TOTAL
 * Cada usuario tiene su propia copia física en R2 y su propia fila en Supabase.
 */
export const processDicomStudyTurbo = async (
  selectedFile: File,
  userId: string,
  onProgress?: (percent: number) => void, // 3er parámetro
  onStateChange?: (state: CustomFileStateType) => void, // 4to parámetro
  isAvailableForR2Upload: boolean = false, // 5to parámetro (opcional al final)
): Promise<string[]> => {
  // --- INICIO ---
  onStateChange?.(CustomFileStateType.processing);
  onProgress?.(2); // Feedback inmediato de que algo empezó

  const studiesMap = new Map<string, DicomStudy>();
  const limit = pLimit(15);
  const storageDomain = (process.env.NEXT_PUBLIC_STORAGE_DOMAIN || "").replace(/\/$/, "");
  const userStudyStatusCache = new Map<string, { exists: boolean; hasInstances: boolean }>();
  const fileBuffers: { name: string; buffer: Uint8Array }[] = [];

  // --- 1. EXTRACCIÓN ---
  const mime = selectedFile.type || "";
  const ext = selectedFile.name.split(".").pop()?.toLowerCase();

  if (mime === "application/dicom" || ext === "dcm") {
    fileBuffers.push({
      name: selectedFile.name,
      buffer: new Uint8Array(await selectedFile.arrayBuffer()),
    });
  } else if (mime.includes("zip") || ext === "zip") {
    const zip = await new JSZip().loadAsync(selectedFile);
    for (const [path, file] of Object.entries(zip.files)) {
      if (!file.dir && !path.includes("__MACOSX") && !path.toLowerCase().includes("dicomdir")) {
        fileBuffers.push({ name: path, buffer: await file.async("uint8array") });
      }
    }
  } else if (mime.includes("rar") || ext === "rar") {
    const archive = await Archive.open(selectedFile);
    const files = (await archive.extractFiles()) as Record<string, ArchiveFile>;
    for (const [path, fileContent] of Object.entries(files)) {
      if (!path.includes("__MACOSX") && !path.toLowerCase().includes("dicomdir")) {
        const buffer = new Uint8Array(await fileContent.arrayBuffer());
        if (buffer.length > 0) fileBuffers.push({ name: path, buffer });
      }
    }
  }

  // Cambio de estado tras extracción
  onStateChange?.(
    isAvailableForR2Upload ? CustomFileStateType.uploading : CustomFileStateType.processing,
  );
  onProgress?.(10);

  const totalFiles = fileBuffers.length;
  let processedCount = 0;

  // --- 2. PROCESAMIENTO PARALELO CON PROGRESO REAL ---
  const tasks = fileBuffers.map(({ name, buffer }) => {
    return limit(async () => {
      try {
        if (buffer.length === 0) return;
        const typeInfo = await fileTypeFromBuffer(buffer);
        if (!isDicomBinary(buffer) && typeInfo?.ext !== "dcm") return;

        const fileBlob = new Blob([buffer as unknown as BlobPart], { type: "application/dicom" });
        const metadata = await getDICOMMetadata(fileBlob);

        if (metadata?.studyInstanceUID) {
          const sUID = metadata.studyInstanceUID;

          if (!userStudyStatusCache.has(sUID)) {
            const { data } = await supabase
              .from("dicom")
              .select("instances")
              .eq("study_instance_uid", sUID)
              .eq("user_id", userId)
              .maybeSingle();

            userStudyStatusCache.set(sUID, {
              exists: !!data,
              hasInstances: !!(data?.instances && data.instances.length > 0),
            });
          }

          const status = userStudyStatusCache.get(sUID)!;
          const storagePath = `dicom/${userId}/${sUID}/${metadata.seriesInstanceUID}/${metadata.sopInstanceUID}.dcm`;
          const shouldUpload = isAvailableForR2Upload && !status.hasInstances;

          if (shouldUpload) {
            await uploadDicomProcessor(fileBlob, storagePath, () => {});
          }

          let study = studiesMap.get(sUID);
          if (!study) {
            const finalAge =
              metadata.patientAge || getAgeFromYYYYMMDD(metadata.patientBirthDate || "");
            study = {
              study_instance_uid: sUID,
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
            studiesMap.set(sUID, study);
          }

          if (isAvailableForR2Upload) {
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
              slice_thickness: metadata.sliceThickness,
              pixel_spacing: metadata.pixelSpacing,
              image_orientation: metadata.imageOrientation,
              image_position: metadata.imagePosition,
              window_center: metadata.windowCenter,
              window_width: metadata.windowWidth,
              rescale_intercept: metadata.rescaleIntercept,
              rescale_slope: metadata.rescaleSlope,
            });
          }
        }
      } catch (err) {
        console.error(`Error procesando ${name}:`, err);
      } finally {
        processedCount++;
        // Calculamos el progreso para que llegue máximo al 90% antes de DB
        const progress = Math.round((processedCount / totalFiles) * 80) + 10;
        onProgress?.(progress);

        // PEQUEÑO TRUCO: Si procesamos muy rápido, permitimos que el loop de React respire
        if (processedCount % 5 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    });
  });

  await Promise.all(tasks);

  // --- 3. PERSISTENCIA EN SUPABASE ---
  if (studiesMap.size > 0) {
    onStateChange?.(CustomFileStateType.inserting);
    onProgress?.(95);

    for (const studyData of studiesMap.values()) {
      const status = userStudyStatusCache.get(studyData.study_instance_uid);
      const incomingHasInstances = studyData.instances.length > 0;

      if (!status?.exists) {
        if (incomingHasInstances) {
          studyData.instances.sort((a, b) => a.instance_number - b.instance_number);
        }
        const { error } = await supabase.from("dicom").insert(studyData);
        if (error) throw new Error(`Insert Error: ${error.message}`);
      } else if (!status.hasInstances && incomingHasInstances) {
        studyData.instances.sort((a, b) => a.instance_number - b.instance_number);
        const { error } = await supabase
          .from("dicom")
          .update({ instances: studyData.instances })
          .eq("study_instance_uid", studyData.study_instance_uid)
          .eq("user_id", userId);

        if (error) throw new Error(`Update Error: ${error.message}`);
      }
    }
  }

  onProgress?.(100);
  onStateChange?.(CustomFileStateType.inserted);
  return Array.from(studiesMap.keys());
};