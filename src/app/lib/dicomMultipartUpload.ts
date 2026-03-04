/**
 * dicomMultipartUpload.ts
 * Resumable multipart upload for Cloudflare R2.
 * Only failed chunks retry — not the whole file.
 * Falls back to single PUT for files under threshold.
 */

const CHUNK_SIZE = 5 * 1024 * 1024;   // 5MB — R2 minimum part size
const MULTIPART_THRESHOLD = 10 * 1024 * 1024; // Use multipart only above 10MB
const MAX_PART_RETRIES = 3;

interface MultipartInitResponse {
  uploadId: string;
}

interface UploadedPart {
  partNumber: number;
  etag: string;
}

// --- SINGLE PUT (small files) ---
const uploadSinglePut = async (
  fileBlob: Blob,
  storagePath: string,
  signal?: AbortSignal,
): Promise<void> => {
  const signRes = await fetch("/api/generate-dicom-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: storagePath }),
    signal,
  });

  if (!signRes.ok) {
    const err = await signRes.json().catch(() => ({}));
    throw new Error(`[FATAL] Presign failed ${signRes.status}: ${err?.error || signRes.statusText}`);
  }

  const { signedUrl } = await signRes.json();
  if (!signedUrl) throw new Error("[FATAL] Missing signedUrl in presign response");

  const putRes = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/dicom" },
    body: fileBlob,
    signal,
  });

  if (!putRes.ok) {
    throw new Error(`R2 PUT failed ${putRes.status}: ${putRes.statusText}`);
  }
};

// --- MULTIPART: INIT ---
const initMultipartUpload = async (storagePath: string): Promise<string> => {
  const res = await fetch("/api/dicom-multipart-create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: storagePath }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`[FATAL] Multipart init failed ${res.status}: ${err?.error || res.statusText}`);
  }

  const { uploadId }: MultipartInitResponse = await res.json();
  if (!uploadId) throw new Error("[FATAL] Missing uploadId in multipart init response");
  return uploadId;
};

// --- MULTIPART: UPLOAD ONE PART WITH RETRY ---
const uploadPartWithRetry = async (
  chunk: Blob,
  storagePath: string,
  uploadId: string,
  partNumber: number,
  signal?: AbortSignal,
): Promise<UploadedPart> => {
  let lastErr: unknown;

  for (let attempt = 0; attempt < MAX_PART_RETRIES; attempt++) {
    try {
      // Get presigned URL for this specific part
      const signRes = await fetch("/api/dicom-multipart-part-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: storagePath, uploadId, partNumber }),
        signal,
      });

      if (!signRes.ok) {
        const err = await signRes.json().catch(() => ({}));
        throw new Error(
          `[FATAL] Part presign failed ${signRes.status}: ${err?.error || signRes.statusText}`,
        );
      }

      const { signedUrl } = await signRes.json();

      const putRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: chunk,
        signal,
      });

      if (!putRes.ok) {
        throw new Error(`Part ${partNumber} PUT failed ${putRes.status}`);
      }

      const etag = putRes.headers.get("ETag") || putRes.headers.get("etag") || "";
      return { partNumber, etag };
    } catch (err) {
      lastErr = err;
      const isLast = attempt === MAX_PART_RETRIES - 1;
      if (!isLast) {
        const delay = 1000 * Math.pow(2, attempt);
        console.warn(`[Multipart] Part ${partNumber} attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastErr;
};

// --- MULTIPART: COMPLETE ---
const completeMultipartUpload = async (
  storagePath: string,
  uploadId: string,
  parts: UploadedPart[],
): Promise<void> => {
  const res = await fetch("/api/dicom-multipart-complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: storagePath, uploadId, parts }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `[FATAL] Multipart complete failed ${res.status}: ${err?.error || res.statusText}`,
    );
  }
};

// --- MULTIPART: ABORT (cleanup on failure) ---
const abortMultipartUpload = async (
  storagePath: string,
  uploadId: string,
): Promise<void> => {
  try {
    await fetch("/api/dicom-multipart-abort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: storagePath, uploadId }),
    });
  } catch (err) {
    console.warn(`[Multipart] Failed to abort upload ${uploadId}:`, err);
  }
};

// --- PUBLIC: SMART UPLOAD (auto-selects single PUT vs multipart) ---
export const uploadDicomFile = async (
  fileBlob: Blob,
  storagePath: string,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<void> => {
  // Small files: single PUT is faster and simpler
  if (fileBlob.size < MULTIPART_THRESHOLD) {
    onProgress?.(0);
    await uploadSinglePut(fileBlob, storagePath, signal);
    onProgress?.(100);
    return;
  }

  // Large files: multipart
  const totalParts = Math.ceil(fileBlob.size / CHUNK_SIZE);
  const uploadId = await initMultipartUpload(storagePath);
  const parts: UploadedPart[] = [];

  try {
    for (let i = 0; i < totalParts; i++) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileBlob.size);
      const chunk = fileBlob.slice(start, end);

      const part = await uploadPartWithRetry(chunk, storagePath, uploadId, i + 1, signal);
      parts.push(part);

      onProgress?.(Math.round(((i + 1) / totalParts) * 95)); // reserve 5% for complete
    }

    await completeMultipartUpload(storagePath, uploadId, parts);
    onProgress?.(100);
  } catch (err) {
    // Clean up the incomplete multipart upload on R2
    await abortMultipartUpload(storagePath, uploadId);
    throw err;
  }
};
