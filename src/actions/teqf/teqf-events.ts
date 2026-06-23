'use server';

import { firestore } from '@/firebase/server';
import { revalidatePath } from 'next/cache';

export type TeqfCalendarEvent = {
  id: string;
  eventStartDate: string;  // YYYY-MM-DD
  eventEndDate: string;    // YYYY-MM-DD (same as start for single-day events)
  eventName: string;
  location: string;
  notes: string;
  xbEventId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type XbEventOption = {
  id: string;
  label: string;
  date: string;
};

const col = () => firestore!.collection('teqf_events');

function serialize(doc: FirebaseFirestore.DocumentSnapshot): TeqfCalendarEvent {
  const d = doc.data()!;
  const toStr = (v: any) =>
    v && typeof v.toDate === 'function' ? v.toDate().toISOString() : (v ?? '');
  // Backward-compat: legacy docs may have eventDate instead of eventStartDate
  const startDate = d.eventStartDate ?? d.eventDate ?? '';
  return {
    id: doc.id,
    eventStartDate: startDate,
    eventEndDate: d.eventEndDate ?? startDate,
    eventName: d.eventName ?? '',
    location: d.location ?? '',
    notes: d.notes ?? '',
    xbEventId: d.xbEventId ?? null,
    createdBy: d.createdBy ?? '',
    createdAt: toStr(d.createdAt),
    updatedAt: toStr(d.updatedAt),
  };
}

export async function createTeqfCalendarEvent(data: {
  eventStartDate: string;
  eventEndDate: string;
  eventName: string;
  location: string;
  notes: string;
  xbEventId: string | null;
  createdBy: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!firestore) return { success: false, error: 'Database non disponibile.' };
  if (data.eventEndDate < data.eventStartDate) {
    return { success: false, error: 'End date cannot be before start date.' };
  }
  try {
    const now = new Date().toISOString();
    const docRef = await col().add({
      ...data,
      xbEventId: data.xbEventId || null,
      createdAt: now,
      updatedAt: now,
    });
    revalidatePath('/planner/calendar');
    return { success: true, id: docRef.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateTeqfCalendarEvent(
  id: string,
  data: {
    eventStartDate: string;
    eventEndDate: string;
    eventName: string;
    location: string;
    notes: string;
    xbEventId: string | null;
  },
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'Database non disponibile.' };
  if (data.eventEndDate < data.eventStartDate) {
    return { success: false, error: 'End date cannot be before start date.' };
  }
  try {
    await col().doc(id).update({
      ...data,
      xbEventId: data.xbEventId || null,
      updatedAt: new Date().toISOString(),
    });
    revalidatePath('/planner/calendar');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteTeqfCalendarEvent(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'Database non disponibile.' };
  try {
    await col().doc(id).delete();
    revalidatePath('/planner/calendar');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getXbEventsForDropdown(): Promise<XbEventOption[]> {
  if (!firestore) return [];
  try {
    const snap = await firestore
      .collection('plannerEvents')
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((d) => {
      const data = d.data();
      const firstDate: string = data.days?.[0]?.date ?? data.eventDate ?? '';
      const parts = [data.eventCode, data.eventName, data.clientName].filter(Boolean);
      return { id: d.id, label: parts.join(' – ') || d.id, date: firstDate };
    });
  } catch {
    return [];
  }
}

// ── One-time migration: eventDate → eventStartDate + eventEndDate ──────────────

export async function migrateTeqfEventsToDateRange(): Promise<{
  success: boolean; updated: number; skipped: number; error?: string;
}> {
  if (!firestore) return { success: false, updated: 0, skipped: 0, error: 'Database non disponibile.' };
  try {
    const snap = await col().get();
    const BATCH = 400;
    let batch = firestore.batch();
    let count = 0;
    let skipped = 0;
    let batchCount = 0;

    for (const d of snap.docs) {
      const data = d.data();
      if (data.eventStartDate) { skipped++; continue; }  // already migrated
      if (!data.eventDate) { skipped++; continue; }       // nothing to migrate
      batch.update(col().doc(d.id), {
        eventStartDate: data.eventDate,
        eventEndDate: data.eventDate,
      });
      count++;
      batchCount++;
      if (batchCount >= BATCH) {
        await batch.commit();
        batch = firestore.batch();
        batchCount = 0;
      }
    }
    if (batchCount > 0) await batch.commit();
    revalidatePath('/planner/calendar');
    return { success: true, updated: count, skipped };
  } catch (e: any) {
    return { success: false, updated: 0, skipped: 0, error: e.message };
  }
}
