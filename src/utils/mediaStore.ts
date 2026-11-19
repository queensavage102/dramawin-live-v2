import { useEffect, useState } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, storage } from '../firebase';

const DB_NAME = 'dramawin_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'media';
const IDB_PREFIX = 'idb://';

const resolvedCache = new Map<string, string>();

async function compressPosterImageIfNeeded(file: File): Promise<{ blob: Blob; contentType: string; ext: string }> {
  const fallbackType = file.type || 'image/jpeg';
  const fallbackExt = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  if (typeof window === 'undefined' || file.size <= 1.2 * 1024 * 1024) {
    return { blob: file, contentType: fallbackType, ext: fallbackExt };
  }
  try {
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Image load failed'));
        image.src = objectUrl;
      });
      const maxWidth = 900;
      const scale = img.naturalWidth > maxWidth ? maxWidth / img.naturalWidth : 1;
      const width = Math.max(1, Math.round(img.naturalWidth * scale));
      const height = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return { blob: file, contentType: fallbackType, ext: fallbackExt };
      ctx.drawImage(img, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.86)
      );
      if (blob && blob.size > 0) {
        return { blob, contentType: 'image/jpeg', ext: 'jpg' };
      }
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    // Fall back to original file
  }
  return { blob: file, contentType: fallbackType, ext: fallbackExt };
}

/**
 * Uploads a 2:3 poster image directly to Firebase Storage (`posters/...`) and returns its public download URL
 * so all visitors across devices see the exact poster.
 */
export async function uploadPosterImageToFirebaseStorage(
  file: File,
  seriesKey?: string
): Promise<string> {
  const isImage =
    file.type.startsWith('image/') ||
    /\.(jpe?g|png|webp|avif|gif)$/i.test(file.name);
  if (!isImage) {
    throw new Error('Please choose a valid image file (JPG, PNG, or WebP).');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Poster image must be smaller than 10MB.');
  }

  if (!auth.currentUser) {
    await signInAnonymously(auth).catch(() => {});
  }

  const slug =
    (seriesKey || 'series')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'series';

  const { blob, contentType, ext } = await compressPosterImageIfNeeded(file);
  const filePath = `posters/${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const storageRef = ref(storage, filePath);

  try {
    const snap = await uploadBytes(storageRef, blob, { contentType });
    return await getDownloadURL(snap.ref);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Firebase Storage upload failed.';
    throw new Error(
      `Firebase Storage upload failed (${msg}). Connect Google in /admin or paste a direct image URL.`
    );
  }
}

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
 * Saves an uploaded image/video File in IndexedDB so large videos persist
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
