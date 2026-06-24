'use server';

import { firestore } from '@/firebase/server';
import { WeddingVersion } from '@/lib/wedding-types';
import { revalidatePath } from 'next/cache';

const wCol = () => firestore!.collection('weddings');
const vCol = (wId: string) => wCol().doc(wId).collection('versions');

function serializeVersion(doc: FirebaseFirestore.DocumentSnapshot): WeddingVersion {
  const d = doc.data()!;
  const toStr = (v: any) =>
    v && typeof v.toDate === 'function' ? v.toDate().toISOString() : (v ?? '');
  return {
    id: doc.id,
    versionNumber: d.versionNumber ?? 0,
    savedBy: d.savedBy ?? '',
    savedByName: d.savedByName ?? '',
    savedAt: toStr(d.savedAt),
    versionLabel: d.versionLabel ?? '',
    changeDescription: d.changeDescription ?? '',
    isRestore: d.isRestore ?? false,
    restoredFromVersion: d.restoredFromVersion ?? null,
    weddingSnapshot: d.weddingSnapshot ?? {},
    functionsSnapshot: d.functionsSnapshot ?? [],
  };
}

export async function getVersions(
  weddingId: string,
): Promise<{ success: boolean; data?: WeddingVersion[]; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  try {
    const snap = await vCol(weddingId).orderBy('versionNumber', 'desc').get();
    return { success: true, data: snap.docs.map(serializeVersion) };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getVersion(
  weddingId: string,
  versionId: string,
): Promise<{ success: boolean; data?: WeddingVersion; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  try {
    const doc = await vCol(weddingId).doc(versionId).get();
    if (!doc.exists) return { success: false, error: 'Not found.' };
    return { success: true, data: serializeVersion(doc) };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function saveAsNewVersion(
  weddingId: string,
  data: { versionLabel: string; changeDescription: string; savedBy: string; savedByName: string },
): Promise<{ success: boolean; versionNumber?: number; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  if (!data.changeDescription.trim()) {
    return { success: false, error: 'Change description is required.' };
  }
  try {
    const wDoc = await wCol().doc(weddingId).get();
    const wData = wDoc.data();
    if (!wData) return { success: false, error: 'Wedding not found.' };

    const fnsSnap = await wCol().doc(weddingId).collection('functions').get();
    const functionsSnapshot = fnsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const versionNumber = (wData.currentVersionNumber ?? 0) + 1;
    const now = new Date().toISOString();

    await vCol(weddingId).add({
      versionNumber,
      savedBy: data.savedBy,
      savedByName: data.savedByName,
      savedAt: now,
      versionLabel: data.versionLabel.trim() || `v${versionNumber}`,
      changeDescription: data.changeDescription.trim(),
      isRestore: false,
      restoredFromVersion: null,
      weddingSnapshot: { ...wData, id: weddingId },
      functionsSnapshot,
    });

    await wCol().doc(weddingId).update({
      currentVersionNumber: versionNumber,
      updatedAt: now,
    });

    revalidatePath(`/planner/weddings/${weddingId}`);
    return { success: true, versionNumber };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function restoreVersion(
  weddingId: string,
  versionId: string,
  data: { restoredBy: string; restoredByName: string },
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'DB unavailable.' };
  try {
    const vDoc = await vCol(weddingId).doc(versionId).get();
    if (!vDoc.exists) return { success: false, error: 'Version not found.' };

    const v = vDoc.data()!;
    const wDoc = await wCol().doc(weddingId).get();
    const currentVersionNumber = (wDoc.data()?.currentVersionNumber ?? 0) + 1;
    const now = new Date().toISOString();

    // Overwrite wedding doc with snapshot
    const snap = v.weddingSnapshot ?? {};
    const { id: _id, ...snapData } = snap as any;
    await wCol().doc(weddingId).update({
      ...snapData,
      currentVersionNumber,
      updatedAt: now,
    });

    // Replace all functions with snapshot
    const fnsSnap = await wCol().doc(weddingId).collection('functions').get();
    const deleteBatch = firestore.batch();
    fnsSnap.docs.forEach(d => deleteBatch.delete(d.ref));
    await deleteBatch.commit();

    const fnsData: any[] = v.functionsSnapshot ?? [];
    if (fnsData.length > 0) {
      const addBatch = firestore.batch();
      for (const fn of fnsData) {
        const { id, ...fnData } = fn;
        const ref = id
          ? wCol().doc(weddingId).collection('functions').doc(id)
          : wCol().doc(weddingId).collection('functions').doc();
        addBatch.set(ref, { ...fnData, updatedAt: now });
      }
      await addBatch.commit();
    }

    // Record restore version
    await vCol(weddingId).add({
      versionNumber: currentVersionNumber,
      savedBy: data.restoredBy,
      savedByName: data.restoredByName,
      savedAt: now,
      versionLabel: `Restored from v${v.versionNumber}`,
      changeDescription: `Restored from version ${v.versionNumber}: ${v.versionLabel || ''}`.trim(),
      isRestore: true,
      restoredFromVersion: v.versionNumber,
      weddingSnapshot: snap,
      functionsSnapshot: fnsData,
    });

    revalidatePath(`/planner/weddings/${weddingId}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
