'use server';
import { firestore } from '@/firebase/server';
import { Article } from './get-articles';

export async function getArticle(id: string): Promise<Article | null> {
  if (!firestore) return null;

  const doc = await firestore.collection('articles').doc(id).get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  return {
    id: doc.id,
    title: data.title ?? '',
    category: data.category ?? '',
    createdAt: data.createdAt?.toDate().toISOString() ?? new Date().toISOString(),
    publishedAt: data.publishedAt?.toDate().toISOString() ?? null,
    shortDescription: data.shortDescription ?? '',
    content: data.content ?? '',
    slug: data.slug ?? '',
    status: data.status ?? 'draft',
    updatedAt: data.updatedAt?.toDate().toISOString() ?? new Date().toISOString(),
    coverImage: data.coverImage ?? '',
    images: data.images ?? [],
  };
}
