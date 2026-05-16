// ─── Permission level ─────────────────────────────────────────────────────────
// Ordered from lowest to highest: none < view < editor
export type AdminPermissionLevel = 'none' | 'view' | 'editor';

// ─── Sections ─────────────────────────────────────────────────────────────────
export type AdminPermissions = {
  blog:        AdminPermissionLevel;
  furniture:   AdminPermissionLevel;
  florals:     AdminPermissionLevel;
  portfolio:   AdminPermissionLevel;
  cashControl: AdminPermissionLevel;
  projects:    AdminPermissionLevel; // planner event management
  events:      AdminPermissionLevel;
};

// ─── Roles ────────────────────────────────────────────────────────────────────
// superadmin: bypasses all permission checks (full access everywhere)
// team:       internal team member — access defined by per-section permissions
// planner:    wedding planner — access defined by per-section permissions
export type AdminRole = 'superadmin' | 'team' | 'planner';

// ─── AdminUser ────────────────────────────────────────────────────────────────
export type AdminUser = {
  id: string;
  email: string;
  name?: string;
  role: AdminRole;
  permissions: AdminPermissions;
  createdAt: any;
  lastLogin: any;
  active: boolean;
  mustChangePassword?: boolean;
};

// ─── Metadata ─────────────────────────────────────────────────────────────────
export const ALL_PERMISSIONS: { key: keyof AdminPermissions; label: string }[] = [
  { key: 'blog',        label: 'Blog' },
  { key: 'portfolio',   label: 'Portfolio' },
  { key: 'events',      label: 'Eventi' },
  { key: 'projects',    label: 'Progetti Planner' },
  { key: 'furniture',   label: 'Mobili' },
  { key: 'florals',     label: 'Fiori' },
  { key: 'cashControl', label: 'Cash Control' },
];

export const PERMISSION_LEVELS: AdminPermissionLevel[] = ['none', 'view', 'editor'];

export const PERMISSION_LEVEL_LABELS: Record<AdminPermissionLevel, string> = {
  none:   'Nessun accesso',
  view:   'Solo lettura',
  editor: 'Lettura e scrittura',
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  superadmin: 'Super Admin',
  team:       'Team',
  planner:    'Planner',
};

export const DEFAULT_PERMISSIONS: AdminPermissions = {
  blog:        'none',
  furniture:   'none',
  florals:     'none',
  portfolio:   'none',
  cashControl: 'none',
  projects:    'none',
  events:      'none',
};

export const PLANNER_DEFAULT_PERMISSIONS: AdminPermissions = {
  blog:        'view',
  furniture:   'view',
  florals:     'view',
  portfolio:   'view',
  cashControl: 'view',
  projects:    'editor',
  events:      'view',
};

// ─── Permission helper ────────────────────────────────────────────────────────
// Returns true when the user can perform actions at the requested level.
// superadmin always passes. For others: editor >= view >= none.
export function hasPermission(
  user: Pick<AdminUser, 'role' | 'permissions'>,
  section: keyof AdminPermissions,
  required: Exclude<AdminPermissionLevel, 'none'>
): boolean {
  if (user.role === 'superadmin') return true;
  const actual = user.permissions?.[section] ?? 'none';
  if (actual === 'none') return false;
  if (required === 'view') return actual === 'view' || actual === 'editor';
  return actual === 'editor'; // required === 'editor'
}
