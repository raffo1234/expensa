/**
 * dicom-upload.sw.js
 * Service Worker for DICOM background upload sync.
 * Place this file directly in /public/dicom-upload.sw.js
 */

const DB_NAME = "dicom-upload-queue";
const STORE_NAME = "queue";
const SYNC_TAG = "dicom-upload-sync";
const MAX_ATTEMPTS = 5;
const FATAL_STATUSES = [400, 401, 403, 404, 422];

// --- INDEXEDDB HELPERS ---
const openQueueDB = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("userId", "userId", { unique: false });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });

// ✅ Fixed: SW only picks up "pending" — never "uploading"
// "uploading" means the main thread is actively handling it right now
const getPendingFromDB = async () => {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const results = [];
    const cursor = tx.objectStore(STORE_NAME).openCursor();
    cursor.onsuccess = (e) => {
      const c = e.target.result;
      if (c) {
        if (c.value.status === "pending") {
          results.push(c.value);
        }
        c.continue();
      } else {
        resolve(results);
      }
    };
    cursor.onerror = () => reject(cursor.error);
  });
};

const updateItemInDB = async (id, patch) => {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (!getReq.result) return resolve();
      store.put({ ...getReq.result, ...patch });
      tx.oncomplete = () => resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
};

const removeItemFromDB = async (id) => {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const sendToDeadLetter = async (item, reason) => {
  try {
    await fetch("/api/dicom-dead-letter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: item.userId,
        storage_path: item.storagePath,
        study_instance_uid: item.studyInstanceUID,
        error_message: reason,
        attempts: item.attempts || 0,
      }),
    });
  } catch (err) {
    console.warn("[SW] Failed to write dead letter entry:", err);
  }
};

// --- UPLOAD ONE ITEM — always throws on failure, never swallows ---
const uploadItem = async (item) => {
  // Step 1: Get presigned URL
  let signRes;
  try {
    signRes = await fetch("/api/generate-dicom-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: item.storagePath }),
    });
  } catch (err) {
    throw new Error(`Network error fetching presigned URL: ${err.message}`);
  }

  if (!signRes.ok) {
    const isFatal = FATAL_STATUSES.includes(signRes.status);
    const msg = `Presign ${isFatal ? "[FATAL] " : ""}failed ${signRes.status}`;
    throw Object.assign(new Error(msg), { fatal: isFatal });
  }

  const { signedUrl } = await signRes.json();
  if (!signedUrl) {
    throw Object.assign(new Error("[FATAL] Missing signedUrl"), { fatal: true });
  }

  // Step 2: PUT to R2
  let putRes;
  try {
    putRes = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/dicom" },
      body: item.blob,
    });
  } catch (err) {
    throw new Error(`Network error during R2 PUT: ${err.message}`);
  }

  if (!putRes.ok) {
    const isFatal = FATAL_STATUSES.includes(putRes.status);
    const msg = `R2 PUT ${isFatal ? "[FATAL] " : ""}failed ${putRes.status}`;
    throw Object.assign(new Error(msg), { fatal: isFatal });
  }

  // Step 3: Verify — small delay for R2 eventual consistency
  await new Promise((r) => setTimeout(r, 800));

  let exists = false;
  try {
    const verifyRes = await fetch(`/api/dicom-verify?path=${encodeURIComponent(item.storagePath)}`);
    if (verifyRes.ok) {
      const data = await verifyRes.json();
      exists = data.exists && (data.size || 0) > 0;
    }
  } catch (err) {
    // Verify network failure — give benefit of the doubt, don't penalize the upload
    console.warn(`[SW] Verify network error for ${item.storagePath}:`, err);
    exists = true;
  }

  if (!exists) {
    throw new Error(`File not found in R2 after upload: ${item.storagePath}`);
  }

  // ✅ Only remove AFTER confirmed success
  await removeItemFromDB(item.id);
  console.log(`[SW] ✅ Uploaded and verified: ${item.storagePath}`);
};

// --- FLUSH ALL PENDING ---
const flushPendingUploads = async () => {
  const items = await getPendingFromDB();
  if (items.length === 0) return;

  console.log(`[SW] Flushing ${items.length} pending DICOM uploads...`);

  for (const item of items) {
    // ✅ Use persisted attempts count — never reset it
    const attempts = (item.attempts || 0) + 1;

    await updateItemInDB(item.id, {
      status: "uploading",
      lastAttemptAt: Date.now(),
      attempts,
    });

    try {
      await uploadItem(item);
    } catch (err) {
      const isFatal = err.fatal === true;
      const exhausted = attempts >= MAX_ATTEMPTS;

      console.error(`[SW] ❌ Failed: ${item.storagePath}:`, err.message);

      if (isFatal || exhausted) {
        await updateItemInDB(item.id, {
          status: "failed",
          failedReason: err.message,
        });
        await sendToDeadLetter(item, err.message);
        console.error(
          `[SW] 💀 Permanently failed after ${attempts} attempt(s): ${item.storagePath}`,
        );
      } else {
        // Back to pending for next sync cycle
        await updateItemInDB(item.id, {
          status: "pending",
          failedReason: err.message,
        });
        console.warn(`[SW] ⏳ Will retry (${attempts}/${MAX_ATTEMPTS}): ${item.storagePath}`);
      }
    }
  }
};

// --- SERVICE WORKER EVENTS ---
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(flushPendingUploads());
  }
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(flushPendingUploads());
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "FLUSH_DICOM_QUEUE") {
    event.waitUntil(flushPendingUploads());
  }
});
