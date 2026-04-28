'use server';
import { firestore } from '@/firebase/server';

export type Article = {
  id: string;
  title: string;
  category: string;
  createdAt: string;
  publishedAt: string | null;
  shortDescription: string;
  content: string;
  slug: string;
  status: 'draft' | 'published';
  updatedAt: string;
  coverImage: string;
  images: string[];
};

export async function getArticles(): Promise<Article[]> {
  if (!firestore) return [];

  const snapshot = await firestore
    .collection('articles')
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => {
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
      status: data.status ?? 'draft',
      updatedAt: data.updatedAt?.toDate().toISOString() ?? new Date().toISOString(),
      coverImage: data.coverImage ?? '',
      images: data.images ?? [],
    } as Article;
  });
}
