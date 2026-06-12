'use server';

import { firestore } from '@/firebase/server';
import { FurnitureItem } from '@/lib/planner-types';
import { revalidatePath } from 'next/cache';

const col = () => firestore!.collection('furnitureItems');
const metaDoc = () => firestore!.collection('furnitureMeta').doc('config');

function serialize(doc: FirebaseFirestore.DocumentSnapshot): FurnitureItem {
  const d = doc.data()!;
  const toStr = (v: any) => (v && typeof v.toDate === 'function' ? v.toDate().toISOString() : (v ?? ''));
  return {
    id: doc.id,
    name: d.name ?? '',
    category: d.category ?? '',
    price: d.price ?? 0,
    currency: d.currency ?? 'MXN',
    cities: d.cities ?? [],
    images: d.images ?? [],
    description: d.description ?? '',
    published: d.published ?? false,
    createdAt: toStr(d.createdAt),
    updatedAt: toStr(d.updatedAt),
  };
}

const DEFAULT_CATEGORIES = ['Sedie', 'Tavoli', 'Tovaglie', 'Cocktail Table', 'Divani', 'Sala Lounge'];
const DEFAULT_CITIES = ['Ciudad de México', 'Cancún'];

export async function getFurnitureMeta(): Promise<{ categories: string[]; cities: string[] }> {
  if (!firestore) return { categories: DEFAULT_CATEGORIES, cities: DEFAULT_CITIES };
  const doc = await metaDoc().get();
  if (!doc.exists) {
    const defaults = { categories: DEFAULT_CATEGORIES, cities: DEFAULT_CITIES };
    await metaDoc().set(defaults);
    return defaults;
  }
  const data = doc.data()!;
  return {
    categories: data.categories ?? DEFAULT_CATEGORIES,
    cities: data.cities ?? DEFAULT_CITIES,
  };
}

export async function saveFurnitureMeta(
  categories: string[],
  cities: string[]
): Promise<void> {
  if (!firestore) return;
  await metaDoc().set({ categories, cities });
}

export async function getFurnitureItems(): Promise<FurnitureItem[]> {
  if (!firestore) return [];
  const snap = await col().orderBy('createdAt', 'desc').get();
  return snap.docs.map(serialize);
}

export async function getFurnitureItem(id: string): Promise<FurnitureItem | null> {
  if (!firestore || id === 'new') return null;
  const doc = await col().doc(id).get();
  if (!doc.exists) return null;
  return serialize(doc);
}

export async function getPublishedFurnitureItems(): Promise<FurnitureItem[]> {
  if (!firestore) return [];
  const snap = await col().where('published', '==', true).get();
  return snap.docs
    .map(serialize)
    .sort((a, b) => a.category.localeCompare(b.category));
}

export async function saveFurnitureItem(
  input: Omit<FurnitureItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!firestore) return { success: false, error: 'Database non disponibile.' };
  try {
    const now = new Date().toISOString();
    const { id, ...data } = input;
    if (id) {
      await col().doc(id).update({ ...data, updatedAt: now });
      revalidatePath('/planner/furniture');
      return { success: true, id };
    }
    const docRef = await col().add({ ...data, createdAt: now, updatedAt: now });
    revalidatePath('/planner/furniture');
    return { success: true, id: docRef.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateFurnitureImages(
  id: string,
  images: string[]
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'Database non disponibile.' };
  try {
    await col().doc(id).update({ images, updatedAt: new Date().toISOString() });
    revalidatePath('/planner/furniture');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteFurnitureItem(id: string): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'Database non disponibile.' };
  try {
    await col().doc(id).delete();
    revalidatePath('/planner/furniture');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
