'use server';

import { firestore } from '@/firebase/server';
import {
  CatalogItemRef,
  CustomItem,
  FileRecord,
  InspirationPhoto,
  WeddingFunction,
} from '@/lib/wedding-types';
import { revalidatePath } from 'next/cache';
import { recalculateWeddingDates } from './weddings';

const wCol = () => firestore!.collection('weddings');
const fnCol = (wId: string) => wCol().doc(wId).collection('functions');

function serializeFunction(doc: FirebaseFirestore.DocumentSnapshot): WeddingFunction {
  const d = doc.data()!;
  const toStr = (v: any) =>
    v && typeof v.toDate === 'function' ? v.toDate().toISOString() : (v ?? '');
  return {
    id: doc.id,
    functionType: d.functionType ?? 'custom',
    functionName: d.functionName ?? '',
    order: d.order ?? 1,
    date: d.date ?? '',
    setupStartTime: d.setupStartTime ?? '',
    venueEntryTime: d.venueEntryTime ?? '',
    eventStartTime: d.eventStartTime ?? '',
    eventEndTime: d.eventEndTime ?? '',
    breakdownTime: d.breakdownTime ?? '',
    venue: d.venue ?? '',
    colorPalette: d.colorPalette ?? [],
    layoutFiles: d.layoutFiles ?? [],
    moodboardFiles: d.moodboardFiles ?? [],
    inspirationPhotos: d.inspirationPhotos ?? [],
    catalogItems: d.catalogItems ?? [],
    customItems: d.customItems ?? [],
    generalNotes: d.generalNotes ?? '',
    createdAt: toStr(d.createdAt),
    updatedAt: toStr(d.updatedAt),
  };
}

export async function getFunctions(
  weddingId: string,
): Promise<{ success: boolean; data?: WeddingFunction[]; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  try {
    const snap = await fnCol(weddingId).orderBy('date', 'asc').get();
    return { success: true, data: snap.docs.map(serializeFunction) };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getFunction(
  weddingId: string,
  functionId: string,
): Promise<{ success: boolean; data?: WeddingFunction; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  try {
    const doc = await fnCol(weddingId).doc(functionId).get();
    if (!doc.exists) return { success: false, error: 'Not found.' };
    return { success: true, data: serializeFunction(doc) };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function createFunction(
  weddingId: string,
  data: {
    functionType: string; functionName: string; order: number;
    date: string; setupStartTime: string; venueEntryTime: string;
    eventStartTime: string; eventEndTime: string; breakdownTime: string;
    venue: string; colorPalette: string[]; generalNotes: string;
  },
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  try {
    const now = new Date().toISOString();
    const ref = await fnCol(weddingId).add({
      ...data,
      layoutFiles: [], moodboardFiles: [], inspirationPhotos: [],
      catalogItems: [], customItems: [],
      createdAt: now, updatedAt: now,
    });
    await recalculateWeddingDates(weddingId);
    revalidatePath(`/planner/weddings/${weddingId}`);
    return { success: true, id: ref.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateFunction(
  weddingId: string,
  functionId: string,
  data: {
    functionType: string; functionName: string; order: number;
    date: string; setupStartTime: string; venueEntryTime: string;
    eventStartTime: string; eventEndTime: string; breakdownTime: string;
    venue: string; colorPalette: string[]; generalNotes: string;
  },
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  try {
    await fnCol(weddingId).doc(functionId).update({
      ...data, updatedAt: new Date().toISOString(),
    });
    await recalculateWeddingDates(weddingId);
    revalidatePath(`/planner/weddings/${weddingId}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteFunction(
  weddingId: string,
  functionId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  try {
    await fnCol(weddingId).doc(functionId).delete();
    await recalculateWeddingDates(weddingId);
    revalidatePath(`/planner/weddings/${weddingId}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── File management ───────────────────────────────────────────────────────────

type FileArrayKey = 'layoutFiles' | 'moodboardFiles' | 'inspirationPhotos';

export async function addFileToFunction(
  weddingId: string,
  functionId: string,
  arrayKey: FileArrayKey,
  record: FileRecord | InspirationPhoto,
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  try {
    const doc = await fnCol(weddingId).doc(functionId).get();
    const existing: any[] = doc.data()?.[arrayKey] ?? [];
    await fnCol(weddingId).doc(functionId).update({
      [arrayKey]: [...existing, record],
      updatedAt: new Date().toISOString(),
    });
    revalidatePath(`/planner/weddings/${weddingId}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function removeFileFromFunction(
  weddingId: string,
  functionId: string,
  arrayKey: FileArrayKey,
  fileId: string,
): Promise<{ success: boolean; storagePath?: string; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  try {
    const doc = await fnCol(weddingId).doc(functionId).get();
    const existing: any[] = doc.data()?.[arrayKey] ?? [];
    const target = existing.find(f => f.id === fileId);
    await fnCol(weddingId).doc(functionId).update({
      [arrayKey]: existing.filter(f => f.id !== fileId),
      updatedAt: new Date().toISOString(),
    });
    revalidatePath(`/planner/weddings/${weddingId}`);
    return { success: true, storagePath: target?.storagePath };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateInspirationCaption(
  weddingId: string,
  functionId: string,
  photoId: string,
  caption: string,
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  try {
    const doc = await fnCol(weddingId).doc(functionId).get();
    const photos: any[] = doc.data()?.inspirationPhotos ?? [];
    const updated = photos.map(p => p.id === photoId ? { ...p, caption } : p);
    await fnCol(weddingId).doc(functionId).update({
      inspirationPhotos: updated, updatedAt: new Date().toISOString(),
    });
    revalidatePath(`/planner/weddings/${weddingId}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Catalog & Custom Items ────────────────────────────────────────────────────

export async function updateCatalogItems(
  weddingId: string,
  functionId: string,
  items: CatalogItemRef[],
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  try {
    await fnCol(weddingId).doc(functionId).update({
      catalogItems: items, updatedAt: new Date().toISOString(),
    });
    revalidatePath(`/planner/weddings/${weddingId}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function addCustomItem(
  weddingId: string,
  functionId: string,
  item: CustomItem,
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  try {
    const doc = await fnCol(weddingId).doc(functionId).get();
    const existing: CustomItem[] = doc.data()?.customItems ?? [];
    await fnCol(weddingId).doc(functionId).update({
      customItems: [...existing, item], updatedAt: new Date().toISOString(),
    });
    revalidatePath(`/planner/weddings/${weddingId}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateCustomItem(
  weddingId: string,
  functionId: string,
  item: CustomItem,
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  try {
    const doc = await fnCol(weddingId).doc(functionId).get();
    const existing: CustomItem[] = doc.data()?.customItems ?? [];
    await fnCol(weddingId).doc(functionId).update({
      customItems: existing.map(c => c.id === item.id ? item : c),
      updatedAt: new Date().toISOString(),
    });
    revalidatePath(`/planner/weddings/${weddingId}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function removeCustomItem(
  weddingId: string,
  functionId: string,
  itemId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  try {
    const doc = await fnCol(weddingId).doc(functionId).get();
    const existing: CustomItem[] = doc.data()?.customItems ?? [];
    await fnCol(weddingId).doc(functionId).update({
      customItems: existing.filter(c => c.id !== itemId),
      updatedAt: new Date().toISOString(),
    });
    revalidatePath(`/planner/weddings/${weddingId}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
