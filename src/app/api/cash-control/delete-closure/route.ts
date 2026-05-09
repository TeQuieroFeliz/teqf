import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth, firestore } from '@/firebase/server';
import { checkCashControlAdminAuth } from '@/lib/server/checkAdminAuth';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !firestore) {
      return NextResponse.json({ error: 'Firebase Admin no configurado.' }, { status: 500 });
    }

    const { closureId } = (await req.json()) as { closureId: string };
    if (!closureId) return NextResponse.json({ error: 'closureId requerido.' }, { status: 400 });

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return NextResponse.json({ error: 'Token requerido.' }, { status: 401 });

    const caller = await checkCashControlAdminAuth(token);
    if (!caller.isAuthorized) {
      return NextResponse.json({ error: 'Sin permisos de administrador.' }, { status: 403 });
    }

    const closureRef = firestore!.collection('cashControlClosures').doc(closureId);
    const snap = await closureRef.get();
    if (!snap.exists) return NextResponse.json({ error: 'Cierre no encontrado.' }, { status: 404 });

    const data = snap.data()!;
    await closureRef.delete();

    await firestore!.collection('cashControlAudit').add({
      eventId: data.eventId,
      userId: data.userId,
      action: 'delete_closure',
      metadata: { deletedBy: caller.uid, closureId },
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[delete-closure]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno.' },
      { status: 500 }
    );
  }
}
