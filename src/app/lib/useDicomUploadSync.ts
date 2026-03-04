/**
 * useDicomUploadSync.ts
 * React hook that:
 * 1. Registers the DICOM upload Service Worker
 * 2. Resumes any pending IndexedDB queue items on mount
 * 3. Registers background sync so uploads continue after tab close
 *
 * Usage: Call once at the top of UploaderR2 or a parent layout component.
 *   const { pendingCount, flushQueue } = useDicomUploadSync(userId);
 */

import { useEffect, useState, useCallback } from "react";
import {
  getPendingItems,
  getFailedItems,
  updateQueueItem,
  removeQueueItem,
  type QueueItem,
} from "./dicomUploadQueue";
import { uploadDicomFile } from "./dicomMultipartUpload";
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

export const useDicomUploadSync = (userId: string): UseDicomUploadSyncResult => {
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [isResuming, setIsResuming] = useState(false);

  // --- REGISTER SERVICE WORKER ---
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register(SW_PATH);
        console.log("[SW] DICOM upload service worker registered:", registration.scope);

        // Register background sync
        if ("sync" in registration) {
          await (registration as any).sync.register(SYNC_TAG);
          console.log("[SW] Background sync registered");
        }

        // Register periodic background sync (Chrome 80+)
        if ("periodicSync" in registration) {
          try {
            await (registration as any).periodicSync.register(SYNC_TAG, {
              minInterval: 5 * 60 * 1000, // every 5 minutes
            });
            console.log("[SW] Periodic background sync registered");
          } catch {
            // periodicSync may be denied without permission — not fatal
          }
        }
      } catch (err) {
        console.warn("[SW] Service worker registration failed:", err);
      }
    };

    register();
  }, []);

  // --- PROCESS ONE QUEUE ITEM ---
  const processQueueItem = useCallback(
    async (item: QueueItem): Promise<void> => {
      await updateQueueItem(item.id, {
        status: "uploading",
        lastAttemptAt: Date.now(),
        attempts: item.attempts + 1,
      });

      try {
        await uploadDicomFile(item.blob, item.storagePath);

        // Verify before marking done
        const verified = await verifyUploadedFile(item.storagePath);
        if (!verified) {
          throw new Error("File not found in R2 after upload");
        }

        await removeQueueItem(item.id);
        console.log(`[Queue] Resumed successfully: ${item.storagePath}`);
      } catch (err) {
        const nextAttempts = item.attempts + 1;

        if (nextAttempts >= MAX_RESUME_RETRIES) {
          // Permanently failed — send to dead letter queue
          await updateQueueItem(item.id, {
            status: "failed",
            failedReason: err instanceof Error ? err.message : String(err),
          });

          await sendToDeadLetterQueue({
            user_id: userId,
            storage_path: item.storagePath,
            study_instance_uid: item.studyInstanceUID,
            error_message: err instanceof Error ? err.message : String(err),
            attempts: nextAttempts,
          });
        } else {
          // Back to pending for next flush
          await updateQueueItem(item.id, {
            status: "pending",
            attempts: nextAttempts,
            failedReason: err instanceof Error ? err.message : String(err),
          });
        }

        throw err;
      }
    },
    [userId],
  );

  // --- FLUSH ALL PENDING ---
  const flushQueue = useCallback(async (): Promise<void> => {
    if (!userId) return;
    setIsResuming(true);

    try {
      const pending = await getPendingItems(userId);
      if (pending.length === 0) return;

      console.log(`[Queue] Resuming ${pending.length} pending uploads...`);
      setPendingCount(pending.length);

      // Process sequentially to avoid overwhelming R2
      for (const item of pending) {
        try {
          await processQueueItem(item);
          setPendingCount((n) => Math.max(0, n - 1));
        } catch {
          // Continue with next item even if this one fails
        }
      }

      // Update failed count
      const failed = await getFailedItems(userId);
      setFailedCount(failed.length);
    } finally {
      setIsResuming(false);
    }
  }, [userId, processQueueItem]);

  // --- ON MOUNT: CHECK FOR PENDING ITEMS ---
  useEffect(() => {
    if (!userId) return;

    const checkQueue = async () => {
      const [pending, failed] = await Promise.all([
        getPendingItems(userId),
        getFailedItems(userId),
      ]);

      setPendingCount(pending.length);
      setFailedCount(failed.length);

      if (pending.length > 0) {
        console.log(`[Queue] Found ${pending.length} pending uploads from previous session`);
        await flushQueue();
      }
    };

    checkQueue();
  }, [userId, flushQueue]);

  // --- NOTIFY SERVICE WORKER TO FLUSH ---
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const notifySW = async () => {
      const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
      if (registration?.active) {
        registration.active.postMessage({ type: "FLUSH_DICOM_QUEUE" });
      }
    };

    notifySW();
  }, [userId]);

  return { pendingCount, failedCount, flushQueue, isResuming };
};
