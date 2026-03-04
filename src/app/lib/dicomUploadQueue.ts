/**
 * dicomUploadQueue.ts
 * Persistent IndexedDB queue for DICOM uploads.
 * Survives tab close, refresh, and browser crashes.
 * Items are only removed after confirmed R2 upload success.
 */

const DB_NAME = "dicom-upload-queue";
const DB_VERSION = 1;
const STORE_NAME = "queue";

export type QueueItemStatus = "pending" | "uploading" | "failed";

export interface QueueItem {
  id: string;
  storagePath: string;
  userId: string;
  studyInstanceUID: string;
  blob: Blob;
  status: QueueItemStatus;
  attempts: number;
  lastAttemptAt?: number;
  failedReason?: string;
  createdAt: number;
}

// --- DB OPEN ---
let _db: IDBDatabase | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("userId", "userId", { unique: false });
      }
    };
    request.onsuccess = (event) => {
      _db = (event.target as IDBOpenDBRequest).result;
      resolve(_db);
    };
    request.onerror = () => reject(request.error);
  });
};

// --- CRUD ---

// ✅ Fixed: only inserts if item doesn't already exist
// preserves attempts count on re-enqueue
export const enqueueUpload = async (
  item: Omit<QueueItem, "status" | "attempts" | "createdAt">,
): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    // Check if already exists — don't overwrite attempts
    const getReq = store.get(item.id);
    getReq.onsuccess = () => {
      if (getReq.result) {
        // Already queued — don't reset attempts or status
        return resolve();
      }
      store.put({
        ...item,
        status: "pending" as QueueItemStatus,
        attempts: 0,
        createdAt: Date.now(),
      });
      tx.oncomplete = () => resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
};

export const updateQueueItem = async (id: string, patch: Partial<QueueItem>): Promise<void> => {
  const db = await openDB();
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

export const removeQueueItem = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// ✅ Fixed: only returns "pending" — never "uploading"
// Prevents SW from grabbing items the main thread is actively uploading
export const getPendingItems = async (userId: string): Promise<QueueItem[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const results: QueueItem[] = [];
    const cursor = tx.objectStore(STORE_NAME).openCursor();
    cursor.onsuccess = (event) => {
      const c = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (c) {
        const item = c.value as QueueItem;
        if (item.userId === userId && item.status === "pending") {
          results.push(item);
        }
        c.continue();
      } else {
        resolve(results);
      }
    };
    cursor.onerror = () => reject(cursor.error);
  });
};

export const getFailedItems = async (userId: string): Promise<QueueItem[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const results: QueueItem[] = [];
    const cursor = tx.objectStore(STORE_NAME).openCursor();
    cursor.onsuccess = (event) => {
      const c = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (c) {
        const item = c.value as QueueItem;
        if (item.userId === userId && item.status === "failed") {
          results.push(item);
        }
        c.continue();
      } else {
        resolve(results);
      }
    };
    cursor.onerror = () => reject(cursor.error);
  });
};
