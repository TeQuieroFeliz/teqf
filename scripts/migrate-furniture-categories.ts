/**
 * One-time migration: map old Italian/mixed category labels to stable keys.
 *
 * DRY RUN (default):  npx tsx scripts/migrate-furniture-categories.ts
 * WRITE:              npx tsx scripts/migrate-furniture-categories.ts --write
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

// Mapping: normalised (lowercase + trim) old label → new key
const LABEL_TO_KEY: Record<string, string> = {
  'sedie':          'chairs',
  'tovaglie':       'tables',        // ⚠️  were mislabelled — they are tables
  'cocktail table': 'cocktail_table',
  'bar & back bar': 'bar_back_bar',
  'sala lounge':    'sala_lounge',
  // add more if discovered
};

const PREDEFINED_CATEGORY_KEYS = ['bar_back_bar', 'cocktail_table', 'sala_lounge', 'chairs', 'tables'];

async function run() {
  const dryRun = !process.argv.includes('--write');
  console.log(`\n${'='.repeat(60)}`);
  console.log(dryRun ? '  DRY RUN — nessuna scrittura su Firestore' : '  WRITE — scrittura su Firestore');
  console.log('='.repeat(60));

  // ── Fetch all furniture items ──────────────────────────────────────────────
  const snap = await db.collection('furnitureItems').get();
  console.log(`\nTotale documenti furnitureItems: ${snap.size}`);

  // Group by old category value
  type Group = { newKey: string | null; docs: string[] };
  const groups = new Map<string, Group>();

  for (const doc of snap.docs) {
    const raw: string = (doc.data().category ?? '').trim();
    const normalised = raw.toLowerCase();
    const newKey = LABEL_TO_KEY[normalised] ?? null;

    if (!groups.has(raw)) groups.set(raw, { newKey, docs: [] });
    groups.get(raw)!.docs.push(doc.id);
  }

  console.log('\n── Mappatura furnitureItems ──────────────────────────────────');
  let toUpdate = 0;
  let toSkip   = 0;

  for (const [oldLabel, { newKey, docs }] of [...groups.entries()].sort()) {
    if (newKey && newKey !== oldLabel) {
      console.log(`  "${oldLabel}"  (${docs.length} doc)  →  "${newKey}"`);
      toUpdate += docs.length;
    } else if (PREDEFINED_CATEGORY_KEYS.includes(oldLabel)) {
      console.log(`  "${oldLabel}"  (${docs.length} doc)  →  già una key valida, skip`);
      toSkip += docs.length;
    } else {
      console.log(`  "${oldLabel}"  (${docs.length} doc)  →  ⚠️  NESSUNA MAPPATURA — lasciato invariato`);
      toSkip += docs.length;
    }
  }
  console.log(`\nTotale da aggiornare: ${toUpdate} | Skip/già OK: ${toSkip}`);

  // ── Fetch furnitureMeta/config ────────────────────────────────────────────
  const metaSnap = await db.collection('furnitureMeta').doc('config').get();
  const metaCats: string[] = metaSnap.exists ? (metaSnap.data()?.categories ?? []) : [];

  console.log('\n── Mappatura furnitureMeta/config.categories ─────────────────');
  console.log('  Attuale:', JSON.stringify(metaCats));
  console.log('  →  dopo:', JSON.stringify(PREDEFINED_CATEGORY_KEYS));

  if (dryRun) {
    console.log('\n✓  DRY RUN completato. Nessuna scrittura effettuata.');
    console.log('   Per eseguire la migrazione reale: npx tsx scripts/migrate-furniture-categories.ts --write\n');
    return;
  }

  // ── Write ──────────────────────────────────────────────────────────────────
  console.log('\nAvvio scrittura...');
  const BATCH_SIZE = 400;
  let batch = db.batch();
  let count = 0;

  for (const [oldLabel, { newKey, docs }] of groups.entries()) {
    if (!newKey || newKey === oldLabel || PREDEFINED_CATEGORY_KEYS.includes(oldLabel)) continue;
    for (const docId of docs) {
      batch.update(db.collection('furnitureItems').doc(docId), { category: newKey });
      count++;
      if (count % BATCH_SIZE === 0) {
        await batch.commit();
        batch = db.batch();
        console.log(`  ...${count} documenti aggiornati`);
      }
    }
  }
  if (count % BATCH_SIZE !== 0) await batch.commit();

  // Update furnitureMeta/config
  await db.collection('furnitureMeta').doc('config').set(
    { categories: PREDEFINED_CATEGORY_KEYS, customCategories: [] },
    { merge: true }
  );

  console.log(`\n✓  Migrazione completata: ${count} furnitureItems aggiornati.`);
  console.log('   furnitureMeta/config.categories aggiornato ai nuovi key.\n');
}

run().catch((err) => { console.error(err); process.exit(1); });
