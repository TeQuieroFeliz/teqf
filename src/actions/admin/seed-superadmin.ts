'use server';
import { firestore } from '@/firebase/server';
import { Timestamp } from 'firebase-admin/firestore';

export async function seedSuperAdmin(): Promise<{ success: boolean; message: string }> {
  if (!firestore) return { success: false, message: 'Firestore not initialized' };

  const email = 'admin@tequierofeliz.com';

  const existing = await firestore
    .collection('admins')
    .where('email', '==', email)
    .limit(1)
    .get();

  if (!existing.empty) {
    return { success: true, message: 'Superadmin already exists' };
  }

  const allAdmin = {
    blog: 'admin',
    portfolio: 'admin',
    catalog: 'admin',
    events: 'admin',
    users: 'admin',
    planners: 'admin',
  };

  await firestore.collection('admins').add({
    email,
    role: 'superadmin',
    permissions: allAdmin,
    createdAt: Timestamp.now(),
    lastLogin: Timestamp.now(),
    active: true,
  });

  return { success: true, message: 'Superadmin created successfully' };
}
