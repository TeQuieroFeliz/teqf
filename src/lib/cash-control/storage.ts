import { storage } from '@/firebase/client';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from './compressImage';

function assertStorage() {
  if (!storage) {
    throw new Error(
      'Firebase Storage non inizializzato. Verifica NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET e la configurazione Firebase lato client.'
    );
  }
  return storage;
}

function withUploadTimeout<T>(promise: Promise<T>, ms = 20000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('La subida de foto tardó demasiado. Intenta de nuevo.')), ms)
    ),
  ]);
}

export async function uploadReceiptPhoto(
  uid: string,
  eventId: string,
  file: File
): Promise<string> {
  const compressed = await compressImage(file);
  const filename = `${Date.now()}_${compressed.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const path = `cash-control/receipts/${uid}/${eventId}/${filename}`;
  const storageRef = ref(assertStorage(), path);
  await withUploadTimeout(uploadBytes(storageRef, compressed));
  return withUploadTimeout(getDownloadURL(storageRef));
}

export async function uploadProofPhoto(
  uid: string,
  eventId: string,
  file: File
): Promise<string> {
  const compressed = await compressImage(file);
  const filename = `${Date.now()}_${compressed.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const path = `cash-control/proofs/${uid}/${eventId}/${filename}`;
  const storageRef = ref(assertStorage(), path);
  await withUploadTimeout(uploadBytes(storageRef, compressed));
  return withUploadTimeout(getDownloadURL(storageRef));
}
