'use server';
import { firestore } from '@/firebase/server';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

type UpdateArticleInput = {
  id: string;
  title: string;
  category: string;
  shortDescription: string;
  content: string;
  slug: string;
  status: 'draft' | 'published';
  coverImage?: string;
  images?: string[];
};

export async function updateArticle(
  input: UpdateArticleInput
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'Database not available.' };

  const { id, ...fields } = input;

  const slugConflict = await firestore
    .collection('articles')
    .where('slug', '==', fields.slug)
    .limit(1)
    .get();

  if (!slugConflict.empty && slugConflict.docs[0].id !== id) {
    return { success: false, error: 'This slug is already in use by another article.' };
  }

  const docRef = firestore.collection('articles').doc(id);
  const current = await docRef.get();
  if (!current.exists) return { success: false, error: 'Article not found.' };

  const currentData = current.data()!;
  const now = Timestamp.now();

  await docRef.update({
    ...fields,
    updatedAt: now,
    publishedAt:
      fields.status === 'published' && !currentData.publishedAt
        ? now
        : currentData.publishedAt ?? null,
  });

  revalidatePath('/admin/blog');
  revalidatePath(`/admin/blog/${id}`);
  return { success: true };
}
