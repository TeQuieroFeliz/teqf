import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth, firestore } from '@/firebase/server';
import { checkCashControlAdminAuth } from '@/lib/server/checkAdminAuth';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !firestore) {
      return NextResponse.json({ error: 'Firebase Admin no configurado.' }, { status: 500 });
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Token requerido.' }, { status: 401 });
    }

    const caller = await checkCashControlAdminAuth(token);
    const isAdmin = caller.isAuthorized;
    const isTeam = caller.cashControlRole === 'team';

    if (!isAdmin && !isTeam) {
      return NextResponse.json({ error: 'Sin permisos.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      eventCode,
      eventName = '',
      eventDate = '',
      location = '',
      eventType = 'evento',
      assignedUserIds = [],
    } = body as {
      eventCode: string;
      eventName?: string;
      eventDate?: string;
      location?: string;
      eventType?: 'evento' | 'gastos';
      assignedUserIds?: string[];
    };

    if (!eventCode?.trim()) {
      return NextResponse.json({ error: 'El código del evento es obligatorio.' }, { status: 400 });
    }

    const eventRef = await firestore.collection('cashControlEvents').add({
      eventCode: eventCode.trim(),
      eventName: eventName.trim(),
      eventDate: eventDate.trim(),
      location: location.trim(),
      eventType,
      status: 'active',
      createdBy: caller.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const eventId = eventRef.id;
    const uidsToAssign = isAdmin
      ? [...new Set(assignedUserIds as string[])]
      : [caller.uid];

    const batch = firestore.batch();
    for (const uid of uidsToAssign) {
      const assignRef = firestore
        .collection('cashControlAssignments')
        .doc(`${uid}_${eventId}`);
      batch.set(assignRef, {
        userId: uid,
        eventId,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();

    await firestore.collection('cashControlAudit').add({
      eventId,
      userId: caller.uid,
      action: 'create_event',
      metadata: { eventCode, assignedUserIds: uidsToAssign, role: caller.cashControlRole },
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, eventId });
  } catch (err: unknown) {
    console.error('[create-event]', err);
    const message = err instanceof Error ? err.message : 'Error interno.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
