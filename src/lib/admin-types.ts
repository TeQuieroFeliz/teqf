export type AdminPermissionLevel = 'none' | 'read' | 'write' | 'admin';

export type AdminPermissions = {
  blog: AdminPermissionLevel;
  portfolio: AdminPermissionLevel;
  catalog: AdminPermissionLevel;
  events: AdminPermissionLevel;
  users: AdminPermissionLevel;
  planners: AdminPermissionLevel;
  furniture: AdminPermissionLevel;
  flowers: AdminPermissionLevel;
  cashControl: AdminPermissionLevel;
};

export type AdminRole = 'superadmin' | 'admin' | 'editor' | 'viewer';

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

export const ALL_PERMISSIONS: { key: keyof AdminPermissions; label: string }[] = [
  { key: 'blog',        label: 'Blog' },
  { key: 'portfolio',   label: 'Portfolio' },
  { key: 'catalog',     label: 'Catalogo' },
  { key: 'events',      label: 'Eventi' },
  { key: 'users',       label: 'Utenti' },
  { key: 'planners',    label: 'Planner' },
  { key: 'furniture',   label: 'Catalogo Mobili' },
  { key: 'flowers',     label: 'Catalogo Fiori' },
];

export const PERMISSION_LEVELS: AdminPermissionLevel[] = ['none', 'read', 'write', 'admin'];

export const DEFAULT_PERMISSIONS: AdminPermissions = {
  blog: 'none', portfolio: 'none', catalog: 'none', events: 'none',
  users: 'none', planners: 'none', furniture: 'none', flowers: 'none',
  cashControl: 'none',
};

export const PLANNER_DEFAULT_PERMISSIONS: AdminPermissions = {
  blog: 'write', portfolio: 'write', catalog: 'write', events: 'write',
  users: 'none', planners: 'none', furniture: 'write', flowers: 'write',
  cashControl: 'read',
};
