'use server';

import { firestore } from '@/firebase/server';
import { FlowerItem } from '@/lib/planner-types';
import { revalidatePath } from 'next/cache';

const ref = firestore.collection('flowerItems');

export async function getFlowerItems(): Promise<FlowerItem[]> {
  const snap = await ref.orderBy('createdAt', 'desc').get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<FlowerItem, 'id'>),
  }));
}

export async function getFlowerItem(id: string): Promise<FlowerItem | null> {
  if (id === 'new') return null;
  const doc = await ref.doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Omit<FlowerItem, 'id'>) };
}

export async function getPublishedFlowerItems(): Promise<FlowerItem[]> {
  const snap = await ref.where('published', '==', true).get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<FlowerItem, 'id'>) }))
    .sort((a, b) => (a.category ?? '').localeCompare(b.category ?? ''));
}

export async function saveFlowerItem(
  input: Omit<FlowerItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const now = new Date().toISOString();
    const { id, ...data } = input;
    if (id) {
      await ref.doc(id).update({ ...data, updatedAt: now });
      revalidatePath('/planner/flowers');
      return { success: true, id };
    }
    const docRef = await ref.add({ ...data, images: [], createdAt: now, updatedAt: now });
    revalidatePath('/planner/flowers');
    return { success: true, id: docRef.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateFlowerImages(
  id: string,
  images: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await ref.doc(id).update({ images, updatedAt: new Date().toISOString() });
    revalidatePath('/planner/flowers');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteFlowerItem(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await ref.doc(id).delete();
    revalidatePath('/planner/flowers');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
