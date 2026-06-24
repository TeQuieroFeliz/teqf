import { storage } from '@/firebase/client';
import { getDownloadURL, ref, uploadBytes, deleteObject } from 'firebase/storage';

export interface UploadResult {
  url: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toLowerCase()
    .slice(0, 100);
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

export async function uploadToStorage(
  file: File,
  storagePath: string,
  options?: {
    maxSizeBytes?: number;
    allowedMimeTypes?: string[];
  },
): Promise<UploadResult> {
  const { maxSizeBytes, allowedMimeTypes } = options ?? {};

  if (maxSizeBytes && file.size > maxSizeBytes) {
    throw new Error(`File too large. Max: ${Math.round(maxSizeBytes / 1024 / 1024)} MB`);
  }
  if (allowedMimeTypes && !allowedMimeTypes.some(m => {
    if (m.endsWith('/*')) return file.type.startsWith(m.slice(0, -1));
    return file.type === m;
  })) {
    throw new Error(`File type not allowed: ${file.type}`);
  }

  const sanitized = sanitizeFileName(file.name);
  const uniqueName = `${Date.now()}_${generateId()}_${sanitized}`;
  const fullPath = `${storagePath}/${uniqueName}`;

  const storageRef = ref(storage, fullPath);
  const snap = await uploadBytes(storageRef, file, { contentType: file.type });
  const url = await getDownloadURL(snap.ref);

  return { url, storagePath: fullPath, fileName: file.name, fileSize: file.size };
}

export async function deleteFromStorage(storagePath: string): Promise<void> {
  try {
    await deleteObject(ref(storage, storagePath));
  } catch {
    // File may have already been deleted — non-fatal
  }
}

// ── Mime type constants ───────────────────────────────────────────────────────

export const MIME_PDF_IMAGE = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
export const MIME_IMAGE     = ['image/jpeg', 'image/png', 'image/webp'];
export const MIME_PDF       = ['application/pdf'];

export const MAX_20MB = 20 * 1024 * 1024;
export const MAX_10MB = 10 * 1024 * 1024;
