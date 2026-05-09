import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth, firestore } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !firestore) {
      return NextResponse.json({ error: 'Firebase Admin no configurado.' }, { status: 500 });
    }

    const body = await req.json();
    const { email, eventId } = body as { email: string; eventId: string };

    if (!email || !eventId) {
      return NextResponse.json({ error: 'Email y eventId son obligatorios.' }, { status: 400 });
    }

    // Verify caller is an admin
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
      return NextResponse.json({ error: 'Sin permisos.' }, { status: 403 });
    }

    // Look up user by email
    let targetUser;
    try {
      targetUser = await adminAuth.getUserByEmail(email);
    } catch {
      return NextResponse.json({ error: `No se encontró usuario con email: ${email}` }, { status: 404 });
    }

    const assignmentId = `${targetUser.uid}_${eventId}`;
    const ref = firestore.collection('cashControlAssignments').doc(assignmentId);
    const existing = await ref.get();
    if (existing.exists) {
      return NextResponse.json({ success: true, message: 'Usuario ya asignado.' });
    }

    await ref.set({
      userId: targetUser.uid,
      eventId,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Audit
    await firestore.collection('cashControlAudit').add({
      eventId,
      userId: targetUser.uid,
      action: 'assign_user',
      metadata: { email, assignedBy: decoded.uid },
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[assign-user]', err);
    const message = err instanceof Error ? err.message : 'Error interno.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
