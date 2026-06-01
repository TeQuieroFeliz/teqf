'use server';
import { firestore } from '@/firebase/server';
import { revalidatePath } from 'next/cache';

export async function deleteArticle(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'Database not available.' };

  await firestore.collection('articles').doc(id).delete();
  revalidatePath('/planner/blog');
  return { success: true };
}
