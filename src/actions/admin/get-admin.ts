'use server';
import { firestore } from '@/firebase/server';
import { AdminUser } from '@/lib/admin-types';
import { Timestamp } from 'firebase-admin/firestore';

export async function getAdminByEmail(email: string): Promise<{ admin: AdminUser | null }> {
  if (!firestore) return { admin: null };

  const snapshot = await firestore
    .collection('admins')
    .where('email', '==', email)
    .where('active', '==', true)
    .limit(1)
    .get();

  if (snapshot.empty) return { admin: null };

  const doc = snapshot.docs[0];
  return { admin: { id: doc.id, ...doc.data() } as AdminUser };
}

export async function updateAdminLastLogin(adminId: string): Promise<void> {
  if (!firestore) return;
  await firestore.collection('admins').doc(adminId).update({
    lastLogin: Timestamp.now(),
  });
}
