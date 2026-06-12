// Reopen a closed TeQF project cash-control account — superAdmin only
import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth, firestore } from '@/firebase/server';

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !firestore) {
      return NextResponse.json({ error: 'Firebase Admin no configurado.' }, { status: 500 });
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return NextResponse.json({ error: 'Token requerido.' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);

    // Only superAdmin may reopen
    const adminSnap = await firestore
      .collection('admins')
      .where('email', '==', decoded.email)
      .where('active', '==', true)
      .limit(1)
      .get();

    const isSuperAdmin = !adminSnap.empty && adminSnap.docs[0].data().role === 'superadmin';
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Sin permisos para reabrir.' }, { status: 403 });
    }

    const { projectId } = await req.json() as { projectId: string };
    if (!projectId) {
      return NextResponse.json({ error: 'projectId requerido.' }, { status: 400 });
    }

    const projectRef  = firestore.collection('teqfProjects').doc(projectId);
    const projectSnap = await projectRef.get();

    if (!projectSnap.exists) {
      return NextResponse.json({ error: 'Proyecto no encontrado.' }, { status: 404 });
    }
    if (!projectSnap.data()?.isClosed) {
      return NextResponse.json({ error: 'El proyecto ya está abierto.' }, { status: 409 });
    }

    await projectRef.update({
      isClosed:  false,
      closedAt:  null,
      closedBy:  null,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });

  } catch (err: unknown) {
    console.error('[teqf-reopen]', err);
    const message = err instanceof Error ? err.message : 'Error interno.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
