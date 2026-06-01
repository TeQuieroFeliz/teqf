'use server';
import { firestore } from '@/firebase/server';
import { revalidatePath } from 'next/cache';

export type InspirationItem = {
  id: string;
  imageUrl: string;
  category: string;
  title: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

const col = () => firestore!.collection('floralInspiration');

export async function getInspirationItems(): Promise<InspirationItem[]> {
  if (!firestore) return [];
  const snap = await col().orderBy('createdAt', 'desc').get();
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<InspirationItem, 'id'>) }));
}

export async function getPublishedInspirationItems(): Promise<InspirationItem[]> {
  if (!firestore) return [];
  const snap = await col().where('published', '==', true).orderBy('category').get();
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<InspirationItem, 'id'>) }));
}

export async function saveInspirationItem(
  input: Omit<InspirationItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!firestore) return { success: false, error: 'Database non disponibile.' };
  try {
    const now = new Date().toISOString();
    const { id, ...data } = input;
    if (id) {
      await col().doc(id).update({ ...data, updatedAt: now });
    } else {
      const ref = await col().add({ ...data, createdAt: now, updatedAt: now });
      revalidatePath('/planner/flowers');
      revalidatePath('/flowers');
      return { success: true, id: ref.id };
    }
    revalidatePath('/planner/flowers');
    revalidatePath('/flowers');
    return { success: true, id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteInspirationItem(id: string): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'Database non disponibile.' };
  try {
    await col().doc(id).delete();
    revalidatePath('/planner/flowers');
    revalidatePath('/flowers');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
