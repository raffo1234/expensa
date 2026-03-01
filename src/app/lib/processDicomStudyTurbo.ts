import JSZip from "jszip";
import pLimit from "p-limit";
import { supabase } from "@/lib/supabase";
import { fileTypeFromBuffer } from "file-type";
import uploadDicomProcessor from "./uploadDicomProcessor";
import getAgeFromYYYYMMDD from "./getAgeFromYYYYMMDD";
import { getDICOMMetadata } from "./getDICOMMetadata";
import { Archive } from "libarchive.js";

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

const isDicomBinary = (buffer: Uint8Array): boolean => {
  if (buffer.length < 132) return false;
  return new TextDecoder().decode(buffer.slice(128, 132)) === "DICM";
};

export const processDicomStudyTurbo = async (
  selectedFile: File,
  userId: string,
  onProgress?: (percent: number) => void,
): Promise<string[]> => {
  const studiesMap = new Map<string, DicomStudy>();
  const limit = pLimit(15);
  const storageDomain = (process.env.NEXT_PUBLIC_STORAGE_DOMAIN || "").replace(/\/$/, "");

  // Mapa temporal para buffers
  const fileBuffers: { name: string; buffer: Uint8Array }[] = [];

  // --- EXTRACTOR LOGIC ---
  const mime = selectedFile.type || "";
  const ext = selectedFile.name.split(".").pop()?.toLowerCase();

  interface ArchiveFile {
    arrayBuffer: () => Promise<ArrayBuffer>;
    name: string;
    size: number;
  }

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

        if (buffer.length > 0) {
          fileBuffers.push({ name: path, buffer });
        }
      }
    }
  }

  const totalFiles = fileBuffers.length;
  let processedCount = 0;

  // --- PROCESSOR LOGIC ---
  const tasks = fileBuffers.map(({ name, buffer }) => {
    return limit(async () => {
      try {
        if (buffer.length === 0) return;

        const typeInfo = await fileTypeFromBuffer(buffer);
        if (!isDicomBinary(buffer) && typeInfo?.ext !== "dcm") return;

        const fileBlob = new Blob([buffer as unknown as BlobPart], { type: "application/dicom" });
        const metadata = await getDICOMMetadata(fileBlob);

        if (metadata?.studyInstanceUID) {
          const storagePath = `dicom/${metadata.studyInstanceUID}/${metadata.seriesInstanceUID}/${metadata.sopInstanceUID}.dcm`;

          // Upload concurrente
          await uploadDicomProcessor(fileBlob, storagePath, () => {});

          let study = studiesMap.get(metadata.studyInstanceUID);
          if (!study) {
            const finalAge =
              metadata.patientAge || getAgeFromYYYYMMDD(metadata.patientBirthDate || "");
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
      } catch (err) {
        console.error(`Error en ${name}:`, err);
      } finally {
        processedCount++;
        onProgress?.(Math.round((processedCount / totalFiles) * 100));
      }
    });
  });

  await Promise.all(tasks);

  // --- FINAL DATABASE INSERT ---
  if (studiesMap.size > 0) {
    const studyEntries = Array.from(studiesMap.values());
    for (const studyData of studyEntries) {
      // Check exists
      const { data: exists } = await supabase
        .from("dicom")
        .select("study_instance_uid")
        .eq("study_instance_uid", studyData.study_instance_uid)
        .maybeSingle();

      if (!exists) {
        studyData.instances.sort((a, b) => a.instance_number - b.instance_number);
        const { error: insertError } = await supabase.from("dicom").insert(studyData);
        if (insertError) throw new Error(`Supabase Insert Error: ${insertError.message}`);
      }
    }
  }

  return Array.from(studiesMap.keys());
};
