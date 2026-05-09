import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth, firestore } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !firestore) {
      return NextResponse.json({ error: 'Firebase Admin no configurado.' }, { status: 500 });
    }

    const body = await req.json();
    const {
      eventId,
      userId,
      closedBy,
      totalReceived,
      totalSpent,
      finalBalance,
      totalWithoutSupport,
    } = body as {
      eventId: string;
      userId: string;
      closedBy: string;
      totalReceived: number;
      totalSpent: number;
      finalBalance: number;
      totalWithoutSupport: number;
    };

    if (!eventId || !userId || !closedBy) {
      return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
    }

    // Verify caller is the user themselves or an admin
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Token requerido.' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const isOwner = decoded.uid === userId;
    const isCallerAdmin = decoded.cashControlRole === 'admin';

    if (!isOwner && !isCallerAdmin) {
      return NextResponse.json({ error: 'Sin permisos.' }, { status: 403 });
    }

    // Check if a closure already exists
    const existingSnap = await firestore
      .collection('cashControlClosures')
      .where('userId', '==', userId)
      .where('eventId', '==', eventId)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      const existing = existingSnap.docs[0].data();
      if (!existing.isReopened) {
        return NextResponse.json({ error: 'La cuenta ya está cerrada.' }, { status: 409 });
      }
      // Reclose a reopened account
      await existingSnap.docs[0].ref.update({
        closedBy,
        totalReceived,
        totalSpent,
        finalBalance,
        totalWithoutSupport,
        isReopened: false,
        closedAt: FieldValue.serverTimestamp(),
        reopenedAt: null,
        reopenedBy: null,
      });
    } else {
      await firestore.collection('cashControlClosures').add({
        eventId,
        userId,
        closedBy,
        totalReceived,
        totalSpent,
        finalBalance,
        totalWithoutSupport,
        emailSent: false,
        isReopened: false,
        closedAt: FieldValue.serverTimestamp(),
        reopenedAt: null,
        reopenedBy: null,
      });
    }

    // Audit log
    await firestore.collection('cashControlAudit').add({
      eventId,
      userId,
      action: 'close_account',
      metadata: { totalReceived, totalSpent, finalBalance, totalWithoutSupport, closedBy },
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[close-account]', err);
    const message = err instanceof Error ? err.message : 'Error interno.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
