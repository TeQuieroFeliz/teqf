import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth, firestore } from '@/firebase/server';

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !firestore) {
      return NextResponse.json({ error: 'Firebase Admin no configurado.' }, { status: 500 });
    }

    const body = await req.json();
    const { email, role, fullName } = body as {
      email: string;
      role: 'admin' | 'team' | 'remove';
      fullName?: string;
    };

    if (!email || !role) {
      return NextResponse.json({ error: 'Email y rol son obligatorios.' }, { status: 400 });
    }

    // Verify caller token from Authorization header
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Token de autorización requerido.' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);

    // Check if caller is a website admin (superadmin/admin) OR a cashControlAdmin
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
        const adminRole = adminSnap.docs[0].data().role as string;
        isCallerWebAdmin = adminRole === 'superadmin' || adminRole === 'admin';
      }
    }

    if (!isCallerCashControlAdmin && !isCallerWebAdmin) {
      return NextResponse.json({ error: 'Sin permisos para gestionar roles.' }, { status: 403 });
    }

    // Get the target user by email
    let targetUser;
    try {
      targetUser = await adminAuth.getUserByEmail(email);
    } catch {
      return NextResponse.json(
        { error: `No se encontró un usuario con el email: ${email}` },
        { status: 404 }
      );
    }

    if (role === 'remove') {
      // Remove the custom claim
      await adminAuth.setCustomUserClaims(targetUser.uid, {
        ...targetUser.customClaims,
        cashControlRole: null,
      });

      // Mark profile as inactive / remove role
      const profileRef = firestore.collection('cashControlProfiles').doc(targetUser.uid);
      await profileRef.set(
        { role: null, updatedAt: new Date() },
        { merge: true }
      );

      return NextResponse.json({ success: true, message: 'Acceso Cash Control eliminado.' });
    }

    // Set the custom claim
    await adminAuth.setCustomUserClaims(targetUser.uid, {
      ...targetUser.customClaims,
      cashControlRole: role,
    });

    // Create or update cashControlProfiles document
    const profileRef = firestore.collection('cashControlProfiles').doc(targetUser.uid);
    const profileSnap = await profileRef.get();

    const now = new Date();
    if (profileSnap.exists) {
      await profileRef.update({
        role,
        email: targetUser.email ?? email,
        ...(fullName ? { fullName } : {}),
        updatedAt: now,
      });
    } else {
      await profileRef.set({
        uid: targetUser.uid,
        fullName: fullName ?? targetUser.displayName ?? email.split('@')[0],
        email: targetUser.email ?? email,
        role,
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Rol "${role}" asignado correctamente. El usuario debe cerrar sesión y volver a entrar si no ve el acceso inmediatamente.`,
    });
  } catch (err: unknown) {
    console.error('[set-role]', err);
    const message = err instanceof Error ? err.message : 'Error interno.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
