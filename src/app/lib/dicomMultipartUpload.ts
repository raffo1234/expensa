/**
 * dicomMultipartUpload.ts
 * Resumable multipart upload for Cloudflare R2.
 * FIX: batchPresignUrls() replaces per-file presign round trips.
 * For 400 files: 400 round trips → 8 batch calls.
 */

import pLimit from "p-limit";

const CHUNK_SIZE = 16 * 1024 * 1024;
const MULTIPART_THRESHOLD = 16 * 1024 * 1024;
const MAX_PART_RETRIES = 3;
const PRESIGN_BATCH_SIZE = 50;

interface MultipartInitResponse {
  uploadId: string;
}

interface UploadedPart {
  partNumber: number;
  etag: string;
}

// --- BATCH PRESIGN ---
// Call once before uploading — fetches all signed URLs in batches of 50
export const batchPresignUrls = async (storagePaths: string[]): Promise<Map<string, string>> => {
  const urlMap = new Map<string, string>();
  const batches: string[][] = [];

  for (let i = 0; i < storagePaths.length; i += PRESIGN_BATCH_SIZE) {
    batches.push(storagePaths.slice(i, i + PRESIGN_BATCH_SIZE));
  }

  // All batches fire in parallel
  await Promise.all(
    batches.map(async (batch) => {
      const res = await fetch("/api/generate-dicom-urls-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filenames: batch }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Batch presign failed ${res.status}: ${err?.error || res.statusText}`);
      }

      const { urls }: { urls: Record<string, string> } = await res.json();
      for (const [path, url] of Object.entries(urls)) {
        urlMap.set(path, url);
      }
    }),
  );

  return urlMap;
};

// --- SINGLE PUT ---
// signedUrl passed in — no presign round trip inside
const uploadSinglePut = async (
  fileBlob: Blob,
  signedUrl: string,
  signal?: AbortSignal,
): Promise<void> => {
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

      if (!putRes.ok) throw new Error(`Part ${partNumber} PUT failed ${putRes.status}`);

      const etag = putRes.headers.get("ETag") || putRes.headers.get("etag") || "";
      return { partNumber, etag };
    } catch (err) {
      lastErr = err;
      const isLast = attempt === MAX_PART_RETRIES - 1;
      if (!isLast) {
        const delay = 1000 * Math.pow(2, attempt);
        console.warn(
          `[Multipart] Part ${partNumber} attempt ${attempt + 1} failed. Retrying in ${delay}ms...`,
        );
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

// --- MULTIPART: ABORT ---
const abortMultipartUpload = async (storagePath: string, uploadId: string): Promise<void> => {
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

// --- PUBLIC: SMART UPLOAD ---
// signedUrl must be pre-fetched via batchPresignUrls() before calling
export const uploadDicomFile = async (
  fileBlob: Blob,
  storagePath: string,
  signedUrl: string,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<void> => {
  if (fileBlob.size < MULTIPART_THRESHOLD) {
    onProgress?.(0);
    await uploadSinglePut(fileBlob, signedUrl, signal);
    onProgress?.(100);
    return;
  }

  // Large files: multipart
  const totalParts = Math.ceil(fileBlob.size / CHUNK_SIZE);
  const uploadId = await initMultipartUpload(storagePath);

  try {
    const partLimit = pLimit(4);
    let completedParts = 0;

    const partPromises = Array.from({ length: totalParts }, (_, i) => {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileBlob.size);
      const chunk = fileBlob.slice(start, end);

      return partLimit(async () => {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        const part = await uploadPartWithRetry(chunk, storagePath, uploadId, i + 1, signal);
        completedParts++;
        onProgress?.(Math.round((completedParts / totalParts) * 95));
        return part;
      });
    });

    const parts = await Promise.all(partPromises);
    parts.sort((a, b) => a.partNumber - b.partNumber);

    await completeMultipartUpload(storagePath, uploadId, parts);
    onProgress?.(100);
  } catch (err) {
    await abortMultipartUpload(storagePath, uploadId);
    throw err;
  }
};
