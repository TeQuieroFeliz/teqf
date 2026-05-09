import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth, firestore } from '@/firebase/server';
import { checkCashControlAdminAuth } from '@/lib/server/checkAdminAuth';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !firestore) {
      return NextResponse.json({ error: 'Firebase Admin no configurado.' }, { status: 500 });
    }

    const { eventId } = (await req.json()) as { eventId: string };
    if (!eventId) return NextResponse.json({ error: 'eventId requerido.' }, { status: 400 });

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return NextResponse.json({ error: 'Token requerido.' }, { status: 401 });

    const caller = await checkCashControlAdminAuth(token);
    if (!caller.isAuthorized) {
      return NextResponse.json({ error: 'Sin permisos de administrador.' }, { status: 403 });
    }

    const collections = [
      'cashControlAssignments',
      'cashControlMoneyReceived',
      'cashControlExpenses',
      'cashControlClosures',
      'cashControlAudit',
    ];

    // Delete all related documents in batches
    for (const col of collections) {
      const snap = await firestore.collection(col).where('eventId', '==', eventId).get();
      const chunks: FirebaseFirestore.QueryDocumentSnapshot[][] = [];
      for (let i = 0; i < snap.docs.length; i += 500) {
        chunks.push(snap.docs.slice(i, i + 500));
      }
      for (const chunk of chunks) {
        const batch = firestore.batch();
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    }

    // Delete the event document itself
    await firestore.collection('cashControlEvents').doc(eventId).delete();

    // Audit log for the deletion
    await firestore.collection('cashControlAudit').add({
      eventId,
      userId: caller.uid,
      action: 'delete_event',
      metadata: { deletedBy: caller.uid },
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[delete-event]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno.' },
      { status: 500 }
    );
  }
}
