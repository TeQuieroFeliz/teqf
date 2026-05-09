import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth, firestore } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !firestore) {
      return NextResponse.json({ error: 'Firebase Admin no configurado.' }, { status: 500 });
    }

    const body = await req.json();
    const { closureId, reopenedBy } = body as { closureId: string; reopenedBy: string };

    if (!closureId || !reopenedBy) {
      return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
    }

    // Verify caller is a cashControlAdmin or website admin
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Token requerido.' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const isCallerCashControlAdmin = decoded.cashControlRole === 'admin';

    let isCallerWebAdmin = false;
    if (!isCallerCashControlAdmin) {
      const adminSnap = await firestore
        .collection('admins')
        .where('email', '==', decoded.email)
        .where('active', '==', true)
        .limit(1)
        .get();
      if (!adminSnap.empty) {
        const r = adminSnap.docs[0].data().role as string;
        isCallerWebAdmin = r === 'superadmin' || r === 'admin';
      }
    }

    if (!isCallerCashControlAdmin && !isCallerWebAdmin) {
      return NextResponse.json({ error: 'Sin permisos para reabrir.' }, { status: 403 });
    }

    const closureRef = firestore.collection('cashControlClosures').doc(closureId);
    const closureSnap = await closureRef.get();

    if (!closureSnap.exists) {
      return NextResponse.json({ error: 'Cierre no encontrado.' }, { status: 404 });
    }

    const closureData = closureSnap.data()!;

    await closureRef.update({
      isReopened: true,
      reopenedAt: FieldValue.serverTimestamp(),
      reopenedBy,
    });

    // Audit log
    await firestore.collection('cashControlAudit').add({
      eventId: closureData.eventId ?? null,
      userId: closureData.userId,
      action: 'reopen_account',
      metadata: { closureId, reopenedBy },
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[reopen-account]', err);
    const message = err instanceof Error ? err.message : 'Error interno.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
