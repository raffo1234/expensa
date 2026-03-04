/**
 * dicomUploadVerifier.ts
 * Verifies uploaded files actually exist in R2 with correct size.
 * Also handles the dead letter queue for permanently failed uploads.
 */

import { supabase } from "@/lib/supabase";

interface VerifyResult {
  exists: boolean;
  size?: number;
}

// --- R2 VERIFICATION ---
export const verifyUploadedFile = async (storagePath: string): Promise<boolean> => {
  try {
    const res = await fetch(
      `/api/dicom-verify?path=${encodeURIComponent(storagePath)}`,
      { method: "GET" },
    );

    if (!res.ok) return false;

    const result: VerifyResult = await res.json();
    return result.exists && (result.size ?? 0) > 0;
  } catch (err) {
    console.warn(`[Verify] Could not verify ${storagePath}:`, err);
    return false; // treat as unverified, not fatal
  }
};

// --- DICOM INTEGRITY VALIDATION ---
export const validateDicomIntegrity = async (
  fileBlob: Blob,
  metadata: {
    studyInstanceUID?: string;
    seriesInstanceUID?: string;
    sopInstanceUID?: string;
    rows?: number;
    columns?: number;
  },
): Promise<{ valid: boolean; reason?: string }> => {
  if (!metadata.studyInstanceUID) {
    return { valid: false, reason: "Missing studyInstanceUID" };
  }
  if (!metadata.seriesInstanceUID) {
    return { valid: false, reason: "Missing seriesInstanceUID" };
  }
  if (!metadata.sopInstanceUID) {
    return { valid: false, reason: "Missing sopInstanceUID" };
  }
  if (!metadata.rows || metadata.rows <= 0) {
    return { valid: false, reason: "Invalid rows value" };
  }
  if (!metadata.columns || metadata.columns <= 0) {
    return { valid: false, reason: "Invalid columns value" };
  }
  if (fileBlob.size < 256) {
    return { valid: false, reason: "File too small to be valid DICOM" };
  }

  return { valid: true };
};

// --- DEAD LETTER QUEUE ---
export interface DeadLetterEntry {
  user_id: string;
  storage_path: string;
  study_instance_uid: string;
  failed_at: string;
  error_message: string;
  attempts: number;
  resolved: boolean;
}

export const sendToDeadLetterQueue = async (
  entry: Omit<DeadLetterEntry, "failed_at" | "resolved">,
): Promise<void> => {
  try {
    const { error } = await supabase.from("dicom_upload_failures").insert({
      ...entry,
      failed_at: new Date().toISOString(),
      resolved: false,
    });

    if (error) {
      console.error("[DeadLetter] Failed to write to dead letter queue:", error);
    } else {
      console.warn(
        `[DeadLetter] Logged permanent failure for ${entry.storage_path}`,
      );
    }
  } catch (err) {
    // Dead letter queue failure should never crash the upload flow
    console.error("[DeadLetter] Unexpected error:", err);
  }
};

export const resolveDeadLetterEntry = async (storagePath: string): Promise<void> => {
  await supabase
    .from("dicom_upload_failures")
    .update({ resolved: true })
    .eq("storage_path", storagePath);
};
