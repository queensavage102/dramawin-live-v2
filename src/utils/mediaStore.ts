import { useEffect, useState } from 'react';

const DB_NAME = 'dramawin_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'media';
const IDB_PREFIX = 'idb://';

const resolvedCache = new Map<string, string>();

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open media DB'));
  });
}

/**
 * Saves an uploaded image/video File in IndexedDB so large videos & covers persist
 * across reloads without hitting localStorage's 5MB quota. Returns an `idb://<key>` reference.
 */
export async function saveMediaFile(file: File): Promise<string> {
  const id = `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ref = `${IDB_PREFIX}${id}`;

  try {
    const db = await openMediaDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(file, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Media write error'));
    });
    const objectUrl = URL.createObjectURL(file);
    resolvedCache.set(ref, objectUrl);
    return ref;
  } catch {
    // Fallback to Data URL if IndexedDB is blocked in strict private mode
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Unable to read uploaded file.'));
        }
      };
      reader.onerror = () => reject(new Error('Unable to read uploaded file.'));
      reader.readAsDataURL(file);
    });
  }
}

export async function resolveMediaUrl(src?: string): Promise<string> {
  const raw = (src || '').trim();
  if (!raw) return '';
  if (!raw.startsWith(IDB_PREFIX)) return raw;

  const cached = resolvedCache.get(raw);
  if (cached) return cached;

  const id = raw.slice(IDB_PREFIX.length);
  try {
    const db = await openMediaDb();
    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result as Blob | undefined);
      req.onerror = () => reject(req.error);
    });
    if (!blob) return '';
    const objectUrl = URL.createObjectURL(blob);
    resolvedCache.set(raw, objectUrl);
    return objectUrl;
  } catch {
    return '';
  }
}

export function useResolvedMediaUrl(src?: string): string {
  const raw = (src || '').trim();
  const isIdb = raw.startsWith(IDB_PREFIX);
  const [resolved, setResolved] = useState<string>(() => {
    if (!raw) return '';
    if (!isIdb) return raw;
    return resolvedCache.get(raw) || '';
  });

  useEffect(() => {
    let active = true;
    if (!raw || !isIdb) {
      return;
    }
    const cached = resolvedCache.get(raw);
    if (cached) {
      setResolved(cached);
      return;
    }
    setResolved('');
    void resolveMediaUrl(raw).then((url) => {
      if (active) setResolved(url);
    });
    return () => {
      active = false;
    };
  }, [raw, isIdb]);

  if (!raw) return '';
  if (!isIdb) return raw;
  return resolvedCache.get(raw) || resolved;
}
