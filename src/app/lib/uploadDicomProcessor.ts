import uploadFileToR2WithAbortSignal from "./uploadFileToR2WithAbortSignal";

// Non-retryable HTTP status codes — no point retrying these
const FATAL_STATUS_CODES = new Set([400, 401, 403, 404, 422]);

export default async function uploadDicomProcessor(
  fileBlob: Blob,
  structuredPath: string,
  onProgress: (progress: number) => void,
  signal?: AbortSignal, // ✅ threaded from uploadWithRetry
): Promise<void> {
  // ── Step 1: Get presigned URL ──────────────────────────────────────────
  const signResponse = await fetch("/api/generate-dicom-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: structuredPath }),
    signal, // ✅ abort if timeout fires
  });

  if (!signResponse.ok) {
    const errorData = await signResponse.json().catch(() => ({}));
    const message = errorData?.error || `Signing API error ${signResponse.status}`;

    // Mark fatal errors so uploadWithRetry won't waste attempts
    const error = new Error(message) as Error & { status?: number };
    error.status = signResponse.status;

    if (FATAL_STATUS_CODES.has(signResponse.status)) {
      error.message = `[FATAL] ${message}`;
    }

    throw error;
  }

  const { signedUrl } = await signResponse.json();

  if (!signedUrl) {
    throw new Error("[FATAL] Server response missing signedUrl");
  }

  // ── Step 2: Upload to R2 ───────────────────────────────────────────────
  const uploadResult = await uploadFileToR2WithAbortSignal(
    signedUrl,
    fileBlob as File,
    onProgress,
    signal, // ✅ pass down so the PUT fetch is also abortable
  );

  if (!uploadResult) {
    // uploadFileToR2 returned falsy — treat as transient failure so retry kicks in
    throw new Error(`Upload to R2 returned no result for ${structuredPath}`);
  }
}
