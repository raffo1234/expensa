import { useEffect, useState, useCallback } from "react";
import {
  getPendingItems,
  getFailedItems,
  updateQueueItem,
  removeQueueItem,
  type QueueItem,
} from "./dicomUploadQueue";
import { uploadDicomFile, batchPresignUrls } from "./dicomMultipartUpload";
import { verifyUploadedFile, sendToDeadLetterQueue } from "./dicomUploadVerifier";

const SW_PATH = "/dicom-upload.sw.js";
const SYNC_TAG = "dicom-upload-sync";
const MAX_RESUME_RETRIES = 5;

interface UseDicomUploadSyncResult {
  pendingCount: number;
  failedCount: number;
  flushQueue: () => Promise<void>;
  isResuming: boolean;
}

interface ExtendedServiceWorkerRegistration extends ServiceWorkerRegistration {
  sync?: { register(tag: string): Promise<void> };
  periodicSync?: { register(tag: string, options: { minInterval: number }): Promise<void> };
}

export const useDicomUploadSync = (userId: string): UseDicomUploadSyncResult => {
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [isResuming, setIsResuming] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const registration = (await navigator.serviceWorker.register(
          SW_PATH,
        )) as ExtendedServiceWorkerRegistration;

        if (registration.sync) await registration.sync.register(SYNC_TAG);

        if (registration.periodicSync) {
          try {
            await registration.periodicSync.register(SYNC_TAG, { minInterval: 5 * 60 * 1000 });
          } catch { /* ignore permission errors */ }
        }
      } catch { /* ignore registration errors */ }
    };

    register();
  }, []);

  const processQueueItem = useCallback(
    async (item: QueueItem, signedUrl: string): Promise<void> => {
      const nextAttempts = item.attempts + 1;

      await updateQueueItem(item.id, {
        status: "uploading",
        lastAttemptAt: Date.now(),
        attempts: nextAttempts,
      });

      try {
        await uploadDicomFile(item.blob, item.storagePath, signedUrl);

        const verified = await verifyUploadedFile(item.storagePath);
        if (!verified) throw new Error("File not found in R2 after upload");

        await removeQueueItem(item.id);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);

        if (nextAttempts >= MAX_RESUME_RETRIES) {
          await updateQueueItem(item.id, { status: "failed", failedReason: errorMessage });
          await sendToDeadLetterQueue({
            user_id: userId,
            storage_path: item.storagePath,
            study_instance_uid: item.studyInstanceUID,
            error_message: errorMessage,
            attempts: nextAttempts,
          });
        } else {
          await updateQueueItem(item.id, {
            status: "pending",
            attempts: nextAttempts,
            failedReason: errorMessage,
          });
        }

        throw err;
      }
    },
    [userId],
  );

  const flushQueue = useCallback(async (): Promise<void> => {
    if (!userId) return;

    setIsResuming(true);

    try {
      const pending = await getPendingItems(userId);
      if (pending.length === 0) return;

      setPendingCount(pending.length);

      // Batch-presign all pending paths in one shot before uploading
      const signedUrlMap = await batchPresignUrls(pending.map((item) => item.storagePath));

      for (const item of pending) {
        const signedUrl = signedUrlMap.get(item.storagePath);

        if (!signedUrl) {
          console.warn(`No signed URL for ${item.storagePath}, skipping.`);
          continue;
        }

        try {
          await processQueueItem(item, signedUrl);
          setPendingCount((n) => Math.max(0, n - 1));
        } catch { /* continue processing remaining items */ }
      }

      const failed = await getFailedItems(userId);
      setFailedCount(failed.length);
    } finally {
      setIsResuming(false);
    }
  }, [userId, processQueueItem]);

  useEffect(() => {
    if (!userId) return;

    const checkQueue = async () => {
      const [pending, failed] = await Promise.all([
        getPendingItems(userId),
        getFailedItems(userId),
      ]);

      setPendingCount(pending.length);
      setFailedCount(failed.length);

      if (pending.length > 0) await flushQueue();
    };

    void checkQueue();
  }, [userId, flushQueue]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const notifySW = async () => {
      const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
      if (registration?.active) {
        registration.active.postMessage({ type: "FLUSH_DICOM_QUEUE" });
      }
    };

    void notifySW();
  }, [userId]);

  return { pendingCount, failedCount, flushQueue, isResuming };
};