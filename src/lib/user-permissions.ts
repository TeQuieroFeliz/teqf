// Shared utility — importable in both server actions and client components.

export type UserTeams = string[]; // [] | ['XB'] | ['TeQF'] | ['XB','TeQF']

export interface UserPermissions {
  canCreateEvents:      boolean;
  canModifyEvents:      boolean;
  canViewEvents:        boolean;
  canManageCashControl: boolean;
  canManageOrario:      boolean;
}

export function permissionsFor(teams: UserTeams): UserPermissions {
  return {
    canCreateEvents:      teams.includes('XB'),
    canModifyEvents:      teams.includes('XB'),
    canViewEvents:        teams.length > 0,
    canManageCashControl: teams.includes('TeQF'),
    canManageOrario:      teams.includes('TeQF'),
  };
}

export function teamRoleFor(teams: UserTeams): string | null {
  const hasXB   = teams.includes('XB');
  const hasTeQF = teams.includes('TeQF');
  if (hasXB && hasTeQF) return 'both';
  if (hasXB)            return 'xb_planner';
  if (hasTeQF)          return 'teqf_user';
  return null;
}

export function deriveTeams(user: { team?: unknown; teamRole?: string }): string[] {
  const { team, teamRole } = user;
  if (Array.isArray(team)) return team as string[];
  if (team === 'XB')   return ['XB'];
  if (team === 'TeQF') return ['TeQF'];
  if (teamRole === 'xb_planner') return ['XB'];
  if (teamRole === 'teqf_user')  return ['TeQF'];
  if (teamRole === 'both')       return ['XB', 'TeQF'];
  return [];
}
