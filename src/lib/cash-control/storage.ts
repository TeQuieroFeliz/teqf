import { storage } from '@/firebase/client';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from './compressImage';

export async function uploadReceiptPhoto(
  uid: string,
  eventId: string,
  file: File
): Promise<string> {
  const compressed = await compressImage(file);
  const filename = `${Date.now()}_${compressed.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const path = `cash-control/receipts/${uid}/${eventId}/${filename}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, compressed);
  return getDownloadURL(storageRef);
}

export async function uploadProofPhoto(
  uid: string,
  eventId: string,
  file: File
): Promise<string> {
  const compressed = await compressImage(file);
  const filename = `${Date.now()}_${compressed.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const path = `cash-control/proofs/${uid}/${eventId}/${filename}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, compressed);
  return getDownloadURL(storageRef);
}
