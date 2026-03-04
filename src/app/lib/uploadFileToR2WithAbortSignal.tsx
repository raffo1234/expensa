const FATAL_XHR_STATUS = new Set([400, 401, 403, 404, 422]);

export default function uploadFileToR2WithAbortSignal(
  url: string,
  file: File,
  onProgress: (progress: number) => void,
  signal?: AbortSignal, // ✅ threaded from uploadDicomProcessor
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", "application/dicom");

    // ✅ Wire AbortSignal → xhr.abort()
    if (signal) {
      if (signal.aborted) {
        reject(new DOMException("Upload aborted before start", "AbortError"));
        return;
      }
      signal.addEventListener("abort", () => {
        xhr.abort();
        reject(new DOMException("Upload aborted by timeout or signal", "AbortError"));
      });
    }

    // ✅ Progress reporting
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    };

    // ✅ Completion
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(true);
        return;
      }

      const message = `R2 upload failed with status ${xhr.status}: ${xhr.statusText}`;
      const error = new Error(
        FATAL_XHR_STATUS.has(xhr.status) ? `[FATAL] ${message}` : message,
      ) as Error & { status?: number };
      error.status = xhr.status;
      reject(error);
    };

    // ✅ Network-level failure (retryable)
    xhr.onerror = () => {
      reject(new Error("Network error during R2 upload"));
    };

    // ✅ Timeout at XHR level as a safety net (60s for large DICOM files)
    xhr.timeout = 60_000;
    xhr.ontimeout = () => {
      reject(new Error("R2 upload timed out after 60s"));
    };

    xhr.send(file);
  });
}
