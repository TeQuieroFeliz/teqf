'use server';

import { firestore } from '@/firebase/server';
import { OrarioEntry, OrarioGiorno } from '@/lib/planner-types';

function col(eventId: string) {
  return firestore
    .collection('plannerEvents')
    .doc(eventId)
    .collection('orarioDiLavoro');
}

// ── Add ───────────────────────────────────────────────────────────────────────

export async function addOrarioEntry(
  eventId: string,
  data: {
    name: string;
    role: string;
    turni: OrarioGiorno[];
    totaleOre: number;
    desmontaje: number;
    createdBy: string;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const now = new Date().toISOString();
    const docRef = await col(eventId).add({
      ...data,
      ultimaModifica: now,
      createdAt: now,
    });
    return { success: true, id: docRef.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateOrarioEntry(
  eventId: string,
  entryId: string,
  data: {
    name: string;
    role: string;
    turni: OrarioGiorno[];
    totaleOre: number;
    desmontaje: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await col(eventId).doc(entryId).update({
      ...data,
      ultimaModifica: new Date().toISOString(),
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteOrarioEntry(
  eventId: string,
  entryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await col(eventId).doc(entryId).delete();
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Get all (PDF / export) ────────────────────────────────────────────────────

export async function getOrarioEntries(
  eventId: string
): Promise<OrarioEntry[]> {
  const snap = await col(eventId).orderBy('createdAt', 'asc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as OrarioEntry));
}
