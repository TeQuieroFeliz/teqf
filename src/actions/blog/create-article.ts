'use server';
import { firestore } from '@/firebase/server';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

type CreateArticleInput = {
  title: string;
  category: string;
  shortDescription: string;
  content: string;
  slug: string;
  status: 'draft' | 'published';
  coverImage?: string;
  images?: string[];
};

export async function createArticle(
  input: CreateArticleInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!firestore) return { success: false, error: 'Database not available.' };

  const existing = await firestore
    .collection('articles')
    .where('slug', '==', input.slug)
    .limit(1)
    .get();

  if (!existing.empty) {
    return { success: false, error: 'This slug is already in use. Please choose a different one.' };
  }

  const now = Timestamp.now();
  const ref = await firestore.collection('articles').add({
    ...input,
    images: input.images ?? [],
    createdAt: now,
    updatedAt: now,
    publishedAt: input.status === 'published' ? now : null,
  });

  revalidatePath('/planner/blog');
  return { success: true, id: ref.id };
}
