'use server';

import { firestore } from '@/firebase/server';
import { PlannerUser } from '@/lib/planner-types';

const ref = firestore.collection('planners');

export async function getPlannerByEmail(email: string): Promise<PlannerUser | null> {
  const snap = await ref.where('email', '==', email).where('active', '==', true).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...(doc.data() as Omit<PlannerUser, 'id'>) };
}

export async function getAllPlanners(): Promise<PlannerUser[]> {
  const snap = await ref.orderBy('createdAt', 'desc').get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<PlannerUser, 'id'>),
  }));
}

export async function addPlanner(
  email: string,
  name: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const existing = await ref.where('email', '==', email).limit(1).get();
    if (!existing.empty) {
      await existing.docs[0].ref.update({ active: true, name, mustChangePassword: true });
      return { success: true, id: existing.docs[0].id };
    }
    const docRef = await ref.add({
      email,
      name,
      active: true,
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
      lastLogin: null,
    });
    return { success: true, id: docRef.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function setPlannerMustChangePassword(
  email: string,
  value: boolean
): Promise<void> {
  const snap = await ref.where('email', '==', email).limit(1).get();
  if (!snap.empty) {
    await snap.docs[0].ref.update({ mustChangePassword: value });
  }
}

export async function togglePlannerActive(
  id: string,
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await ref.doc(id).update({ active });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deletePlanner(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await ref.doc(id).delete();
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updatePlannerAvatar(
  id: string,
  avatarUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await ref.doc(id).update({ avatarUrl, updatedAt: new Date().toISOString() });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updatePlannerProfile(
  id: string,
  data: {
    name: string;
    lastName?: string;
    birthDate?: string;
    startDate?: string;
    contractType?: string;
    phone?: string;
    contactEmail?: string;
    role?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await ref.doc(id).update({ ...data, updatedAt: new Date().toISOString() });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updatePlannerLastLogin(email: string): Promise<void> {
  const snap = await ref.where('email', '==', email).limit(1).get();
  if (!snap.empty) {
    await snap.docs[0].ref.update({ lastLogin: new Date().toISOString() });
  }
}
