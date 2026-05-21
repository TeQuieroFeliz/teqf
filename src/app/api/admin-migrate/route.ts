import { auth, firestore } from '@/firebase/server';
import { NextResponse } from 'next/server';

// One-time migration: re-keys /admins docs from auto-IDs to Firebase UID.
// Call once after deploy, then remove this route.
export async function POST() {
  if (!firestore || !auth) {
    return NextResponse.json({ error: 'Firebase non disponibile' }, { status: 500 });
  }

  const snap = await firestore.collection('admins').get();
  const results: { email: string; status: string }[] = [];

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const email: string = data.email;

    // Skip docs already keyed by a UID (length 28, no @ sign)
    if (docSnap.id.length === 28 && !docSnap.id.includes('@')) {
      results.push({ email, status: 'already_uid_keyed' });
      continue;
    }

    try {
      const firebaseUser = await auth.getUserByEmail(email);
      const uid = firebaseUser.uid;

      // Write new doc keyed by UID, delete old auto-ID doc
      await firestore.collection('admins').doc(uid).set(data);
      await docSnap.ref.delete();
      results.push({ email, status: `migrated → ${uid}` });
    } catch (err: any) {
      results.push({ email, status: `error: ${err.message}` });
    }
  }

  return NextResponse.json({ migrated: results.length, results });
}
