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

    // ── 1. planners/{userId} — PlannerAuthContext reads this ─────────────────
    await firestore.collection('planners').doc(userId).update({
      team: teams, teamRole, permissions, active, updatedAt: now,
    });

    // ── 2. users/{userId} — canonical source of truth ────────────────────────
    const plannerSnap = await firestore.collection('planners').doc(userId).get();
    const pd          = plannerSnap.data() ?? {};
    await firestore.collection('users').doc(userId).set(
      { email: pd.email ?? '', name: pd.name ?? '', role: 'user', team: teams, permissions, active, updatedAt: now },
      { merge: true }
    );

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
