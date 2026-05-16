'use client';

import {
  createAdminUser,
  deleteAdminUser,
  getAllAdminUsers,
  grantPlannerAdminAccess,
  revokeAdminAccess,
  toggleAdminUserActive,
  updateAdminUser,
} from '@/actions/admin/user-crud';
import { getAllPlanners } from '@/actions/planner/planner-auth';
import { useAdminAuth } from '@/context/AdminAuthContext';
import {
  AdminPermissionLevel,
  AdminPermissions,
  AdminRole,
  AdminUser,
  ALL_PERMISSIONS,
  DEFAULT_PERMISSIONS,
  PERMISSION_LEVELS,
  PERMISSION_LEVEL_LABELS,
  ROLE_LABELS,
} from '@/lib/admin-types';
import { PlannerUser } from '@/lib/planner-types';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  Plus,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const ROLES: { value: AdminRole; label: string }[] = [
  { value: 'superadmin', label: 'Super Admin' },
  { value: 'team',       label: 'Team' },
  { value: 'planner',    label: 'Planner' },
];

const PERMISSION_COLORS: Record<AdminPermissionLevel, { bg: string; text: string }> = {
  none:   { bg: '#f3f4f6', text: '#6b7280' },
  view:   { bg: '#eff6ff', text: '#1d4ed8' },
  editor: { bg: '#fdf2f4', text: '#5C1A28' },
};

type Tab = 'admins' | 'new-admin' | 'grant-planner';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid var(--tqf-beige-border)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.875rem',
  color: 'var(--tqf-dark)',
  background: 'white',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.65rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.12em',
  marginBottom: '0.25rem',
  color: 'var(--tqf-muted)',
  fontFamily: 'var(--font-body)',
};

function PermissionsEditor({
  permissions,
  onChange,
  disabled,
}: {
  permissions: AdminPermissions;
  onChange: (p: AdminPermissions) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {ALL_PERMISSIONS.map(({ key, label }) => (
        <div key={key}>
          <label style={labelStyle}>{label}</label>
          <select
            value={permissions[key]}
            onChange={(e) => onChange({ ...permissions, [key]: e.target.value as AdminPermissionLevel })}
            disabled={disabled}
            style={{ ...inputStyle, background: disabled ? 'var(--tqf-beige)' : 'white' }}
          >
            {PERMISSION_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>{PERMISSION_LEVEL_LABELS[lvl]}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

function AdminUserRow({
  user,
  isSelf,
  onRefresh,
}: {
  user: AdminUser;
  isSelf: boolean;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editRole, setEditRole] = useState<AdminRole>(user.role);
  const [editPerms, setEditPerms] = useState<AdminPermissions>(user.permissions ?? DEFAULT_PERMISSIONS);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSaving(true);
    const result = await updateAdminUser(user.id, editRole, editPerms);
    if (result.success) {
      toast.success('Utente aggiornato.');
      onRefresh();
    } else {
      toast.error(result.error ?? 'Errore aggiornamento.');
    }
    setSaving(false);
  }

  async function handleToggleActive() {
    setToggling(true);
    const fn = user.active ? revokeAdminAccess : toggleAdminUserActive;
    const result = user.active
      ? await revokeAdminAccess(user.id)
      : await toggleAdminUserActive(user.id, true);
    if (result.success) {
      toast.success(user.active ? 'Accesso revocato.' : 'Accesso riattivato.');
      onRefresh();
    } else {
      toast.error(result.error ?? 'Errore.');
    }
    setToggling(false);
  }

  async function handleDelete() {
    if (!confirm(`Eliminare definitivamente l'utente ${user.email}?`)) return;
    setDeleting(true);
    const result = await deleteAdminUser(user.id);
    if (result.success) {
      toast.success('Utente eliminato.');
      onRefresh();
    } else {
      toast.error(result.error ?? 'Errore eliminazione.');
    }
    setDeleting(false);
  }

  const roleInfo = ROLES.find((r) => r.value === editRole);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--tqf-beige-border)', background: 'white' }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 gap-3"
        style={{ borderBottom: expanded ? '1px solid var(--tqf-beige-border)' : undefined }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="size-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
            style={{ background: 'var(--tqf-cipria)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-display)' }}
          >
            {(user.name?.[0] ?? user.email[0]).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm truncate" style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)' }}>
                {user.name ? `${user.name} ` : ''}<span className="opacity-60">{user.email}</span>
              </span>
              {isSelf && (
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#fdf2f4', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                  Tu
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {roleInfo?.label ?? user.role}
              </span>
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: user.active ? '#f0fdf4' : '#f3f4f6', color: user.active ? '#166534' : '#6b7280', fontFamily: 'var(--font-body)' }}
              >
                {user.active ? 'Attivo' : 'Disattivato'}
              </span>
              {user.mustChangePassword && (
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#fef9ee', color: '#b45309', fontFamily: 'var(--font-body)' }}>
                  Cambio pwd richiesto
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!isSelf && (
            <>
              <button
                onClick={handleToggleActive}
                disabled={toggling}
                title={user.active ? 'Disattiva accesso' : 'Riattiva accesso'}
                className="size-7 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70 disabled:opacity-40"
                style={user.active
                  ? { color: '#b45309', border: '1px solid #fde68a', background: '#fef9ee' }
                  : { color: '#166534', border: '1px solid #bbf7d0', background: '#f0fdf4' }
                }
              >
                {toggling ? <Loader2 className="size-3.5 animate-spin" /> : user.active ? <ShieldOff className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                title="Elimina utente"
                className="size-7 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70 disabled:opacity-40"
                style={{ color: '#991b1b', border: '1px solid #fecaca', background: '#fef2f2' }}
              >
                {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              </button>
            </>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="size-7 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
            style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)' }}
          >
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-4 space-y-4">
          <div>
            <label style={labelStyle}>Ruolo</label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as AdminRole)}
              disabled={isSelf}
              style={{ ...inputStyle, width: 'auto', minWidth: '200px', background: isSelf ? 'var(--tqf-beige)' : 'white' }}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <p style={{ ...labelStyle, marginBottom: '0.625rem' }}>Permessi per sezione</p>
            <PermissionsEditor permissions={editPerms} onChange={setEditPerms} disabled={isSelf} />
          </div>

          {!isSelf && (
            <div className="flex justify-end pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
              >
                {saving && <Loader2 className="size-3.5 animate-spin" />}
                Salva modifiche
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  const { adminUser, logout } = useAdminAuth();
  const [tab, setTab] = useState<Tab>('admins');
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [planners, setPlanners] = useState<PlannerUser[]>([]);
  const [loading, setLoading] = useState(true);

  // New admin form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [newRole, setNewRole] = useState<AdminRole>('team');
  const [newPerms, setNewPerms] = useState<AdminPermissions>(DEFAULT_PERMISSIONS);
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // Grant planner access form
  const [selectedPlannerId, setSelectedPlannerId] = useState('');
  const [grantRole, setGrantRole] = useState<AdminRole>('planner');
  const [grantPerms, setGrantPerms] = useState<AdminPermissions>(DEFAULT_PERMISSIONS);
  const [granting, setGranting] = useState(false);

  const isSuperAdmin = adminUser?.role === 'superadmin';

  async function loadData() {
    setLoading(true);
    const [users, pl] = await Promise.all([getAllAdminUsers(), getAllPlanners()]);
    setAdminUsers(users);
    setPlanners(pl);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  if (!adminUser) return null;

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      toast.error('La password deve essere di almeno 8 caratteri.');
      return;
    }
    setCreatingAdmin(true);
    try {
      // Create Firebase Auth account
      const apiRes = await fetch('/api/admin-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: newPassword }),
      });
      if (!apiRes.ok) {
        const data = await apiRes.json().catch(() => ({}));
        throw new Error(data.error ?? 'Errore creazione account Firebase.');
      }

      // Create Firestore record
      const result = await createAdminUser({ email: newEmail, name: newName, role: newRole, permissions: newPerms });
      if (!result.success) throw new Error(result.error ?? 'Errore creazione utente.');

      toast.success('Utente admin creato. Al primo accesso dovrà cambiare la password.');
      setNewEmail(''); setNewName(''); setNewPassword('');
      setNewRole('team'); setNewPerms(DEFAULT_PERMISSIONS);
      setTab('admins');
      await loadData();
    } catch (err: any) {
      toast.error(err.message ?? 'Errore.');
    } finally {
      setCreatingAdmin(false);
    }
  }

  async function handleGrantAccess(e: React.FormEvent) {
    e.preventDefault();
    const planner = planners.find((p) => p.id === selectedPlannerId);
    if (!planner) { toast.error('Seleziona una planner.'); return; }

    setGranting(true);
    const result = await grantPlannerAdminAccess(
      planner.email,
      planner.name ? `${planner.name}${planner.lastName ? ' ' + planner.lastName : ''}` : planner.email,
      grantRole,
      grantPerms
    );
    if (result.success) {
      toast.success(`Accesso admin concesso a ${planner.name ?? planner.email}.`);
      setSelectedPlannerId(''); setGrantRole('planner'); setGrantPerms(DEFAULT_PERMISSIONS);
      setTab('admins');
      await loadData();
    } else {
      toast.error(result.error ?? 'Errore.');
    }
    setGranting(false);
  }

  // Planners that don't already have an admin record
  const plannersWithoutAdmin = planners.filter(
    (p) => !adminUsers.some((a) => a.email === p.email)
  );

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'admins', label: 'Utenti admin', icon: <Users className="size-4" /> },
    ...(isSuperAdmin ? [
      { id: 'new-admin' as Tab, label: 'Nuovo utente', icon: <UserPlus className="size-4" /> },
      { id: 'grant-planner' as Tab, label: 'Accesso planner', icon: <UserCog className="size-4" /> },
    ] : []),
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      <header
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}
      >
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <div className="h-4 w-px" style={{ background: 'var(--tqf-beige-border)' }} />
          <div>
            <p className="text-xs tracking-[0.2em] uppercase" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Amministrazione
            </p>
            <h1 className="text-xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontWeight: 300 }}>
              Gestione Utenti
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>{adminUser.email}</p>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
              {ROLE_LABELS[adminUser.role]}
            </span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)' }}
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Esci</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-all"
              style={tab === t.id
                ? { background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }
                : { color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }
              }
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* --- Tab: Admin list --- */}
        {tab === 'admins' && (
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-6 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
              </div>
            ) : adminUsers.length === 0 ? (
              <div className="rounded-2xl p-10 text-center" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
                <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  Nessun utente admin trovato.
                </p>
              </div>
            ) : (
              adminUsers.map((u) => (
                <AdminUserRow key={u.id} user={u} isSelf={u.id === adminUser.id} onRefresh={loadData} />
              ))
            )}
          </div>
        )}

        {/* --- Tab: Create new admin --- */}
        {tab === 'new-admin' && isSuperAdmin && (
          <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <div className="flex items-center gap-2 mb-6">
              <UserPlus className="size-5" style={{ color: 'var(--tqf-bordeaux)' }} />
              <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
                Crea nuovo utente admin
              </h2>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Nome</label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nome e cognome"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--tqf-bordeaux)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--tqf-beige-border)')}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    placeholder="admin@tequierofeliz.com"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--tqf-bordeaux)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--tqf-beige-border)')}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Password temporanea *</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="Minimo 8 caratteri"
                      style={{ ...inputStyle, paddingRight: '2.5rem' }}
                      onFocus={(e) => (e.target.style.borderColor = 'var(--tqf-bordeaux)')}
                      onBlur={(e) => (e.target.style.borderColor = 'var(--tqf-beige-border)')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--tqf-muted)' }}
                    >
                      {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                    L&apos;utente dovrà cambiarla al primo accesso.
                  </p>
                </div>
                <div>
                  <label style={labelStyle}>Ruolo</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as AdminRole)}
                    style={inputStyle}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <p style={{ ...labelStyle, marginBottom: '0.625rem' }}>Permessi per sezione</p>
                <PermissionsEditor permissions={newPerms} onChange={setNewPerms} />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={creatingAdmin}
                  className="flex items-center gap-2 text-sm px-5 py-2.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
                >
                  {creatingAdmin && <Loader2 className="size-4 animate-spin" />}
                  <Plus className="size-4" />
                  Crea utente
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- Tab: Grant planner access --- */}
        {tab === 'grant-planner' && isSuperAdmin && (
          <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <UserCog className="size-5" style={{ color: 'var(--tqf-bordeaux)' }} />
              <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
                Concedi accesso admin a una planner
              </h2>
            </div>
            <p className="text-xs mb-6" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              La planner selezionata potrà accedere al pannello admin con le sue credenziali planner esistenti.
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="size-5 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
              </div>
            ) : plannersWithoutAdmin.length === 0 ? (
              <p className="text-sm py-6 text-center" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                Tutte le planner hanno già accesso admin o non ci sono planner registrate.
              </p>
            ) : (
              <form onSubmit={handleGrantAccess} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label style={labelStyle}>Planner *</label>
                    <select
                      value={selectedPlannerId}
                      onChange={(e) => setSelectedPlannerId(e.target.value)}
                      required
                      style={inputStyle}
                    >
                      <option value="">— Seleziona planner —</option>
                      {plannersWithoutAdmin.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name ? `${p.name}${p.lastName ? ' ' + p.lastName : ''} — ` : ''}{p.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Ruolo admin</label>
                    <select
                      value={grantRole}
                      onChange={(e) => setGrantRole(e.target.value as AdminRole)}
                      style={inputStyle}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <p style={{ ...labelStyle, marginBottom: '0.625rem' }}>Permessi per sezione</p>
                  <PermissionsEditor permissions={grantPerms} onChange={setGrantPerms} />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={granting || !selectedPlannerId}
                    className="flex items-center gap-2 text-sm px-5 py-2.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
                  >
                    {granting && <Loader2 className="size-4 animate-spin" />}
                    <ShieldCheck className="size-4" />
                    Concedi accesso
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {!isSuperAdmin && tab !== 'admins' && (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Solo il super admin può gestire gli utenti.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
