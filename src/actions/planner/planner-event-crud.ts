'use server';

import { firestore } from '@/firebase/server';
import { PlannerEvent } from '@/lib/planner-types';
import { revalidatePath } from 'next/cache';

const ref = firestore.collection('plannerEvents');

export async function getPlannerEvents(plannerId: string): Promise<PlannerEvent[]> {
  const snap = await ref.where('plannerId', '==', plannerId).get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<PlannerEvent, 'id'>) }))
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

export async function getAllPlannerEvents(): Promise<PlannerEvent[]> {
  const snap = await ref.orderBy('createdAt', 'desc').get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<PlannerEvent, 'id'>),
  }));
}

export async function getPlannerEvent(id: string): Promise<PlannerEvent | null> {
  const doc = await ref.doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Omit<PlannerEvent, 'id'>) };
}

export async function savePlannerEvent(
  input: Omit<PlannerEvent, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const now = new Date().toISOString();
    const { id, ...data } = input;
    if (id) {
      await ref.doc(id).update({ ...data, updatedAt: now });
      revalidatePath('/planner');
      revalidatePath('/admin/planners');
      return { success: true, id };
    }
    const docRef = await ref.add({ ...data, createdAt: now, updatedAt: now });
    revalidatePath('/planner');
    revalidatePath('/admin/planners');
    return { success: true, id: docRef.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updatePlannerEventStatus(
  id: string,
  status: 'draft' | 'active' | 'submitted'
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();
    await ref.doc(id).update({ status, updatedAt: now });
    revalidatePath('/admin/events');
    revalidatePath('/planner');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deletePlannerEvent(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await ref.doc(id).delete();
    revalidatePath('/planner');
    revalidatePath('/admin/planners');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
