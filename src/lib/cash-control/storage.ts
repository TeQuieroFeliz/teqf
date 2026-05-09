import { storage } from '@/firebase/client';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function uploadReceiptPhoto(
  uid: string,
  eventId: string,
  file: File
): Promise<string> {
  const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const path = `cash-control/receipts/${uid}/${eventId}/${filename}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function uploadProofPhoto(
  uid: string,
  eventId: string,
  file: File
): Promise<string> {
  const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const path = `cash-control/proofs/${uid}/${eventId}/${filename}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
