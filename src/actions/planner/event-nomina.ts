'use server';

import { firestore } from '@/firebase/server';
import { NominaEntry } from '@/lib/planner-types';

function col(eventId: string) {
  return firestore
    .collection('plannerEvents')
    .doc(eventId)
    .collection('nomina');
}

// ── Add entry ─────────────────────────────────────────────────────────────────

export async function addNominaEntry(
  eventId: string,
  personName: string,
  userId: string = ''
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const now = new Date().toISOString();
    const docRef = await col(eventId).add({
      personName,
      userId,
      entryTimeAM: '',
      exitTimeAM: '',
      hoursAM: 0,
      entryTimePM: '',
      exitTimePM: '',
      hoursPM: 0,
      totalHours: 0,
      desmontajeCount: 0,
      approvedBy: null,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, id: docRef.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Update entry ──────────────────────────────────────────────────────────────

export async function updateNominaEntry(
  eventId: string,
  entryId: string,
  data: Partial<Omit<NominaEntry, 'id' | 'createdAt' | 'approvedBy'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    await col(eventId).doc(entryId).update({
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Approve entry (SuperAdmin only) ──────────────────────────────────────────

export async function approveNominaEntry(
  eventId: string,
  entryId: string,
  approvedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await col(eventId).doc(entryId).update({
      approvedBy,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Revoke approval (SuperAdmin only) ────────────────────────────────────────

export async function revokeNominaApproval(
  eventId: string,
  entryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await col(eventId).doc(entryId).update({
      approvedBy: null,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Delete entry (SuperAdmin only) ───────────────────────────────────────────

export async function deleteNominaEntry(
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

// ── Get all entries (for PDF generation) ─────────────────────────────────────

export async function getNominaEntries(
  eventId: string
): Promise<NominaEntry[]> {
  const snap = await col(eventId).orderBy('createdAt', 'asc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as NominaEntry));
}
