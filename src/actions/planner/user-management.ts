'use server';

import { firestore } from '@/firebase/server';
import { permissionsFor, teamRoleFor } from '@/lib/user-permissions';

export type { UserTeams, UserPermissions } from '@/lib/user-permissions';
export type UserStatus = 'active' | 'inactive';

export async function saveUserManagement(
  userId: string,
  teams: string[],
  status: UserStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const now         = new Date().toISOString();
    const permissions = permissionsFor(teams);
    const teamRole    = teamRoleFor(teams);
    const active      = status === 'active';

    const updateData = { team: teams, teamRole, permissions, active, updatedAt: now };

    // Get email so we can also patch any legacy email-keyed planners docs
    const userDoc = await firestore.collection('users').doc(userId).get();
    const email   = userDoc.data()?.email as string | undefined;

    const writes: Promise<any>[] = [
      // Canonical uid-keyed docs (primary listeners read from here)
      firestore.collection('users').doc(userId).set(updateData, { merge: true }),
      firestore.collection('planners').doc(userId).set(updateData, { merge: true }),
    ];

    // Patch any legacy auto-ID planners docs that match by email
    if (email) {
      const legacyDocs = await firestore.collection('planners').where('email', '==', email).get();
      for (const d of legacyDocs.docs) {
        if (d.id !== userId) {
          writes.push(d.ref.set(updateData, { merge: true }));
        }
      }
    }

    await Promise.all(writes);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
