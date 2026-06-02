'use server';

import { firestore } from '@/firebase/server';

export type UserStatus = 'active' | 'inactive';

// teams is now an array: [] | ['XB'] | ['TeQF'] | ['XB','TeQF']
export function permissionsFor(teams: string[]) {
  return {
    canCreateEvents:      teams.includes('XB'),
    canModifyEvents:      teams.includes('XB'),
    canViewEvents:        teams.length > 0,
    canManageCashControl: teams.includes('TeQF'),
    canManageOrario:      teams.includes('TeQF'),
  };
}

function teamRoleFor(teams: string[]): string | null {
  const hasXB   = teams.includes('XB');
  const hasTeQF = teams.includes('TeQF');
  if (hasXB && hasTeQF) return 'both';
  if (hasXB)            return 'xb_planner';
  if (hasTeQF)          return 'teqf_user';
  return null;
}

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
      team:        teams,
      teamRole,
      permissions,
      active,
      updatedAt:   now,
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
