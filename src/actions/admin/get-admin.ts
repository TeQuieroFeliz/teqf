'use server';
import { auth, firestore } from '@/firebase/server';
import { AdminUser } from '@/lib/admin-types';
import { Timestamp } from 'firebase-admin/firestore';

export async function getAdminByEmail(email: string): Promise<{ admin: AdminUser | null }> {
  if (!firestore || !auth) return { admin: null };
  try {
    const firebaseUser = await auth.getUserByEmail(email);
    const snap = await firestore.collection('admins').doc(firebaseUser.uid).get();
    if (!snap.exists || snap.data()?.active !== true) return { admin: null };
    return { admin: { id: snap.id, ...snap.data() } as AdminUser };
  } catch {
    return { admin: null };
  }
}

export async function updateAdminLastLogin(adminId: string): Promise<void> {
  if (!firestore) return;
  await firestore.collection('admins').doc(adminId).update({
    lastLogin: Timestamp.now(),
  });
}
