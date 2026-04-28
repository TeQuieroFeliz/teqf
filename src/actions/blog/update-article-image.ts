'use server';
import { firestore } from '@/firebase/server';
import { Timestamp } from 'firebase-admin/firestore';

export async function updateArticleCoverImage(
  id: string,
  coverImage: string
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'Database not available.' };

  await firestore.collection('articles').doc(id).update({
    coverImage,
    updatedAt: Timestamp.now(),
  });

  return { success: true };
}
