'use server';
import { firestore } from '@/firebase/server';
import { Article } from './get-articles';

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  if (!firestore) return null;

  const snapshot = await firestore
    .collection('articles')
    .where('slug', '==', slug)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  const data = doc.data();

  if (data.status !== 'published') return null;

  const images = data.images ?? [];
  const processedContent = (data.content ?? '').replace(/\[IMG:([^\]]+)\]/g, (_match: string, url: string) => {
    return `<img src="${url}" alt="Article image" style="max-width: 100%; height: auto; margin: 1rem 0;" />`;
  });

  return {
    id: doc.id,
    title: data.title ?? '',
    category: data.category ?? '',
    createdAt: data.createdAt?.toDate().toISOString() ?? new Date().toISOString(),
    publishedAt: data.publishedAt?.toDate().toISOString() ?? null,
    shortDescription: data.shortDescription ?? '',
    content: processedContent,
    slug: data.slug ?? '',
    status: 'published',
    updatedAt: data.updatedAt?.toDate().toISOString() ?? new Date().toISOString(),
    coverImage: data.coverImage ?? '',
    images,
  };
}
