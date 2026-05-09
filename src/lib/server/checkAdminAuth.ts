import { auth as adminAuth, firestore } from '@/firebase/server';

/**
 * Verifies a Bearer token and returns whether the caller has cash-control admin
 * privileges — either via the cashControlRole custom claim or via the Firestore
 * admins collection (superadmin role).
 */
export async function checkCashControlAdminAuth(token: string): Promise<{
  uid: string;
  email: string | null;
  cashControlRole: string | null;
  hasCashControlRole: boolean;
  isSuperAdmin: boolean;
  isAuthorized: boolean;
}> {
  const decoded = await adminAuth!.verifyIdToken(token);
  const cashControlRole = (decoded.cashControlRole as string) ?? null;
  const hasCashControlRole = cashControlRole === 'admin';

  let isSuperAdmin = false;
  if (!hasCashControlRole && decoded.email) {
    const snap = await firestore!
      .collection('admins')
      .where('email', '==', decoded.email)
      .where('role', '==', 'superadmin')
      .where('active', '==', true)
      .limit(1)
      .get();
    isSuperAdmin = !snap.empty;
  }

  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    cashControlRole,
    hasCashControlRole,
    isSuperAdmin,
    isAuthorized: hasCashControlRole || isSuperAdmin,
  };
}
