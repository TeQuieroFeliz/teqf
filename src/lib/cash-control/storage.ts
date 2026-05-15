import { storage } from '@/firebase/client';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
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
  const storageRef = ref(assertStorage(), path);

  async function attemptUpload(retryCount = 0): Promise<string> {
    const compressed = await compressImage(file);
    const task = uploadBytesResumable(storageRef, compressed);
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
      if (!isRetryableStorageError(error) || retryCount >= MAX_UPLOAD_RETRIES) {
        throw error;
      }
      return attemptUpload(retryCount + 1);
    }
  }

  return attemptUpload();
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
  const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const path = `cash-control/receipts/${uid}/${eventId}/${filename}`;
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
  const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const path = `cash-control/proofs/${uid}/${eventId}/${filename}`;
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
