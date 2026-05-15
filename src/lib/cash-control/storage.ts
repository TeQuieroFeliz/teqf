import { storage } from '@/firebase/client';
import { deleteObject, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { compressImage } from './compressImage';

const MAX_UPLOAD_TIMEOUT_MS = 90000;
const MAX_UPLOAD_RETRIES = 2;

const pendingReceiptUploads = new Map<string, File>();
const pendingProofUploads = new Map<string, File>();

function assertStorage() {
  if (!storage) {
    throw new Error(
      'Firebase Storage non inizializzato. Verifica NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET e la configurazione Firebase lato client.'
    );
  }
  return storage;
}

function isRetryableStorageError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (!code) return true;
  return code !== 'storage/retry-limit-exceeded' && code !== 'storage/canceled';
}

async function uploadFile(
  path: string,
  file: File,
  opts?: {
    onProgress?: (percent: number) => void;
    signal?: AbortSignal;
  }
): Promise<string> {
  if (!path || path.trim() === '') {
    throw new Error('Upload path non valido. Verifica eventId/userId e il campo foto.');
  }
  if (!file) {
    throw new Error('Nessun file fornito per l’upload. Seleziona una foto prima di salvare.');
  }
  if (file.size === 0) {
    throw new Error('Il file è vuoto. Seleziona una foto valida.');
  }
  if (!file.name) {
    throw new Error('Nome file mancante. Seleziona una foto valida.');
  }

  const storageRef = ref(assertStorage(), path);
  console.debug('[cash-control/storage] uploadFile start', {
    path,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  });

  async function attemptUpload(retryCount = 0): Promise<string> {
    const compressed = await compressImage(file);
    const uploadTarget = compressed.size > 0 ? compressed : file;
    if (compressed.size === 0 && file.size > 0) {
      console.warn('[cash-control/storage] compressImage returned empty file, using original file instead.');
    }
    const task = uploadBytesResumable(storageRef, uploadTarget);
    let aborted = false;
    let cleanup: (() => void) | null = null;

    const uploadPromise = new Promise<void>((resolve, reject) => {
      cleanup = () => {
        task.cancel();
      };

      task.on(
        'state_changed',
        snapshot => {
          if (opts?.onProgress && snapshot.totalBytes > 0) {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            opts.onProgress(pct);
          }
        },
        error => {
          if (aborted) {
            reject(new Error('Upload aborted.'));
            return;
          }
          reject(error);
        },
        () => resolve()
      );

      if (opts?.signal) {
        if (opts.signal.aborted) {
          aborted = true;
          task.cancel();
        } else {
          const onAbort = () => {
            aborted = true;
            task.cancel();
          };
          opts.signal.addEventListener('abort', onAbort, { once: true });
          cleanup = () => {
            opts.signal?.removeEventListener('abort', onAbort);
            task.cancel();
          };
        }
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup?.();
        reject(new Error('La subida de foto tardó demasiado. Intenta de nuevo.'));
      }, MAX_UPLOAD_TIMEOUT_MS);
      void uploadPromise.finally(() => clearTimeout(timeoutId));
    });

    try {
      await Promise.race([uploadPromise, timeoutPromise]);
      return getDownloadURL(storageRef);
    } catch (error) {
      const code = (error as { code?: string })?.code ?? 'unknown';
      const message = (error as { message?: string })?.message ?? String(error);
      console.error(
        `[cash-control/storage] upload failed for ${path} (retry ${retryCount})`,
        { code, message, path, retryCount }
      );
      if (!isRetryableStorageError(error) || retryCount >= MAX_UPLOAD_RETRIES) {
        throw error;
      }
      return attemptUpload(retryCount + 1);
    }
  }

  return attemptUpload();
}

function getStoragePathFromUrl(url: string): string {
  if (url.startsWith('gs://')) {
    return url.replace(/^gs:\/\/[^/]+\//, '');
  }

  const match = url.match(/\/o\/([^?]+)(?:\?|$)/);
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }

  return url;
}

export async function deleteFileByUrl(url: string): Promise<void> {
  const storagePath = getStoragePathFromUrl(url);
  const storageRef = ref(assertStorage(), storagePath);

  try {
    await deleteObject(storageRef);
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === 'storage/object-not-found') {
      console.warn('[cash-control/storage] delete skipped. Object not found:', storagePath);
      return;
    }

    console.warn('[cash-control/storage] failed to delete object:', storagePath, error);
    throw error;
  }
}

export async function uploadReceiptPhoto(
  uid: string,
  eventId: string,
  file: File,
  opts?: {
    onProgress?: (pct: number) => void;
    signal?: AbortSignal;
  }
): Promise<string> {
  if (!uid || !eventId) {
    throw new Error('Uid o eventId non valido per upload ricevuta.');
  }
  const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const path = `cash-control/receipts/${uid}/${eventId}/${filename}`;
  console.debug('[cash-control/storage] uploading receipt photo', { uid, eventId, filename, path });
  return uploadFile(path, file, opts);
}

export async function uploadProofPhoto(
  uid: string,
  eventId: string,
  file: File,
  opts?: {
    onProgress?: (pct: number) => void;
    signal?: AbortSignal;
  }
): Promise<string> {
  if (!uid || !eventId) {
    throw new Error('Uid o eventId non valido per upload comprobante.');
  }
  const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const path = `cash-control/proofs/${uid}/${eventId}/${filename}`;
  console.debug('[cash-control/storage] uploading proof photo', { uid, eventId, filename, path });
  return uploadFile(path, file, opts);
}

export function cacheReceiptUploadFile(transactionId: string, file: File): void {
  pendingReceiptUploads.set(transactionId, file);
}

export function cacheProofUploadFile(transactionId: string, file: File): void {
  pendingProofUploads.set(transactionId, file);
}

export function removeCachedReceiptUploadFile(transactionId: string): void {
  pendingReceiptUploads.delete(transactionId);
}

export function removeCachedProofUploadFile(transactionId: string): void {
  pendingProofUploads.delete(transactionId);
}

export async function retryCachedReceiptUpload(
  transactionId: string,
  uid: string,
  eventId: string,
  opts?: {
    onProgress?: (pct: number) => void;
    signal?: AbortSignal;
  }
): Promise<string> {
  const file = pendingReceiptUploads.get(transactionId);
  if (!file) {
    throw new Error('No pending receipt file available para reintentar.');
  }
  try {
    const url = await uploadReceiptPhoto(uid, eventId, file, opts);
    pendingReceiptUploads.delete(transactionId);
    return url;
  } catch (error) {
    throw error;
  }
}

export async function retryCachedProofUpload(
  transactionId: string,
  uid: string,
  eventId: string,
  opts?: {
    onProgress?: (pct: number) => void;
    signal?: AbortSignal;
  }
): Promise<string> {
  const file = pendingProofUploads.get(transactionId);
  if (!file) {
    throw new Error('No pending proof file available para reintentar.');
  }
  try {
    const url = await uploadProofPhoto(uid, eventId, file, opts);
    pendingProofUploads.delete(transactionId);
    return url;
  } catch (error) {
    throw error;
  }
}
