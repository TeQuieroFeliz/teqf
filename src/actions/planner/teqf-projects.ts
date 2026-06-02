'use server';

import { firestore } from '@/firebase/server';
import { OrarioGiorno } from '@/lib/planner-types';
import { TeqfMovementType, TeqfMovementStatus } from '@/lib/teqf-types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function col(projectId: string, sub: string) {
  return firestore.collection('teqfProjects').doc(projectId).collection(sub);
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function createTeqfProject(data: {
  name: string;
  dateStart: string;
  dateEnd: string;
  createdBy: string;
  createdByName: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const now = new Date().toISOString();
    const ref = await firestore.collection('teqfProjects').add({
      ...data,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, id: ref.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function archiveTeqfProject(
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await firestore.collection('teqfProjects').doc(projectId).update({
      status: 'archived',
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Cash Control ──────────────────────────────────────────────────────────────

export async function addTeqfCashMovement(
  projectId: string,
  data: {
    date: string;
    description: string;
    amount: number;
    type: TeqfMovementType;
    assignedTo: string;
    status: TeqfMovementStatus;
    createdBy: string;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const now = new Date().toISOString();
    const ref = await col(projectId, 'cashControl').add({
      ...data,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, id: ref.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateTeqfCashMovement(
  projectId: string,
  movId: string,
  data: {
    date: string;
    description: string;
    amount: number;
    type: TeqfMovementType;
    assignedTo: string;
    status: TeqfMovementStatus;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await col(projectId, 'cashControl').doc(movId).update({
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteTeqfCashMovement(
  projectId: string,
  movId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await col(projectId, 'cashControl').doc(movId).delete();
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Orario di Lavoro ──────────────────────────────────────────────────────────

export async function addTeqfOrarioEntry(
  projectId: string,
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
    const ref = await col(projectId, 'orarioDiLavoro').add({
      ...data,
      ultimaModifica: now,
      createdAt: now,
    });
    return { success: true, id: ref.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateTeqfOrarioEntry(
  projectId: string,
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
    await col(projectId, 'orarioDiLavoro').doc(entryId).update({
      ...data,
      ultimaModifica: new Date().toISOString(),
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteTeqfOrarioEntry(
  projectId: string,
  entryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await col(projectId, 'orarioDiLavoro').doc(entryId).delete();
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
