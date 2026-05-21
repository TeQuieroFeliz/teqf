'use server';

import { auth, firestore } from '@/firebase/server';
import { AdminUser, AdminRole, AdminPermissions } from '@/lib/admin-types';
import { Timestamp } from 'firebase-admin/firestore';

const ref = () => firestore!.collection('admins');

function serializeAdmin(id: string, data: FirebaseFirestore.DocumentData): AdminUser {
  const toIso = (v: any) => {
    if (!v) return null;
    if (typeof v.toDate === 'function') return v.toDate().toISOString();
    return v;
  };
  return {
    id,
    email: data.email,
    name: data.name,
    role: data.role,
    permissions: data.permissions,
    active: data.active,
    mustChangePassword: data.mustChangePassword,
    createdAt: toIso(data.createdAt),
    lastLogin: toIso(data.lastLogin),
  } as AdminUser;
}

export async function getAllAdminUsers(): Promise<AdminUser[]> {
  if (!firestore) return [];
  const snap = await ref().orderBy('createdAt', 'desc').get();
  return snap.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => serializeAdmin(doc.id, doc.data()));
}

export async function getAdminByEmail(email: string): Promise<AdminUser | null> {
  if (!firestore || !auth) return null;
  try {
    const firebaseUser = await auth.getUserByEmail(email);
    const snap = await ref().doc(firebaseUser.uid).get();
    if (!snap.exists || snap.data()?.active !== true) return null;
    return serializeAdmin(snap.id, snap.data()!);
  } catch {
    return null;
  }
}

export async function createAdminUser(data: {
  uid: string;
  email: string;
  name: string;
  role: AdminRole;
  permissions: AdminPermissions;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!firestore) return { success: false, error: 'Firestore non disponibile' };
  try {
    const existing = await ref().doc(data.uid).get();
    if (existing.exists) return { success: false, error: 'Admin già registrato.' };
    const { uid, ...fields } = data;
    await ref().doc(uid).set({
      ...fields,
      active: true,
      mustChangePassword: true,
      createdAt: Timestamp.now(),
      lastLogin: null,
    });
    return { success: true, id: uid };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateAdminUser(
  id: string,
  role: AdminRole,
  permissions: AdminPermissions
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'Firestore non disponibile' };
  try {
    await ref().doc(id).update({ role, permissions });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function toggleAdminUserActive(
  id: string,
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'Firestore non disponibile' };
  try {
    await ref().doc(id).update({ active });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteAdminUser(id: string): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'Firestore non disponibile' };
  try {
    await ref().doc(id).delete();
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function grantPlannerAdminAccess(
  email: string,
  name: string,
  role: AdminRole,
  permissions: AdminPermissions
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!firestore || !auth) return { success: false, error: 'Firebase non disponibile' };
  try {
    const firebaseUser = await auth.getUserByEmail(email);
    const uid = firebaseUser.uid;
    const docRef = ref().doc(uid);
    const existing = await docRef.get();
    if (existing.exists) {
      await docRef.update({ role, permissions, active: true, name });
      return { success: true, id: uid };
    }
    await docRef.set({
      email, name, role, permissions,
      active: true,
      mustChangePassword: false,
      createdAt: Timestamp.now(),
      lastLogin: null,
    });
    return { success: true, id: uid };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function revokeAdminAccess(id: string): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'Firestore non disponibile' };
  try {
    await ref().doc(id).update({ active: false });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function clearAdminMustChangePassword(id: string): Promise<{ success: boolean; error?: string }> {
  if (!firestore) return { success: false, error: 'Firestore non disponibile' };
  try {
    await ref().doc(id).update({ mustChangePassword: false });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
