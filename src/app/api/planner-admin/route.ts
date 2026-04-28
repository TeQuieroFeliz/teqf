import { auth } from '@/firebase/server';
import { setPlannerMustChangePassword } from '@/actions/planner/planner-auth';
import { NextResponse } from 'next/server';

// POST — create a Firebase Auth user for a planner with a temp password
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'email e password obbligatorie' }, { status: 400 });
    }

    // Check if user already exists in Firebase Auth
    let uid: string;
    try {
      const existing = await auth!.getUserByEmail(email);
      // User exists — update password
      await auth!.updateUser(existing.uid, { password });
      uid = existing.uid;
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        // Create new Firebase Auth user
        const created = await auth!.createUser({ email, password });
        uid = created.uid;
      } else {
        throw err;
      }
    }

    // Set mustChangePassword flag in Firestore
    await setPlannerMustChangePassword(email, true);

    return NextResponse.json({ success: true, uid });
  } catch (err: any) {
    console.error('[planner-admin POST]', err);
    return NextResponse.json({ error: err.message ?? 'Errore server' }, { status: 500 });
  }
}
