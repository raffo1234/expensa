import JSZip from "jszip";
import pLimit from "p-limit";
import { supabase } from "@/lib/supabase";
import { fileTypeFromBuffer } from "file-type";
import { Archive } from "libarchive.js";
import uploadDicomProcessor from "./uploadDicomProcessor";
import getAgeFromYYYYMMDD from "./getAgeFromYYYYMMDD";
import { getDICOMMetadata } from "./getDICOMMetadata";
import { CustomFileStateType, CustomFileType, Study } from "@/types/customFileType";
import editCustomFileById from "./editCustomFileById";

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

interface ArchiveFile {
  arrayBuffer: () => Promise<ArrayBuffer>;
}

const DICOM_KNOWN_TAGS = [
  0x00080000, // Group 0008 (Identifying)
  0x00080008, // Image Type
  0x00080016, // SOP Class UID
  0x00080018, // SOP Instance UID
  0x00080020, // Study Date
  0x00080060, // Modality
  0x00100010, // Patient Name
  0x00100020, // Patient ID
  0x0020000d, // Study Instance UID
  0x0020000e, // Series Instance UID
];

const isDicomBinary = (buffer: Uint8Array): boolean => {
  if (buffer.length < 8) return false;

  // ✅ CHECK 1: Standard DICOM Part 10 (magic bytes at offset 128)
  if (buffer.length >= 132) {
    const magic = new TextDecoder().decode(buffer.slice(128, 132));
    if (magic === "DICM") return true;
  }

  // ✅ CHECK 2: Legacy DICOM — starts directly with a known tag (little-endian)
  // Tags are encoded as (gggg,eeee) — group/element as 2-byte LE words
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  const tryLegacyDicom = (littleEndian: boolean): boolean => {
    try {
      const group = view.getUint16(0, littleEndian);
      const element = view.getUint16(2, littleEndian);
      const tag = (group << 16) | element;
      return DICOM_KNOWN_TAGS.includes(tag);
    } catch {
      return false;
    }
  };

  // Try little-endian first (most common), then big-endian
  if (tryLegacyDicom(true)) return true;
  if (tryLegacyDicom(false)) return true;

  // ✅ CHECK 3: Scan first 2KB for DICM magic (some files have non-standard preamble size)
  const scanLimit = Math.min(buffer.length - 4, 2048);
  const dicmBytes = [0x44, 0x49, 0x43, 0x4d]; // "DICM"
  for (let i = 0; i <= scanLimit; i++) {
    if (
      buffer[i] === dicmBytes[0] &&
      buffer[i + 1] === dicmBytes[1] &&
      buffer[i + 2] === dicmBytes[2] &&
      buffer[i + 3] === dicmBytes[3]
    ) {
      return true;
    }
  }

  return false;
};

/**
 * FUNCIÓN AUXILIAR: Subida con Reintentos
 */
const uploadWithRetry = async (fileBlob: Blob, storagePath: string, maxRetries: number = 3) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await uploadDicomProcessor(fileBlob, storagePath, () => {});
      return;
    } catch (err) {
      const isLastAttempt = attempt === maxRetries - 1;
      if (!isLastAttempt) {
        const delay = (attempt + 1) * 1000;
        console.warn(
          `[Retry] Intento ${attempt + 1}/${maxRetries} para ${storagePath}. Reintentando en ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
};

/**
 * PROCESADOR DICOM TURBO
 */
export const processDicomStudyTurbo = async (
  selectedFile: File,
  userId: string,
  fileId: string,
  setFiles: React.Dispatch<React.SetStateAction<CustomFileType[]>>,
  onProgress?: (percent: number) => void,
  onStateChange?: (state: CustomFileStateType) => void,
  isAvailableForR2Upload: boolean = false,
): Promise<string[]> => {
  onStateChange?.(CustomFileStateType.processing);
  onProgress?.(2);

  const studies: Study[] = [];
  const studiesMap = new Map<string, DicomStudy>();
  const limit = pLimit(5);

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

  onStateChange?.(
    isAvailableForR2Upload ? CustomFileStateType.uploading : CustomFileStateType.processing,
  );
  onProgress?.(10);

  const totalFiles = fileBuffers.length;
  let processedCount = 0;

  // --- 2. PROCESAMIENTO PARALELO ---
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

          if (isAvailableForR2Upload && !status.hasInstances) {
            await uploadWithRetry(fileBlob, storagePath, 3);
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
        throw err;
      } finally {
        processedCount++;
        onProgress?.(Math.round((processedCount / totalFiles) * 80) + 10);
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
      let dbId: string | undefined;
      let finalState: CustomFileStateType = CustomFileStateType.inserted;

      try {
        if (!status?.exists) {
          // CASO 1: Es nuevo, insertamos
          if (incomingHasInstances) {
            studyData.instances.sort((a, b) => a.instance_number - b.instance_number);
          }
          const { data, error } = await supabase
            .from("dicom")
            .insert(studyData)
            .select("id")
            .single();

          if (error) throw error;
          dbId = data.id.toString();
        } else if (!status.hasInstances && incomingHasInstances) {
          // CASO 2: Existía el "cascarón" pero no las imágenes, actualizamos
          studyData.instances.sort((a, b) => a.instance_number - b.instance_number);
          const { data, error } = await supabase
            .from("dicom")
            .update({ instances: studyData.instances })
            .eq("study_instance_uid", studyData.study_instance_uid)
            .eq("user_id", userId)
            .select("id")
            .single();

          if (error) throw error;
          dbId = data.id.toString();
        } else {
          // CASO 3: DUPLICADO (Ya existe con instancias)
          const { data, error } = await supabase
            .from("dicom")
            .select("id")
            .eq("study_instance_uid", studyData.study_instance_uid)
            .eq("user_id", userId)
            .single();

          if (error) throw error;

          dbId = data?.id?.toString();
          finalState = CustomFileStateType.duplicated;
        }

        if (dbId) {
          studies.push({
            id: dbId,
            state: finalState,
          });
        }
      } catch (err) {
        console.error(`Error en DB para ${studyData.study_instance_uid}:`, err);
        throw err;
      }
    }

    editCustomFileById(setFiles, fileId, {
      studies: studies,
      state: studies.every((s) => s.state === CustomFileStateType.duplicated)
        ? CustomFileStateType.inserted
        : CustomFileStateType.inserted,
    });
  }

  onProgress?.(100);
  onStateChange?.(CustomFileStateType.inserted);
  return Array.from(studiesMap.keys());
};
