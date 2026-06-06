'use client';

import { addPlanner, deletePlanner, togglePlannerActive } from '@/actions/planner/planner-auth';
import { grantPlannerAdminAccess } from '@/actions/admin/user-crud';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import AccessDenied from '@/components/planner/AccessDenied';
import { db } from '@/firebase/client';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { AdminPermissions, AdminRole, AdminUser, ALL_PERMISSIONS, PERMISSION_LEVELS, PLANNER_DEFAULT_PERMISSIONS } from '@/lib/admin-types';
import { CITIES, PlannerEvent, PlannerUser } from '@/lib/planner-types';
import {
  ArrowLeft,
  Bell,
  Calendar,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { auth } from '@/firebase/client';

async function setCashControlRole(email: string, fullName: string, role: 'team' | 'admin' | 'remove') {
  const token = await auth.currentUser?.getIdToken(true);
  if (!token) return;
  await fetch('/api/cash-control/set-role', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ email, role, fullName }),
  });
}

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  draft:     { label: 'Bozza',  bg: '#f3f4f6', text: '#6b7280' },
  submitted: { label: 'Inviato', bg: '#fef9ee', text: '#b45309' },
};

async function callPlannerAdminApi(email: string, password: string) {
  const res = await fetch('/api/planner-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? 'Errore server');
  }
  return res.json();
}

export default function AdminPlannersPage() {
  const { adminUser, logout } = usePlannerAuth();
  const [planners, setPlanners] = useState<PlannerUser[]>([]);
  const [events, setEvents]     = useState<PlannerEvent[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading]   = useState(true);
  const [expandedPlanner, setExpandedPlanner] = useState<string | null>(null);

  // Edit permissions modal
  const [editPermTarget, setEditPermTarget] = useState<PlannerUser | null>(null);
  const [editPerms, setEditPerms] = useState<AdminPermissions>(PLANNER_DEFAULT_PERMISSIONS);
  const [editRole, setEditRole] = useState<AdminRole>('planner');
  const [editCCRole, setEditCCRole] = useState<'none' | 'team' | 'admin'>('none');
  const [editSaving, setEditSaving] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail]       = useState('');
  const [newName, setNewName]         = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPwd, setShowNewPwd]   = useState(false);
  const [adding, setAdding]           = useState(false);

  // Reset password modal
  const [resetTarget, setResetTarget]   = useState<PlannerUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPwd, setShowResetPwd]   = useState(false);
  const [resetting, setResetting]         = useState(false);

  useEffect(() => {
    const toIso = (v: any) => (typeof v?.toDate === 'function' ? v.toDate().toISOString() : v ?? null);
    Promise.all([
      getDocs(query(collection(db, 'planners'), orderBy('createdAt', 'desc'))),
      getDocs(query(collection(db, 'plannerEvents'), orderBy('createdAt', 'desc'))),
      getDocs(query(collection(db, 'plannerRequests'), where('status', '==', 'pending'))),
      getDocs(query(collection(db, 'admins'), orderBy('createdAt', 'desc'))),
    ]).then(([pSnap, eSnap, rSnap, aSnap]) => {
      setPlanners(pSnap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: toIso(d.data().createdAt), lastLogin: toIso(d.data().lastLogin) } as PlannerUser)));
      setEvents(eSnap.docs.map(d => ({ id: d.id, ...d.data() } as PlannerEvent)));
      setPendingCount(rSnap.size);
      setAdminUsers(aSnap.docs.map(d => ({ id: d.id, email: d.data().email, name: d.data().name, role: d.data().role, permissions: d.data().permissions, active: d.data().active, mustChangePassword: d.data().mustChangePassword, createdAt: toIso(d.data().createdAt), lastLogin: toIso(d.data().lastLogin) } as AdminUser)));
    }).finally(() => setLoading(false));
  }, []);

  // BUG-09 fix: replaced `return null` with AccessDenied.
  if (!adminUser) return <AccessDenied />;

  const plannerEvents = (plannerId: string) => events.filter((e) => e.plannerId === plannerId);
  const cityLabel = (val: string) => CITIES.find((c) => c.value === val)?.label ?? val;

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none';
  const inputStyle = { border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)', background: 'white' };
  const labelCls  = 'block text-xs uppercase tracking-wider mb-1.5';
  const labelStyle = { color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' };

  // ── Add planner ──────────────────────────────────────────────────────────
  async function handleAdd() {
    if (!newEmail.trim() || !newName.trim()) { toast.error('Inserisci email e nome.'); return; }
    if (newPassword.length < 6)              { toast.error('La password deve avere almeno 6 caratteri.'); return; }
    setAdding(true);
    try {
      await callPlannerAdminApi(newEmail.trim().toLowerCase(), newPassword);
      await addPlanner(newEmail.trim().toLowerCase(), newName.trim());
      const toIso = (v: any) => (typeof v?.toDate === 'function' ? v.toDate().toISOString() : v ?? null);
      const pSnap = await getDocs(query(collection(db, 'planners'), orderBy('createdAt', 'desc')));
      setPlanners(pSnap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: toIso(d.data().createdAt), lastLogin: toIso(d.data().lastLogin) } as PlannerUser)));
      setNewEmail(''); setNewName(''); setNewPassword('');
      setShowAddForm(false);
      toast.success('Planner aggiunta.');
    } catch (err: any) {
      toast.error(err.message ?? 'Errore durante la creazione.');
    }
    setAdding(false);
  }

  // ── Reset password ────────────────────────────────────────────────────────
  async function handleReset() {
    if (!resetTarget) return;
    if (resetPassword.length < 6) { toast.error('La password deve avere almeno 6 caratteri.'); return; }
    setResetting(true);
    try {
      await callPlannerAdminApi(resetTarget.email, resetPassword);
      toast.success(`Password reimpostata per ${resetTarget.name}.`);
      setResetTarget(null);
      setResetPassword('');
    } catch (err: any) {
      toast.error(err.message ?? 'Errore reset password.');
    }
    setResetting(false);
  }

  // ── Toggle active ─────────────────────────────────────────────────────────
  async function handleToggle(planner: PlannerUser) {
    const result = await togglePlannerActive(planner.id, !planner.active);
    if (result.success) {
      setPlanners((prev) => prev.map((p) => p.id === planner.id ? { ...p, active: !p.active } : p));
      toast.success(planner.active ? 'Planner disattivata.' : 'Planner attivata.');
    } else {
      toast.error(result.error ?? 'Errore.');
    }
  }

  // ── Delete planner ────────────────────────────────────────────────────────
  async function handleDelete(planner: PlannerUser) {
    if (!confirm(`Eliminare la planner "${planner.name}"?`)) return;
    const result = await deletePlanner(planner.id, planner.email);
    if (result.success) {
      setPlanners((prev) => prev.filter((p) => p.id !== planner.id));
      toast.success('Planner eliminata.');
    } else {
      toast.error(result.error ?? 'Errore.');
    }
  }

  // ── Edit permissions ──────────────────────────────────────────────────────
  function openEditPerms(planner: PlannerUser) {
    const adminRecord = adminUsers.find((a) => a.email === planner.email);
    setEditPerms(adminRecord?.permissions ?? PLANNER_DEFAULT_PERMISSIONS);
    setEditRole(adminRecord?.role ?? 'planner');
    setEditCCRole('none');
    setEditPermTarget(planner);
  }

  async function handleSavePerms() {
    if (!editPermTarget) return;
    setEditSaving(true);
    const fullName = editPermTarget.name + (editPermTarget.lastName ? ' ' + editPermTarget.lastName : '');
    const result = await grantPlannerAdminAccess(editPermTarget.email, fullName, editRole, editPerms);
    if (result.success) {
      if (editCCRole !== 'none') {
        await setCashControlRole(editPermTarget.email, fullName, editCCRole);
      }
      const toIso3 = (v: any) => (typeof v?.toDate === 'function' ? v.toDate().toISOString() : v ?? null);
      const aSnap3 = await getDocs(query(collection(db, 'admins'), orderBy('createdAt', 'desc')));
      setAdminUsers(aSnap3.docs.map(d => ({ id: d.id, email: d.data().email, name: d.data().name, role: d.data().role, permissions: d.data().permissions, active: d.data().active, mustChangePassword: d.data().mustChangePassword, createdAt: toIso3(d.data().createdAt), lastLogin: toIso3(d.data().lastLogin) } as AdminUser)));
      toast.success(`Permessi di ${editPermTarget.name} aggiornati.`);
      setEditPermTarget(null);
    } else {
      toast.error(result.error ?? 'Errore salvataggio permessi.');
    }
    setEditSaving(false);
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      {/* ── Header ── */}
      <header className="border-b px-6 py-4 flex items-center justify-between" style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}>
        <div className="flex items-center gap-4">
          <Link href="/planner" className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            <ArrowLeft className="size-4" />
            Dashboard
          </Link>
          <div className="h-4 w-px" style={{ background: 'var(--tqf-beige-border)' }} />
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg" style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
              <ClipboardList className="size-4" />
            </div>
            <h1 className="text-xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>Planner</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80" style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
            <Plus className="size-4" />
            Nuova Planner
          </button>
          <button onClick={logout} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors hover:opacity-80" style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)' }}>
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Esci</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Pending requests banner */}
        {pendingCount > 0 && (
          <Link
            href="/planner/requests"
            className="flex items-center gap-3 rounded-2xl px-5 py-4 transition-opacity hover:opacity-90"
            style={{ background: '#fef9ee', border: '2px solid #fbbf24', textDecoration: 'none' }}
          >
            <Bell className="size-5 flex-shrink-0" style={{ color: '#d97706' }} />
            <p className="text-sm font-medium flex-1" style={{ color: '#92400e', fontFamily: 'var(--font-body)' }}>
              {pendingCount} {pendingCount === 1 ? 'richiesta di accesso in attesa' : 'richieste di accesso in attesa'}
            </p>
            <span className="text-xs px-3 py-1 rounded-full" style={{ background: '#d97706', color: 'white', fontFamily: 'var(--font-body)' }}>
              Gestisci →
            </span>
          </Link>
        )}

        {/* ── Add planner form ── */}
        {showAddForm && (
          <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <h2 className="text-lg mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              Aggiungi Planner
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelCls} style={labelStyle}>Nome *</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Maria García" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>Email *</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="planner@example.com" className={inputCls} style={inputStyle} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} style={labelStyle}>Password Temporanea * (min. 6 caratteri)</label>
                <div className="relative">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputCls}
                    style={{ ...inputStyle, paddingRight: '2.5rem' }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  />
                  <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--tqf-muted)' }}>
                    {showNewPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={adding} className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50" style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
                {adding && <Loader2 className="size-4 animate-spin" />}
                Aggiungi
              </button>
              <button onClick={() => { setShowAddForm(false); setNewEmail(''); setNewName(''); setNewPassword(''); }} className="text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-70" style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)' }}>
                Annulla
              </button>
            </div>
          </div>
        )}

        {/* ── Reset password modal ── */}
        {resetTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,15,10,0.6)' }} onClick={() => setResetTarget(null)}>
            <div className="rounded-2xl p-6 w-full max-w-md" style={{ background: 'white' }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="size-5" style={{ color: 'var(--tqf-bordeaux)' }} />
                <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>Reset Password</h2>
              </div>
              <p className="text-sm mb-5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                Stai reimpostando la password per <strong>{resetTarget.name}</strong> ({resetTarget.email}).
              </p>
              <div>
                <label className={labelCls} style={labelStyle}>Nuova Password Temporanea * (min. 6 caratteri)</label>
                <div className="relative">
                  <input
                    type={showResetPwd ? 'text' : 'password'}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputCls}
                    style={{ ...inputStyle, paddingRight: '2.5rem' }}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                  />
                  <button type="button" onClick={() => setShowResetPwd(!showResetPwd)} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--tqf-muted)' }}>
                    {showResetPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={handleReset} disabled={resetting} className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50" style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
                  {resetting ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  Reimposta
                </button>
                <button onClick={() => { setResetTarget(null); setResetPassword(''); }} className="text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-70" style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)' }}>
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Edit permissions modal ── */}
        {editPermTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: 'rgba(26,15,10,0.6)' }}>
            <div className="rounded-2xl p-6 w-full max-w-lg my-4" style={{ background: 'white' }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="size-5" style={{ color: 'var(--tqf-bordeaux)' }} />
                <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
                  Modifica permessi
                </h2>
              </div>
              <p className="text-sm mb-5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                Modifica il ruolo e i permessi di <strong>{editPermTarget.name}</strong> ({editPermTarget.email}).
              </p>

              <div className="mb-4">
                <label className={labelCls} style={labelStyle}>Ruolo admin</label>
                <select value={editRole} onChange={(e) => setEditRole(e.target.value as AdminRole)} className={inputCls} style={inputStyle}>
                  <option value="planner">Planner</option>
                  <option value="team">Team</option>
                </select>
              </div>

              <div className="mb-5">
                <label className={labelCls} style={{ ...labelStyle, marginBottom: '0.625rem' }}>Permessi per sezione</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ALL_PERMISSIONS.map(({ key, label }) => (
                    <div key={key}>
                      <label className={labelCls} style={labelStyle}>{label}</label>
                      <select value={editPerms[key]} onChange={(e) => setEditPerms({ ...editPerms, [key]: e.target.value as any })} className={inputCls} style={inputStyle}>
                        {PERMISSION_LEVELS.map((lvl) => (
                          <option key={lvl} value={lvl}>{lvl === 'none' ? 'Nessuno' : lvl === 'view' ? 'Lettura' : 'Editor'}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-5 p-4 rounded-xl" style={{ background: '#faf5ff', border: '1px solid #e9d5ff' }}>
                <label className={labelCls} style={{ ...labelStyle, color: '#7c3aed', marginBottom: '0.5rem' }}>Accesso Cash Control</label>
                <p className="text-xs mb-2" style={{ color: '#7c3aed', fontFamily: 'var(--font-body)', opacity: 0.8 }}>
                  Seleziona solo se vuoi modificare l&apos;accesso Cash Control (altrimenti lascia su Nessuno).
                </p>
                <select value={editCCRole} onChange={(e) => setEditCCRole(e.target.value as any)} className={inputCls} style={inputStyle}>
                  <option value="none">— Non modificare —</option>
                  <option value="team">Equipo — vede eventi assegnati, registra entrate/uscite</option>
                  <option value="admin">Admin — crea eventi, gestisce tutti i bilanci</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button onClick={handleSavePerms} disabled={editSaving} className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50" style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
                  {editSaving ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                  Salva permessi
                </button>
                <button onClick={() => setEditPermTarget(null)} disabled={editSaving} className="text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-70" style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)' }}>
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Planner list ── */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-6 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
          </div>
        ) : planners.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <div className="mx-auto mb-4 size-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
              <ClipboardList className="size-6" />
            </div>
            <h2 className="text-xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>Nessuna planner ancora</h2>
            <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>Aggiungi la prima planner per iniziare.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {planners.map((planner) => {
              const evts   = plannerEvents(planner.id);
              const isOpen = expandedPlanner === planner.id;
              return (
                <div key={planner.id} className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
                  {/* Row */}
                  <div className="px-5 py-4 flex items-center justify-between gap-4 cursor-pointer" onClick={() => setExpandedPlanner(isOpen ? null : planner.id)}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium" style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                        {planner.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>{planner.name}</p>
                          {planner.teamRole && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                              {planner.teamRole === 'xb_planner' ? 'XB' : planner.teamRole === 'teqf_user' ? 'TeQF' : 'Entrambi'}
                            </span>
                          )}
                          {planner.mustChangePassword && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: '#fef9ee', color: '#b45309', fontFamily: 'var(--font-body)' }}>
                              pwd temp
                            </span>
                          )}
                        </div>
                        <p className="text-xs truncate" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{planner.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="hidden sm:flex items-center gap-1.5 text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                        <Calendar className="size-3.5" />
                        {evts.length} {evts.length === 1 ? 'evento' : 'eventi'}
                      </span>

                      <span className="text-xs px-2 py-0.5 rounded-full" style={planner.active ? { background: '#f0fdf4', color: '#15803d', fontFamily: 'var(--font-body)' } : { background: '#f3f4f6', color: '#6b7280', fontFamily: 'var(--font-body)' }}>
                        {planner.active ? 'Attiva' : 'Inattiva'}
                      </span>

                      <button onClick={(e) => { e.stopPropagation(); openEditPerms(planner); }} title="Modifica permessi" className="size-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70" style={{ border: '1px solid #e9d5ff', background: '#faf5ff', color: '#7c3aed' }}>
                        <ShieldCheck className="size-3.5" />
                      </button>

                      <button onClick={(e) => { e.stopPropagation(); setResetPassword(''); setResetTarget(planner); }} title="Reset password" className="size-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70" style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)' }}>
                        <KeyRound className="size-3.5" />
                      </button>

                      <button onClick={(e) => { e.stopPropagation(); handleToggle(planner); }} title={planner.active ? 'Disattiva' : 'Attiva'} className="size-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70" style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)' }}>
                        {planner.active ? <UserX className="size-3.5" /> : <UserCheck className="size-3.5" />}
                      </button>

                      <button onClick={(e) => { e.stopPropagation(); handleDelete(planner); }} className="size-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70" style={{ border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b' }}>
                        <Trash2 className="size-3.5" />
                      </button>

                      {isOpen ? <ChevronDown className="size-4" style={{ color: 'var(--tqf-muted)' }} /> : <ChevronRight className="size-4" style={{ color: 'var(--tqf-muted)' }} />}
                    </div>
                  </div>

                  {/* Events */}
                  {isOpen && (
                    <div className="border-t px-5 py-4 space-y-2" style={{ borderColor: 'var(--tqf-beige-border)', background: 'var(--tqf-beige)' }}>
                      {evts.length === 0 ? (
                        <p className="text-sm py-2" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>Nessun evento ancora.</p>
                      ) : (
                        evts.map((evt) => {
                          const st = STATUS_LABELS[evt.status] ?? STATUS_LABELS.draft;
                          return (
                            <Link key={evt.id} href={`/planner/planners/events/${evt.id}`} className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition-opacity hover:opacity-80" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)', textDecoration: 'none' }}>
                              <div className="flex items-center gap-3 min-w-0">
                                <FileText className="size-4 flex-shrink-0" style={{ color: 'var(--tqf-muted)' }} />
                                <div className="min-w-0">
                                  <p className="text-sm truncate" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>{evt.eventCode || evt.eventName || 'Evento senza nome'}</p>
                                  <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                                    {evt.clientName && `${evt.clientName} · `}
                                    {evt.days && evt.days.length > 0
                                      ? `${evt.days.length} ${evt.days.length === 1 ? 'giorno' : 'giorni'}`
                                      : evt.eventDate && new Date(evt.eventDate).toLocaleDateString('it-IT')}
                                    {evt.city && ` · ${cityLabel(evt.city)}`}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: st.bg, color: st.text, fontFamily: 'var(--font-body)' }}>{st.label}</span>
                            </Link>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
