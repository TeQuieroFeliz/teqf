'use server';

// Category management for the Floral Inspiration board.
//
// Inspiration categories are stored as plain strings on each `floralInspiration`
// document (there is no separate meta document like furniture). Managing a
// category therefore means reassigning the string on every item that uses it:
//   • rename  → move every item from "A" to a brand-new name "B"
//   • merge   → same operation where "B" already exists (items get consolidated)
//   • delete  → reassign every item to another existing category
// This lets an operator fix a mis-categorised item or consolidate duplicates,
// mirroring furniture's "Manage Categories" behaviour, adapted to the simpler
// string-based model (no bilingual labels).

import { firestore } from '@/firebase/server';
import { revalidatePath } from 'next/cache';

const col = () => firestore!.collection('floralInspiration');

async function reassignCategory(from: string, to: string): Promise<number> {
  const snap = await col().where('category', '==', from).get();
  if (snap.empty) return 0;
  const now = new Date().toISOString();

  // Firestore batches are capped at 500 writes — chunk to stay safe.
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 450) {
    const batch = firestore!.batch();
    for (const d of docs.slice(i, i + 450)) {
      batch.update(d.ref, { category: to, updatedAt: now });
    }
    await batch.commit();
  }
  return docs.length;
}

/**
 * Rename (or merge) a category: every item with `from` is set to `to`.
 * If `to` already exists on other items, this behaves as a merge.
 */
export async function renameInspirationCategory(
  from: string,
  to: string
): Promise<{ success: boolean; moved: number; error?: string }> {
  if (!firestore) return { success: false, moved: 0, error: 'Database non disponibile.' };
  const f = from.trim();
  const t = to.trim();
  if (!f || !t) return { success: false, moved: 0, error: 'Nombre inválido.' };
  if (f === t) return { success: true, moved: 0 };
  try {
    const moved = await reassignCategory(f, t);
    revalidatePath('/planner/flowers');
    revalidatePath('/flowers');
    return { success: true, moved };
  } catch (e: unknown) {
    return { success: false, moved: 0, error: e instanceof Error ? e.message : 'Error.' };
  }
}

/**
 * Delete a category by reassigning all its items to `reassignTo`.
 * Once no item references the old name it disappears from the board.
 */
export async function deleteInspirationCategory(
  key: string,
  reassignTo: string
): Promise<{ success: boolean; moved: number; error?: string }> {
  if (!firestore) return { success: false, moved: 0, error: 'Database non disponibile.' };
  const k = key.trim();
  const to = reassignTo.trim();
  if (!k) return { success: false, moved: 0, error: 'Nombre inválido.' };
  if (!to) return { success: false, moved: 0, error: 'Selecciona una categoría destino.' };
  if (k === to) return { success: false, moved: 0, error: 'La categoría destino debe ser diferente.' };
  try {
    const moved = await reassignCategory(k, to);
    revalidatePath('/planner/flowers');
    revalidatePath('/flowers');
    return { success: true, moved };
  } catch (e: unknown) {
    return { success: false, moved: 0, error: e instanceof Error ? e.message : 'Error.' };
  }
}
