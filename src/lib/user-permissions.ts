// Shared utility — importable in both server actions and client components.

export type UserTeams = string[]; // [] | ['XB'] | ['TeQF'] | ['XB','TeQF']

// ── Legacy flat permissions (kept for existing callers) ───────────────────────

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

// ── Section permissions (per-section view/edit matrix) ───────────────────────
// PART-2: structured permission matrix for XB / TeQF / SuperAdmin roles.

export type Perm = { canView: boolean; canEdit: boolean };

export type SectionPermissions = {
  events:      Perm;
  furniture:   Perm;
  florals:     Perm;
  cashControl: Perm;
  orario:      Perm;
};

const ALL_ACCESS: SectionPermissions = {
  events:      { canView: true, canEdit: true },
  furniture:   { canView: true, canEdit: true },
  florals:     { canView: true, canEdit: true },
  cashControl: { canView: true, canEdit: true },
  orario:      { canView: true, canEdit: true },
};

const NO_ACCESS: Perm = { canView: false, canEdit: false };

export function sectionPermissionsFor(
  teams: UserTeams,
  isSuperAdmin = false
): SectionPermissions {
  if (isSuperAdmin) return ALL_ACCESS;

  const hasXB   = teams.includes('XB');
  const hasTeQF = teams.includes('TeQF');

  return {
    events:      { canView: hasXB || hasTeQF, canEdit: hasXB },
    furniture:   { canView: hasXB || hasTeQF, canEdit: hasTeQF },
    florals:     { canView: hasXB || hasTeQF, canEdit: hasTeQF },
    cashControl: hasTeQF ? { canView: true, canEdit: true } : NO_ACCESS,
    orario:      hasTeQF ? { canView: true, canEdit: true } : NO_ACCESS,
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
