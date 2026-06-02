'use server';

import { firestore } from '@/firebase/server';

export type UserTeam = 'XB' | 'TeQF' | 'none';
export type UserStatus = 'active' | 'inactive';

function permissionsFor(team: UserTeam) {
  return {
    canCreateEvents:      team === 'XB',
    canModifyEvents:      team === 'XB',
    canViewEvents:        team !== 'none',
    canManageCashControl: team === 'TeQF',
    canManageOrario:      team === 'TeQF',
  };
}

function teamRoleFor(team: UserTeam): string | null {
  if (team === 'XB')   return 'xb_planner';
  if (team === 'TeQF') return 'teqf_user';
  return null;
}

export async function saveUserManagement(
  userId: string,
  team: UserTeam,
  status: UserStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    await firestore.collection('planners').doc(userId).update({
      team,
      teamRole:    teamRoleFor(team),
      permissions: permissionsFor(team),
      active:      status === 'active',
      updatedAt:   new Date().toISOString(),
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
