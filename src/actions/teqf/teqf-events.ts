'use server';

import { firestore } from '@/firebase/server';
import { revalidatePath } from 'next/cache';

export type TeqfCalendarEvent = {
  id: string;
  eventDate: string;   // YYYY-MM-DD
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
  return {
    id: doc.id,
    eventDate: d.eventDate ?? '',
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
  eventDate: string;
  eventName: string;
  location: string;
  notes: string;
  xbEventId: string | null;
  createdBy: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!firestore) return { success: false, error: 'Database non disponibile.' };
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
    eventDate: string;
    eventName: string;
    location: string;
    notes: string;
    xbEventId: string | null;
  },
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'Database non disponibile.' };
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
      return {
        id: d.id,
        label: parts.join(' – ') || d.id,
        date: firstDate,
      };
    });
  } catch {
    return [];
  }
}
