import { auth, firestore } from '@/firebase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();

    if (!userId && !email) {
      return NextResponse.json({ error: 'userId or email required' }, { status: 400 });
    }

    let uid: string = userId;

    // Resolve UID from email when only email is provided
    if (!uid && email) {
      const userRecord = await auth.getUserByEmail(email);
      uid = userRecord.uid;
    }

    // Delete from Firebase Auth (non-fatal if already gone)
    try {
      await auth.deleteUser(uid);
    } catch {
      // user may not exist in Auth — continue
    }

    // Delete from Firestore: users and planners (parallel, non-fatal)
    await Promise.allSettled([
      firestore.collection('users').doc(uid).delete(),
      firestore.collection('planners').doc(uid).delete(),
    ]);

    return NextResponse.json({ success: true, deletedUid: uid });
  } catch (error: any) {
    console.error('[delete-user]', error);
    return NextResponse.json({ error: error.message ?? 'Errore server' }, { status: 500 });
  }
}
