'use server';

import { firestore } from '@/firebase/server';
import { AdminUser, AdminRole, AdminPermissions, DEFAULT_PERMISSIONS } from '@/lib/admin-types';
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
  return snap.docs.map(doc => serializeAdmin(doc.id, doc.data()));
}

export async function getAdminByEmail(email: string): Promise<AdminUser | null> {
  if (!firestore) return null;
  const snap = await ref().where('email', '==', email).where('active', '==', true).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return serializeAdmin(doc.id, doc.data());
}

export async function createAdminUser(data: {
  email: string;
  name: string;
  role: AdminRole;
  permissions: AdminPermissions;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!firestore) return { success: false, error: 'Firestore non disponibile' };
  try {
    const existing = await ref().where('email', '==', data.email).limit(1).get();
    if (!existing.empty) return { success: false, error: 'Email già registrata come admin.' };
    const docRef = await ref().add({
      ...data,
      active: true,
      mustChangePassword: true,
      createdAt: Timestamp.now(),
      lastLogin: null,
    });
    return { success: true, id: docRef.id };
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
  if (!firestore) return { success: false, error: 'Firestore non disponibile' };
  try {
    const existing = await ref().where('email', '==', email).limit(1).get();
    if (!existing.empty) {
      await existing.docs[0].ref.update({ role, permissions, active: true, name });
      return { success: true, id: existing.docs[0].id };
    }
    const docRef = await ref().add({
      email, name, role, permissions,
      active: true,
      mustChangePassword: false,
      createdAt: Timestamp.now(),
      lastLogin: null,
    });
    return { success: true, id: docRef.id };
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
