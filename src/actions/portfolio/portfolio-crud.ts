'use server';
import { firestore } from '@/firebase/server';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

export type PortfolioProject = {
  id: string;
  title: string;
  category: string;
  location: string;
  year: string;
  description: string;
  coverImage: string;
  images: string[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

function toProject(id: string, data: FirebaseFirestore.DocumentData): PortfolioProject {
  return {
    id,
    title: data.title ?? '',
    category: data.category ?? 'indian',
    location: data.location ?? '',
    year: data.year ?? '',
    description: data.description ?? '',
    coverImage: data.coverImage ?? '',
    images: data.images ?? [],
    published: data.published ?? false,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
  };
}

export async function getPortfolioProjects(): Promise<PortfolioProject[]> {
  if (!firestore) return [];
  const snap = await firestore
    .collection('portfolioProjects')
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map((d) => toProject(d.id, d.data()));
}

export async function getPortfolioProject(id: string): Promise<PortfolioProject | null> {
  if (!firestore) return null;
  const doc = await firestore.collection('portfolioProjects').doc(id).get();
  if (!doc.exists) return null;
  return toProject(doc.id, doc.data()!);
}

type ProjectInput = {
  id: string;
  title: string;
  category: string;
  location: string;
  year: string;
  description: string;
  coverImage: string;
  images: string[];
  published: boolean;
};

export async function savePortfolioProject(
  input: ProjectInput
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'Database not available.' };

  const now = Timestamp.now();
  const existing = await firestore.collection('portfolioProjects').doc(input.id).get();

  if (existing.exists) {
    await firestore.collection('portfolioProjects').doc(input.id).update({
      title: input.title,
      category: input.category,
      location: input.location,
      year: input.year,
      description: input.description,
      coverImage: input.coverImage,
      images: input.images,
      published: input.published,
      updatedAt: now,
    });
  } else {
    await firestore.collection('portfolioProjects').doc(input.id).set({
      title: input.title,
      category: input.category,
      location: input.location,
      year: input.year,
      description: input.description,
      coverImage: input.coverImage,
      images: input.images,
      published: input.published,
      createdAt: now,
      updatedAt: now,
    });
  }

  revalidatePath('/admin/portfolio');
  revalidatePath('/portfolio');
  return { success: true };
}

export async function deletePortfolioProject(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'Database not available.' };
  await firestore.collection('portfolioProjects').doc(id).delete();
  revalidatePath('/admin/portfolio');
  revalidatePath('/portfolio');
  return { success: true };
}

export async function updatePortfolioImages(
  id: string,
  images: string[],
  coverImage: string
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'Database not available.' };
  await firestore.collection('portfolioProjects').doc(id).update({
    images,
    coverImage,
    updatedAt: Timestamp.now(),
  });
  revalidatePath('/admin/portfolio');
  revalidatePath('/portfolio');
  return { success: true };
}
