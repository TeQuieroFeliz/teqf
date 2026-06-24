'use server';

import { firestore } from '@/firebase/server';
import { Wedding, WeddingStatus } from '@/lib/wedding-types';
import { revalidatePath } from 'next/cache';

const col = () => firestore!.collection('weddings');

function serializeWedding(doc: FirebaseFirestore.DocumentSnapshot): Wedding {
  const d = doc.data()!;
  const toStr = (v: any) =>
    v && typeof v.toDate === 'function' ? v.toDate().toISOString() : (v ?? '');
  const tsToDate = (v: any): string | null => {
    if (!v) return null;
    if (typeof v.toDate === 'function') {
      return v.toDate().toISOString().slice(0, 10);
    }
    return typeof v === 'string' ? v : null;
  };
  return {
    id: doc.id,
    weddingName: d.weddingName ?? '',
    primaryLocation: d.primaryLocation ?? '',
    status: d.status ?? 'draft',
    startDate: tsToDate(d.startDate),
    endDate: tsToDate(d.endDate),
    createdBy: d.createdBy ?? '',
    createdByName: d.createdByName ?? '',
    assignedTeqfUser: d.assignedTeqfUser ?? null,
    assignedTeqfUserName: d.assignedTeqfUserName ?? null,
    teqfCalendarEventId: d.teqfCalendarEventId ?? null,
    currentVersionNumber: d.currentVersionNumber ?? 0,
    quoteFiles: d.quoteFiles ?? [],
    createdAt: toStr(d.createdAt),
    updatedAt: toStr(d.updatedAt),
  };
}

export async function getWeddings(): Promise<{ success: boolean; data?: Wedding[]; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  try {
    const snap = await col().orderBy('createdAt', 'desc').get();
    return { success: true, data: snap.docs.map(serializeWedding) };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getWedding(id: string): Promise<{ success: boolean; data?: Wedding; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  try {
    const doc = await col().doc(id).get();
    if (!doc.exists) return { success: false, error: 'Not found.' };
    return { success: true, data: serializeWedding(doc) };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function createWedding(data: {
  weddingName: string;
  primaryLocation: string;
  assignedTeqfUser: string | null;
  assignedTeqfUserName: string | null;
  createdBy: string;
  createdByName: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  if (!data.weddingName.trim()) return { success: false, error: 'Wedding name is required.' };
  try {
    const now = new Date().toISOString();
    const ref = await col().add({
      ...data,
      status: 'draft',
      startDate: null,
      endDate: null,
      teqfCalendarEventId: null,
      currentVersionNumber: 0,
      quoteFiles: [],
      createdAt: now,
      updatedAt: now,
    });
    revalidatePath('/planner/weddings');
    return { success: true, id: ref.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateWedding(
  id: string,
  data: {
    weddingName: string;
    primaryLocation: string;
    assignedTeqfUser: string | null;
    assignedTeqfUserName: string | null;
  },
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  if (!data.weddingName.trim()) return { success: false, error: 'Wedding name is required.' };
  try {
    await col().doc(id).update({ ...data, updatedAt: new Date().toISOString() });
    revalidatePath('/planner/weddings');
    revalidatePath(`/planner/weddings/${id}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateWeddingStatus(
  id: string,
  status: WeddingStatus,
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  try {
    await col().doc(id).update({ status, updatedAt: new Date().toISOString() });
    revalidatePath(`/planner/weddings/${id}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteWedding(id: string): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  try {
    // Delete sub-collections
    const fnsSnap = await col().doc(id).collection('functions').get();
    const versSnap = await col().doc(id).collection('versions').get();
    const batch = firestore.batch();
    fnsSnap.docs.forEach(d => batch.delete(d.ref));
    versSnap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    await col().doc(id).delete();
    revalidatePath('/planner/weddings');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// Recalculate wedding startDate/endDate from its functions
export async function recalculateWeddingDates(weddingId: string): Promise<void> {
  if (!firestore) return;
  try {
    const fnsSnap = await col().doc(weddingId).collection('functions').get();
    const dates = fnsSnap.docs.map(d => d.data().date as string).filter(Boolean).sort();
    if (dates.length === 0) {
      await col().doc(weddingId).update({ startDate: null, endDate: null, updatedAt: new Date().toISOString() });
    } else {
      await col().doc(weddingId).update({
        startDate: dates[0],
        endDate: dates[dates.length - 1],
        updatedAt: new Date().toISOString(),
      });
    }
  } catch {}
}

// ── Quote file management ─────────────────────────────────────────────────────

export async function addQuoteFile(
  weddingId: string,
  fileRecord: {
    id: string; url: string; fileName: string; fileSize: number;
    storagePath: string; version: number; uploadedBy: string; uploadedByName: string;
  },
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  try {
    const doc = await col().doc(weddingId).get();
    const existing: any[] = doc.data()?.quoteFiles ?? [];
    const updated = [...existing, { ...fileRecord, uploadedAt: new Date().toISOString() }];
    await col().doc(weddingId).update({ quoteFiles: updated, updatedAt: new Date().toISOString() });
    revalidatePath(`/planner/weddings/${weddingId}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function removeQuoteFile(
  weddingId: string,
  fileId: string,
): Promise<{ success: boolean; storagePath?: string; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  try {
    const doc = await col().doc(weddingId).get();
    const existing: any[] = doc.data()?.quoteFiles ?? [];
    const target = existing.find(f => f.id === fileId);
    const updated = existing.filter(f => f.id !== fileId);
    await col().doc(weddingId).update({ quoteFiles: updated, updatedAt: new Date().toISOString() });
    revalidatePath(`/planner/weddings/${weddingId}`);
    return { success: true, storagePath: target?.storagePath };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── TeQF planner users dropdown ───────────────────────────────────────────────

export async function getTeqfPlanners(): Promise<{ id: string; name: string }[]> {
  if (!firestore) return [];
  try {
    const snap = await firestore
      .collection('planners')
      .where('active', '==', true)
      .get();
    return snap.docs
      .filter(d => {
        const data = d.data();
        const team: string[] = data.team ?? [];
        return team.includes('TeQF');
      })
      .map(d => ({ id: d.id, name: `${d.data().name ?? ''} ${d.data().lastName ?? ''}`.trim() }));
  } catch {
    return [];
  }
}
