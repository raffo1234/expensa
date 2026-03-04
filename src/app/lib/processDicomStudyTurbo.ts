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
import isDicomBinary from "./isDicomBinary";

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
  return RETRYABLE_MESSAGES.some((keyword) => msg.includes(keyword));
};

const uploadWithRetry = async (
  fileBlob: Blob,
  storagePath: string,
  maxRetries: number = 5,
  timeoutMs: number = 30_000,
): Promise<void> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      await uploadDicomProcessor(fileBlob, storagePath, () => {}, controller.signal);
      return; // ✅ success
    } catch (err) {
      lastError = err;

      const isLast = attempt === maxRetries - 1;

      if (!isRetryableError(err)) {
        console.error(`[Upload] Fatal error for ${storagePath}, aborting retries:`, err);
        throw err;
      }

      if (!isLast) {
        const baseDelay = Math.min(1000 * Math.pow(2, attempt), 15_000);
        const jitter = Math.random() * 500;
        const delay = baseDelay + jitter;
        console.warn(
          `[Retry] Attempt ${attempt + 1}/${maxRetries} failed for ${storagePath}. ` +
            `Retrying in ${Math.round(delay)}ms...`,
          err,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  console.error(`[Upload] All ${maxRetries} attempts failed for ${storagePath}`, lastError);
  throw lastError;
};

// --- STUDY STATUS CACHE WITH LOCK (fixes race condition) ---
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
          // Double-check after acquiring lock
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

// --- BATCH PROCESSING (avoids memory crash on large studies) ---
const BATCH_SIZE = 50;

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
  const limit = pLimit(3); // safe concurrency for R2

  const storageDomain = (process.env.NEXT_PUBLIC_STORAGE_DOMAIN || "").replace(/\/$/, "");
  const getStudyStatus = buildStudyStatusResolver(userId); // ✅ locked cache
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
  let failedCount = 0;

  // --- 2. BATCHED PARALLEL PROCESSING (✅ avoids RAM crash on large studies) ---
  for (let batchStart = 0; batchStart < fileBuffers.length; batchStart += BATCH_SIZE) {
    const batch = fileBuffers.slice(batchStart, batchStart + BATCH_SIZE);

    const tasks = batch.map(({ name, buffer }) =>
      limit(async () => {
        try {
          if (buffer.length === 0) return;
          const typeInfo = await fileTypeFromBuffer(buffer);
          if (!isDicomBinary(buffer) && typeInfo?.ext !== "dcm") return;

          const fileBlob = new Blob([buffer as unknown as BlobPart], {
            type: "application/dicom",
          });
          const metadata = await getDICOMMetadata(fileBlob);

          if (metadata?.studyInstanceUID) {
            const sUID = metadata.studyInstanceUID;

            // ✅ Race-condition-safe status check
            const status = await getStudyStatus(sUID);
            const storagePath = `dicom/${userId}/${sUID}/${metadata.seriesInstanceUID}/${metadata.sopInstanceUID}.dcm`;

            if (isAvailableForR2Upload && !status.hasInstances) {
              await uploadWithRetry(fileBlob, storagePath, 5);
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
          // ✅ Log but don't kill the whole batch (Promise.allSettled behaviour)
          failedCount++;
          console.error(`[processDicom] Error procesando ${name}:`, err);
        } finally {
          processedCount++;
          onProgress?.(Math.round((processedCount / totalFiles) * 80) + 10);
        }
      }),
    );

    // ✅ Promise.allSettled — one failure won't abort the rest
    const results = await Promise.allSettled(tasks);
    const batchFailed = results.filter((r) => r.status === "rejected");
    if (batchFailed.length > 0) {
      console.warn(
        `[processDicom] Batch ${Math.floor(batchStart / BATCH_SIZE) + 1}: ` +
          `${batchFailed.length} tasks rejected`,
      );
    }
  }

  if (failedCount > 0) {
    console.warn(`[processDicom] Total failed files: ${failedCount}/${totalFiles}`);
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
          // CASE 1: New study — insert
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
          // CASE 2: Shell existed, no images yet — update
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
          // CASE 3: Duplicate — already exists with instances
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
          studies.push({ id: dbId, state: finalState });
        }
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
