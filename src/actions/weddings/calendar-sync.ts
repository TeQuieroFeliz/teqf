'use server';

import { firestore } from '@/firebase/server';
import { revalidatePath } from 'next/cache';

const wCol = () => firestore!.collection('weddings');
const calCol = () => firestore!.collection('teqf_events');

export async function syncWithTeqfCalendar(
  weddingId: string,
): Promise<{ success: boolean; calendarEventId?: string; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  try {
    const wDoc = await wCol().doc(weddingId).get();
    const w = wDoc.data();
    if (!w) return { success: false, error: 'Wedding not found.' };

    const now = new Date().toISOString();
    const start = w.startDate ?? '';
    const end = w.endDate ?? start;

    if (w.teqfCalendarEventId) {
      // Update existing calendar event
      await calCol().doc(w.teqfCalendarEventId).update({
        eventName: w.weddingName,
        location: w.primaryLocation ?? '',
        eventStartDate: start,
        eventEndDate: end,
        updatedAt: now,
      });
      revalidatePath(`/planner/weddings/${weddingId}`);
      revalidatePath('/planner/calendar');
      return { success: true, calendarEventId: w.teqfCalendarEventId };
    } else {
      // Create new calendar event linked to this wedding
      const ref = await calCol().add({
        eventName: w.weddingName,
        location: w.primaryLocation ?? '',
        eventStartDate: start,
        eventEndDate: end,
        xbEventId: weddingId,
        notes: '',
        createdBy: w.createdBy ?? '',
        createdAt: now,
        updatedAt: now,
      });
      await wCol().doc(weddingId).update({
        teqfCalendarEventId: ref.id,
        updatedAt: now,
      });
      revalidatePath(`/planner/weddings/${weddingId}`);
      revalidatePath('/planner/calendar');
      return { success: true, calendarEventId: ref.id };
    }
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function unlinkFromCalendar(
  weddingId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  try {
    const wDoc = await wCol().doc(weddingId).get();
    const w = wDoc.data();
    if (!w) return { success: false, error: 'Wedding not found.' };

    if (w.teqfCalendarEventId) {
      // Remove xbEventId from calendar event
      await calCol().doc(w.teqfCalendarEventId).update({ xbEventId: null });
    }
    await wCol().doc(weddingId).update({
      teqfCalendarEventId: null,
      updatedAt: new Date().toISOString(),
    });
    revalidatePath(`/planner/weddings/${weddingId}`);
    revalidatePath('/planner/calendar');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
