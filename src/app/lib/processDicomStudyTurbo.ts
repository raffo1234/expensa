import { supabase } from "@/lib/supabase";
import { CustomFileStateType, CustomFileType } from "@/types/customFileType";

// lib/processDicomStudyTurbo.ts
export const processDicomStudyTurbo = async (
  selectedFile: File,
  userId: string,
  fileId: string,
  _setFiles: React.Dispatch<React.SetStateAction<CustomFileType[]>>,
  onProgress?: (percent: number) => void,
  onStateChange?: (state: CustomFileStateType) => void,
): Promise<string[]> => {
  onStateChange?.(CustomFileStateType.uploading);
  onProgress?.(2);

  const storagePath = `incoming/${userId}/${fileId}/${selectedFile.name}`;

  // 1. Get one presigned URL for the whole zip
  const { signedUrl } = await fetch("/api/presign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: storagePath }),
  }).then((r) => r.json());

  // 2. Upload with real progress (XHR gives progress events, fetch doesn't)
  await uploadWithProgress(selectedFile, signedUrl, (pct) =>
    onProgress?.(Math.round(pct * 88) + 2) // 2% → 90%
  );

  onProgress?.(90);
  onStateChange?.(CustomFileStateType.processing);

  // 3. Create job record — Worker reads this when R2 event fires
  const jobResponse = await fetch("/api/create-dicom-job", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storagePath, userId, fileId }),
  }).then((r) => r.json());

  console.log("[create-dicom-job] response:", jobResponse);

  const { jobId } = jobResponse;

  if (!jobId) throw new Error(`Failed to create job: ${JSON.stringify(jobResponse)}`);

  // 4. Wait for Supabase Realtime push — no polling
  const studies = await waitForJobCompletion(jobId, onProgress, onStateChange);

  onProgress?.(100);
  onStateChange?.(CustomFileStateType.inserted);
  return studies;
};

// ✅ XHR for real upload progress — fetch API doesn't support this
const uploadWithProgress = (
  file: File,
  signedUrl: string,
  onProgress: (pct: number) => void
): Promise<void> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", "application/zip");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status < 400
        ? resolve()
        : reject(new Error(`Upload failed: ${xhr.status}`));
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(file);
  });

// ✅ Supabase Realtime — instant push, no 2s polling delay
const waitForJobCompletion = (
  jobId: string,
  onProgress?: (percent: number) => void,
  onStateChange?: (state: CustomFileStateType) => void
): Promise<string[]> =>
  new Promise((resolve, reject) => {
    let current = 90;
    const ticker = setInterval(() => {
      if (current < 99) onProgress?.(++current);
    }, 2000);

    const finish = (fn: () => void) => {
      clearInterval(ticker);
      channel.unsubscribe();
      fn();
    };

    const channel = supabase
      .channel(`job-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "dicom_processing_job",
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const { status, studies, error } = payload.new;

          if (status === "done") {
            finish(() => {
              onStateChange?.(CustomFileStateType.inserted);
              resolve(studies.map((s: { id: string }) => s.id));
            });
          }

          if (status === "failed") {
            finish(() => reject(new Error(error)));
          }
        }
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // ✅ Race condition fix — check if job already completed before we subscribed
          const { data } = await supabase
            .from("dicom_processing_job")
            .select("status, studies, error")
            .eq("id", jobId)
            .single();

          if (data?.status === "done") {
            finish(() => {
              onStateChange?.(CustomFileStateType.inserted);
              resolve(data.studies.map((s: { id: string }) => s.id));
            });
          }

          if (data?.status === "failed") {
            finish(() => reject(new Error(data.error)));
          }
        }
      });
  });