const DB_NAME = 'bonjorno-assets';
const DB_VERSION = 1;
const STORE_NAME = 'backgrounds';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open image store'));
  });
}

export async function saveBackgroundBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to store background image'));
    };
  });
}

export async function getBackgroundBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => {
        db.close();
        resolve((req.result as Blob | undefined) ?? null);
      };
      req.onerror = () => {
        db.close();
        reject(req.error ?? new Error('Failed to read background image'));
      };
    });
  } catch {
    return null;
  }
}

export async function deleteBackgroundBlob(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error ?? new Error('Failed to delete background image'));
      };
    });
  } catch {
    // Best-effort cleanup
  }
}

export async function clearAllBackgroundBlobs(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error ?? new Error('Failed to clear background store'));
      };
    });
  } catch {
    // Best-effort cleanup
  }
}

/**
 * Optimizes an uploaded image by downscaling very large images (e.g. > 2560px)
 * so new tab rendering stays instant and memory-light.
 */
export async function optimizeUploadedImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file (PNG, JPG, WebP, or AVIF).');
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('Image is larger than 20 MB. Please choose a smaller image.');
  }

  // SVGs or small files under 1.5MB can be stored as-is
  if (file.type === 'image/svg+xml' || file.size <= 1.5 * 1024 * 1024) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const maxDim = 2560;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const optimized = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.88)
    );
    return optimized ?? file;
  } catch {
    return file;
  }
}
