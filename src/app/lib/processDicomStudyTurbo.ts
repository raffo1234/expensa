import JSZip from "jszip";
import pLimit from "p-limit";
import { supabase } from "@/lib/supabase";
import { fileTypeFromBuffer } from "file-type";
import { Archive } from "libarchive.js";
import getAgeFromYYYYMMDD from "./getAgeFromYYYYMMDD";
import { getDICOMMetadata } from "./getDICOMMetadata";
import { CustomFileStateType, CustomFileType, Study } from "@/types/customFileType";
import editCustomFileById from "./editCustomFileById";
import { uploadDicomFile } from "./dicomMultipartUpload";
import { enqueueUpload, removeQueueItem, updateQueueItem } from "./dicomUploadQueue";
import {
  verifyUploadedFile,
  validateDicomIntegrity,
  sendToDeadLetterQueue,
} from "./dicomUploadVerifier";

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
  rescale_type?: string;
  samples_per_pixel?: number;
  photometric_interpretation?: string;
  number_of_frames?: number;
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

// --- DICOM DETECTION ---
const DICOM_KNOWN_TAGS = [
  0x00080000, 0x00080008, 0x00080016, 0x00080018, 0x00080020, 0x00080060, 0x00100010, 0x00100020,
  0x0020000d, 0x0020000e,
];

const isDicomBinary = (buffer: Uint8Array): boolean => {
  if (buffer.length < 8) return false;
  if (buffer.length >= 132) {
    if (new TextDecoder().decode(buffer.slice(128, 132)) === "DICM") return true;
  }
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const tryLegacy = (le: boolean): boolean => {
    try {
      const tag = (view.getUint16(0, le) << 16) | view.getUint16(2, le);
      return DICOM_KNOWN_TAGS.includes(tag);
    } catch {
      return false;
    }
  };
  if (tryLegacy(true) || tryLegacy(false)) return true;
  const scanLimit = Math.min(buffer.length - 4, 2048);
  const d = [0x44, 0x49, 0x43, 0x4d];
  for (let i = 0; i <= scanLimit; i++) {
    if (
      buffer[i] === d[0] &&
      buffer[i + 1] === d[1] &&
      buffer[i + 2] === d[2] &&
      buffer[i + 3] === d[3]
    ) {
      return true;
    }
  }
  return false;
};

// --- RETRY LOGIC ---
const RETRYABLE_MESSAGES = [
  "fetch failed",
  "network",
  "timeout",
  "econnreset",
  "econnrefused",
  "socket",
  "503",
  "502",
  "429",
  "rate limit",
];

const isRetryableError = (err: unknown): boolean => {
  if (!(err instanceof Error)) return true;
  const msg = err.message.toLowerCase();
  return RETRYABLE_MESSAGES.some((k) => msg.includes(k));
};

// --- RESILIENT UPLOAD ---
// Returns true = uploaded successfully, false = queued for SW background retry
const resilientUpload = async (
  fileBlob: Blob,
  storagePath: string,
  userId: string,
  studyInstanceUID: string,
  maxRetries: number = 5,
  timeoutMs: number = 60_000,
): Promise<boolean> => {
  // Enqueue FIRST — survives tab close from this point on
  await enqueueUpload({
    id: storagePath,
    storagePath,
    userId,
    studyInstanceUID,
    blob: fileBlob,
  });

  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      await uploadDicomFile(fileBlob, storagePath, undefined, controller.signal);

      // Small delay for R2 eventual consistency
      await new Promise((r) => setTimeout(r, 800));

      const verified = await verifyUploadedFile(storagePath);
      if (!verified) {
        throw new Error("File not found in R2 after upload");
      }

      // ✅ Confirmed — remove from queue
      await removeQueueItem(storagePath);
      return true;
    } catch (err) {
      lastError = err;

      if (!isRetryableError(err)) {
        console.error(`[Upload] Fatal error for ${storagePath}:`, err);
        break;
      }

      const isLast = attempt === maxRetries - 1;
      if (!isLast) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 15_000) + Math.random() * 500;
        console.warn(
          `[Retry] Attempt ${attempt + 1}/${maxRetries} for ${storagePath}. Retrying in ${Math.round(delay)}ms...`,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // All retries exhausted — update queue item attempts count
  await updateQueueItem(storagePath, {
    status: "pending", // keep as pending so SW can retry
    attempts: maxRetries,
    failedReason: lastError instanceof Error ? lastError.message : String(lastError),
  });

  // Log to dead letter for visibility
  await sendToDeadLetterQueue({
    user_id: userId,
    storage_path: storagePath,
    study_instance_uid: studyInstanceUID,
    error_message: lastError instanceof Error ? lastError.message : String(lastError),
    attempts: maxRetries,
  });

  console.warn(
    `[Upload] All ${maxRetries} attempts failed for ${storagePath}. SW will retry in background.`,
  );
  return false; // not fatal — SW will retry
};

// --- SERVER-SIDE FALLBACK ---
const uploadViaServer = async (fileBlob: Blob, storagePath: string): Promise<void> => {
  const formData = new FormData();
  formData.append("file", fileBlob);
  formData.append("path", storagePath);
  const res = await fetch("/api/dicom-server-upload", { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Server upload failed ${res.status}: ${err?.error || res.statusText}`);
  }
};

// --- STUDY STATUS CACHE WITH LOCK ---
type StudyStatus = { exists: boolean; hasInstances: boolean };

const buildStudyStatusResolver = (userId: string) => {
  const cache = new Map<string, StudyStatus>();
  const locks = new Map<string, Promise<void>>();

  return async (sUID: string): Promise<StudyStatus> => {
    if (cache.has(sUID)) return cache.get(sUID)!;
    if (!locks.has(sUID)) {
      locks.set(
        sUID,
        (async () => {
          if (cache.has(sUID)) return;
          const { data } = await supabase
            .from("dicom")
            .select("instances")
            .eq("study_instance_uid", sUID)
            .eq("user_id", userId)
            .maybeSingle();
          cache.set(sUID, {
            exists: !!data,
            hasInstances: !!(data?.instances && data.instances.length > 0),
          });
        })(),
      );
    }
    await locks.get(sUID);
    return cache.get(sUID)!;
  };
};

const BATCH_SIZE = 50;

// --- MAIN PROCESSOR ---
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
  const limit = pLimit(3);
  const storageDomain = (process.env.NEXT_PUBLIC_STORAGE_DOMAIN || "").replace(/\/$/, "");
  const getStudyStatus = buildStudyStatusResolver(userId);
  const fileBuffers: { name: string; buffer: Uint8Array }[] = [];

  // --- 1. EXTRACTION ---
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

  // --- 2. BATCHED PARALLEL PROCESSING ---
  for (let batchStart = 0; batchStart < fileBuffers.length; batchStart += BATCH_SIZE) {
    const batch = fileBuffers.slice(batchStart, batchStart + BATCH_SIZE);

    const tasks = batch.map(({ name, buffer }) =>
      limit(async () => {
        try {
          if (buffer.length === 0) return;
          const typeInfo = await fileTypeFromBuffer(buffer);
          if (!isDicomBinary(buffer) && typeInfo?.ext !== "dcm") return;

          const fileBlob = new Blob([buffer as unknown as BlobPart], { type: "application/dicom" });
          const metadata = await getDICOMMetadata(fileBlob);
          if (!metadata?.studyInstanceUID) return;

          const { valid, reason } = await validateDicomIntegrity(fileBlob, metadata);
          if (!valid) {
            console.warn(`[processDicom] Skipping invalid DICOM ${name}: ${reason}`);
            return;
          }

          const sUID = metadata.studyInstanceUID;
          const status = await getStudyStatus(sUID);
          const storagePath = `dicom/${userId}/${sUID}/${metadata.seriesInstanceUID}/${metadata.sopInstanceUID}.dcm`;

          // Track whether this file was confirmed in R2
          let uploadConfirmed = !isAvailableForR2Upload; // if no upload needed, treat as confirmed

          if (isAvailableForR2Upload && !status.hasInstances) {
            const uploaded = await resilientUpload(fileBlob, storagePath, userId, sUID, 5, 60_000);

            if (uploaded) {
              uploadConfirmed = true;
            } else {
              // Primary failed — try server-side fallback immediately
              try {
                console.warn(`[processDicom] Trying server-side fallback for ${storagePath}...`);
                await uploadViaServer(fileBlob, storagePath);
                await removeQueueItem(storagePath);
                uploadConfirmed = true;
              } catch (fallbackErr) {
                // Both failed — item stays in IndexedDB for SW retry
                // Do NOT push instance with a broken storage_url
                console.error(
                  `[processDicom] Server fallback also failed for ${name}:`,
                  fallbackErr,
                );
                uploadConfirmed = false;
              }
            }
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

          // ✅ Only push instance if file confirmed in R2
          if (uploadConfirmed) {
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
              rescale_type: metadata.rescaleType,
              samples_per_pixel: metadata.samplesPerPixel,
              photometric_interpretation: metadata.photometricInterpretation,
              number_of_frames: metadata.numberOfFrames,
            });
          }
        } catch (err) {
          console.error(`[processDicom] Error processing ${name}:`, err);
        } finally {
          processedCount++;
          onProgress?.(Math.round((processedCount / totalFiles) * 80) + 10);
        }
      }),
    );

    await Promise.allSettled(tasks);
  }

  // --- 3. SUPABASE PERSISTENCE ---
  if (studiesMap.size > 0) {
    onStateChange?.(CustomFileStateType.inserting);
    onProgress?.(95);

    for (const studyData of studiesMap.values()) {
      const status = await getStudyStatus(studyData.study_instance_uid);
      const incomingHasInstances = studyData.instances.length > 0;
      let dbId: string | undefined;
      let finalState: CustomFileStateType = CustomFileStateType.inserted;

      try {
        if (!status?.exists) {
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

        if (dbId) studies.push({ id: dbId, state: finalState });
      } catch (err) {
        console.error(`[processDicom] DB error for ${studyData.study_instance_uid}:`, err);
        throw err;
      }
    }

    editCustomFileById(setFiles, fileId, {
      studies,
      state: CustomFileStateType.inserted,
    });
  }

  onProgress?.(100);
  onStateChange?.(CustomFileStateType.inserted);
  return Array.from(studiesMap.keys());
};
