'use server';
import { firestore } from '@/firebase/server';
import { Article } from './get-articles';

export async function getPublishedArticles(limit = 4): Promise<Article[]> {
  if (!firestore) return [];

  const snapshot = await firestore
    .collection('articles')
    .where('status', '==', 'published')
    .get();

  return snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title ?? '',
        category: data.category ?? '',
        createdAt: data.createdAt?.toDate().toISOString() ?? new Date().toISOString(),
        publishedAt: data.publishedAt?.toDate().toISOString() ?? null,
        shortDescription: data.shortDescription ?? '',
        content: data.content ?? '',
        slug: data.slug ?? '',
        status: 'published' as const,
        updatedAt: data.updatedAt?.toDate().toISOString() ?? new Date().toISOString(),
        coverImage: data.coverImage ?? '',
        images: data.images ?? [],
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
