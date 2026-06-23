'use server';

import { firestore } from '@/firebase/server';
import { FurnitureItem } from '@/lib/planner-types';
import {
  CustomFurnitureCategory,
  PREDEFINED_CATEGORY_KEYS,
} from '@/lib/furniture-categories';
import { revalidatePath } from 'next/cache';

const col = () => firestore!.collection('furnitureItems');
const metaDoc = () => firestore!.collection('furnitureMeta').doc('config');

function serialize(doc: FirebaseFirestore.DocumentSnapshot): FurnitureItem {
  const d = doc.data()!;
  const toStr = (v: any) => (v && typeof v.toDate === 'function' ? v.toDate().toISOString() : (v ?? ''));
  return {
    id: doc.id,
    name: d.name ?? '',
    category: d.category ?? '',
    price: d.price ?? 0,
    currency: d.currency ?? 'MXN',
    cities: d.cities ?? [],
    images: d.images ?? [],
    description: d.description ?? '',
    published: d.published ?? false,
    createdAt: toStr(d.createdAt),
    updatedAt: toStr(d.updatedAt),
  };
}

const DEFAULT_CITIES = ['Ciudad de México', 'Cancún'];

export async function getFurnitureMeta(): Promise<{
  categories: string[];
  cities: string[];
  customCategories: CustomFurnitureCategory[];
}> {
  if (!firestore) return { categories: PREDEFINED_CATEGORY_KEYS, cities: DEFAULT_CITIES, customCategories: [] };
  const doc = await metaDoc().get();
  if (!doc.exists) {
    const defaults = { categories: PREDEFINED_CATEGORY_KEYS, cities: DEFAULT_CITIES, customCategories: [] };
    await metaDoc().set(defaults);
    return defaults;
  }
  const data = doc.data()!;
  return {
    categories: data.categories ?? PREDEFINED_CATEGORY_KEYS,
    cities: data.cities ?? DEFAULT_CITIES,
    customCategories: data.customCategories ?? [],
  };
}

export async function saveFurnitureMeta(
  categories: string[],
  cities: string[]
): Promise<void> {
  if (!firestore) return;
  await metaDoc().set({ categories, cities }, { merge: true });
}

export async function saveCustomCategories(
  customCategories: CustomFurnitureCategory[]
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'Database non disponibile.' };
  try {
    const allKeys = [...PREDEFINED_CATEGORY_KEYS, ...customCategories.map(c => c.key)];
    await metaDoc().set({ categories: allKeys, customCategories }, { merge: true });
    revalidatePath('/planner/furniture');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getFurnitureItems(): Promise<FurnitureItem[]> {
  if (!firestore) return [];
  const snap = await col().orderBy('createdAt', 'desc').get();
  return snap.docs.map(serialize);
}

export async function getFurnitureItem(id: string): Promise<FurnitureItem | null> {
  if (!firestore || id === 'new') return null;
  const doc = await col().doc(id).get();
  if (!doc.exists) return null;
  return serialize(doc);
}

export async function getPublishedFurnitureItems(): Promise<FurnitureItem[]> {
  if (!firestore) return [];
  const snap = await col().where('published', '==', true).get();
  return snap.docs
    .map(serialize)
    .sort((a, b) => a.category.localeCompare(b.category));
}

export async function saveFurnitureItem(
  input: Omit<FurnitureItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!firestore) return { success: false, error: 'Database non disponibile.' };
  try {
    const now = new Date().toISOString();
    const { id, ...data } = input;
    if (id) {
      await col().doc(id).update({ ...data, updatedAt: now });
      revalidatePath('/planner/furniture');
      return { success: true, id };
    }
    const docRef = await col().add({ ...data, createdAt: now, updatedAt: now });
    revalidatePath('/planner/furniture');
    return { success: true, id: docRef.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateFurnitureImages(
  id: string,
  images: string[]
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'Database non disponibile.' };
  try {
    await col().doc(id).update({ images, updatedAt: new Date().toISOString() });
    revalidatePath('/planner/furniture');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteFurnitureItem(id: string): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'Database non disponibile.' };
  try {
    await col().doc(id).delete();
    revalidatePath('/planner/furniture');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Category management ───────────────────────────────────────────────────────

export async function mergeFurnitureCategory(
  fromKey: string,
  toKey: string,
): Promise<{ success: boolean; moved: number; error?: string }> {
  if (!firestore) return { success: false, moved: 0, error: 'Database non disponibile.' };
  try {
    const snap = await col().where('category', '==', fromKey).get();
    if (snap.empty) return { success: true, moved: 0 };
    const BATCH = 400;
    let batch = firestore.batch();
    let count = 0;
    let batchCount = 0;
    const now = new Date().toISOString();
    for (const d of snap.docs) {
      batch.update(col().doc(d.id), { category: toKey, updatedAt: now });
      count++;
      batchCount++;
      if (batchCount >= BATCH) {
        await batch.commit();
        batch = firestore.batch();
        batchCount = 0;
      }
    }
    if (batchCount > 0) await batch.commit();
    revalidatePath('/planner/furniture');
    return { success: true, moved: count };
  } catch (e: any) {
    return { success: false, moved: 0, error: e.message };
  }
}

export async function deleteFurnitureCategoryFromMeta(
  key: string,
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'Database non disponibile.' };
  try {
    const snap = await metaDoc().get();
    const data = snap.exists ? snap.data()! : {};
    const categories: string[] = (data.categories ?? []).filter((k: string) => k !== key);
    const customCategories: CustomFurnitureCategory[] = (data.customCategories ?? []).filter(
      (c: CustomFurnitureCategory) => c.key !== key,
    );
    await metaDoc().set({ categories, customCategories }, { merge: true });
    revalidatePath('/planner/furniture');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── One-time category migration ───────────────────────────────────────────────

const LABEL_TO_KEY: Record<string, string> = {
  'sedie':           'chairs',
  'sedie cocktail':  'cocktail_chairs',
  'tavoli':          'tables',
  'tovaglie':        'linens',
  'cocktail table':  'cocktail_table',
  'bar & back bar':  'bar_back_bar',
  'sala lounge':     'sala_lounge',
};

export type MigrationGroup = {
  oldLabel: string;
  newKey: string | null;
  count: number;
  action: 'update' | 'alreadyKey' | 'unknown';
};

export type MigrationDryRunResult = {
  groups: MigrationGroup[];
  totalToUpdate: number;
  totalToSkip: number;
  totalDocs: number;
  metaCurrent: string[];
};

export async function getMigrationDryRun(): Promise<MigrationDryRunResult> {
  if (!firestore) return { groups: [], totalToUpdate: 0, totalToSkip: 0, totalDocs: 0, metaCurrent: [] };

  const [snap, metaSnap] = await Promise.all([col().get(), metaDoc().get()]);

  const counts = new Map<string, number>();
  for (const d of snap.docs) {
    const raw = (d.data().category ?? '').trim();
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }

  const metaCurrent: string[] = metaSnap.exists ? (metaSnap.data()?.categories ?? []) : [];
  const groups: MigrationGroup[] = [];
  let totalToUpdate = 0;
  let totalToSkip = 0;

  for (const [oldLabel, count] of [...counts.entries()].sort()) {
    const newKey = LABEL_TO_KEY[oldLabel.toLowerCase()] ?? null;
    if (newKey && newKey !== oldLabel) {
      groups.push({ oldLabel, newKey, count, action: 'update' });
      totalToUpdate += count;
    } else if (PREDEFINED_CATEGORY_KEYS.includes(oldLabel)) {
      groups.push({ oldLabel, newKey: oldLabel, count, action: 'alreadyKey' });
      totalToSkip += count;
    } else {
      groups.push({ oldLabel, newKey: null, count, action: 'unknown' });
      totalToSkip += count;
    }
  }

  return { groups, totalToUpdate, totalToSkip, totalDocs: snap.size, metaCurrent };
}

export async function executeFurnitureMigration(): Promise<{ success: boolean; updated: number; error?: string }> {
  if (!firestore) return { success: false, updated: 0, error: 'Database non disponibile.' };
  try {
    const snap = await col().get();
    const BATCH_SIZE = 400;
    let batch = firestore.batch();
    let count = 0;
    let batchCount = 0;

    for (const d of snap.docs) {
      const raw = (d.data().category ?? '').trim();
      const newKey = LABEL_TO_KEY[raw.toLowerCase()] ?? null;
      if (newKey && newKey !== raw) {
        batch.update(col().doc(d.id), { category: newKey });
        count++;
        batchCount++;
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batch = firestore.batch();
          batchCount = 0;
        }
      }
    }
    if (batchCount > 0) await batch.commit();

    await metaDoc().set({ categories: PREDEFINED_CATEGORY_KEYS, customCategories: [] }, { merge: true });
    revalidatePath('/planner/furniture');
    return { success: true, updated: count };
  } catch (e: any) {
    return { success: false, updated: 0, error: e.message };
  }
}
