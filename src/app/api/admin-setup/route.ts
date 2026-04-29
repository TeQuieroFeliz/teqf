import { auth } from '@/firebase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'email e password obbligatorie' }, { status: 400 });
    }
    if (!auth) {
      return NextResponse.json({ error: 'Firebase Auth non disponibile' }, { status: 500 });
    }

    let uid: string;
    try {
      const existing = await auth.getUserByEmail(email);
      await auth.updateUser(existing.uid, { password });
      uid = existing.uid;
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        const created = await auth.createUser({ email, password });
        uid = created.uid;
      } else {
        throw err;
      }
    }

    return NextResponse.json({ success: true, uid });
  } catch (err: any) {
    console.error('[admin-setup POST]', err);
    return NextResponse.json({ error: err.message ?? 'Errore server' }, { status: 500 });
  }
}
