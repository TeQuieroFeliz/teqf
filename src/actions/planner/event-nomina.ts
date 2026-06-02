'use server';

import { firestore } from '@/firebase/server';
import { NominaEntry, NominaRole, NominaTurno } from '@/lib/planner-types';

function col(eventId: string) {
  return firestore
    .collection('plannerEvents')
    .doc(eventId)
    .collection('nomina');
}

const emptyTurno = (): NominaTurno => ({ entrata: '', uscita: '', ore: 0 });

// ── Add ───────────────────────────────────────────────────────────────────────

export async function addNominaEntry(
  eventId: string,
  data: {
    name: string;
    role: NominaRole;
    turnoAM: NominaTurno;
    turnoPM: NominaTurno;
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

export async function updateNominaEntry(
  eventId: string,
  entryId: string,
  data: {
    name: string;
    role: NominaRole;
    turnoAM: NominaTurno;
    turnoPM: NominaTurno;
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

// ── Get all (PDF generation) ──────────────────────────────────────────────────

export async function getNominaEntries(
  eventId: string
): Promise<NominaEntry[]> {
  const snap = await col(eventId).orderBy('createdAt', 'asc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as NominaEntry));
}
