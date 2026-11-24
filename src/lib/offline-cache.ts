// Tiny IndexedDB key/value store used as the offline read cache (photos are too big for localStorage).
const DB_NAME = "jms-cache";
const STORE = "kv";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  try {
    return await tx("readonly", (s) => s.get(key) as IDBRequest<T | undefined>);
  } catch {
    return undefined;
  }
}

export async function cacheSet(key: string, value: unknown): Promise<void> {
  try {
    await tx("readwrite", (s) => s.put(value, key));
  } catch {
    // Cache is best effort.
  }
}

export async function cacheClear(): Promise<void> {
  try {
    await tx("readwrite", (s) => s.clear());
  } catch {
    // ignore
  }
}
