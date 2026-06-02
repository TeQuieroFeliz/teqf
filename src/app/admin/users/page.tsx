'use client';

import { saveUserManagement, UserStatus, permissionsFor } from '@/actions/planner/user-management';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { db } from '@/firebase/client';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  ArrowLeft,
  Check,
  Loader2,
  Search,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlannerRaw {
  id: string;
  email: string;
  name: string;
  lastName?: string;
  teamRole?: string;
  team?: unknown;
  active?: boolean;
  [k: string]: unknown;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveTeams(u: PlannerRaw): string[] {
  if (Array.isArray(u.team)) return u.team as string[];
  if (u.team === 'XB')   return ['XB'];
  if (u.team === 'TeQF') return ['TeQF'];
  if (u.teamRole === 'xb_planner') return ['XB'];
  if (u.teamRole === 'teqf_user')  return ['TeQF'];
  if (u.teamRole === 'both')       return ['XB', 'TeQF'];
  return [];
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const lbl = {
  display: 'block', marginBottom: '0.3rem',
  fontSize: '0.6rem', textTransform: 'uppercase' as const, letterSpacing: '0.1em',
  color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)',
};

const selectBase = {
  width: '100%', padding: '0.55rem 2rem 0.55rem 0.75rem',
  borderRadius: '0.625rem', border: '1px solid var(--tqf-beige-border)',
  fontFamily: 'var(--font-body)', fontSize: '0.9rem',
  background: 'white', outline: 'none', appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat' as const, backgroundPosition: 'right 0.7rem center',
};

// ─── Team colors ──────────────────────────────────────────────────────────────

const TEAM_COLOR: Record<string, string> = {
  XB:   '#1d4ed8',
  TeQF: 'var(--tqf-bordeaux)',
};
const TEAM_BG: Record<string, string> = {
  XB:   '#eff6ff',
  TeQF: 'var(--tqf-cipria-light)',
};

// ─── Permission rows ──────────────────────────────────────────────────────────

const PERM_ROWS = [
  { key: 'crea',   label: 'Crea / Modifica Eventi',  tag: 'XB',        get: (p: ReturnType<typeof permissionsFor>) => p.canCreateEvents },
  { key: 'view',   label: 'Visualizza Eventi',        tag: 'XB / TeQF', get: (p: ReturnType<typeof permissionsFor>) => p.canViewEvents },
  { key: 'cash',   label: 'Gestione Cash Control',    tag: 'TeQF',      get: (p: ReturnType<typeof permissionsFor>) => p.canManageCashControl },
  { key: 'orario', label: 'Gestione Orario',          tag: 'TeQF',      get: (p: ReturnType<typeof permissionsFor>) => p.canManageOrario },
];

// ─── User card ────────────────────────────────────────────────────────────────

function UserCard({ user }: { user: PlannerRaw }) {
  const [teams,  setTeams]  = useState<string[]>(() => deriveTeams(user));
  const [status, setStatus] = useState<UserStatus>(() => user.active !== false ? 'active' : 'inactive');
  const [saving, setSaving] = useState(false);

  const perms       = useMemo(() => permissionsFor(teams), [teams]);
  const displayName = [user.name, user.lastName].filter(Boolean).join(' ');
  const initial     = (displayName || '?').charAt(0).toUpperCase();

  function toggleTeam(t: string) {
    setTeams(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  async function handleSave() {
    setSaving(true);
    const r = await saveUserManagement(user.id, teams, status);
    if (r.success) toast.success('Permessi salvati.');
    else toast.error(r.error ?? 'Errore salvataggio.');
    setSaving(false);
  }

  // Avatar color = first team assigned, or neutral
  const avatarColor = teams.includes('TeQF') ? TEAM_COLOR.TeQF : teams.includes('XB') ? TEAM_COLOR.XB : 'var(--tqf-muted)';
  const avatarBg    = teams.includes('TeQF') ? TEAM_BG.TeQF    : teams.includes('XB') ? TEAM_BG.XB    : '#f3f4f6';

  return (
    <div className="rounded-2xl" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
      <div className="p-5 space-y-4">

        {/* Avatar + info + team badges */}
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
            style={{ background: avatarBg, color: avatarColor, fontFamily: 'var(--font-body)' }}>
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
              {displayName || '(senza nome)'}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {user.email}
            </p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {teams.map(t => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: TEAM_BG[t] ?? '#f3f4f6', color: TEAM_COLOR[t] ?? '#374151', fontFamily: 'var(--font-body)' }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--tqf-beige-border)' }} />

        {/* Team checkboxes */}
        <div>
          <label style={lbl}>Team</label>
          <div className="flex gap-3">
            {(['XB', 'TeQF'] as const).map(t => {
              const checked = teams.includes(t);
              return (
                <button key={t} type="button" onClick={() => toggleTeam(t)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium flex-1 justify-center"
                  style={{
                    border: `1.5px solid ${checked ? TEAM_COLOR[t] : 'var(--tqf-beige-border)'}`,
                    background: checked ? TEAM_BG[t] : 'white',
                    color: checked ? TEAM_COLOR[t] : 'var(--tqf-muted)',
                    fontFamily: 'var(--font-body)',
                  }}>
                  <div className="size-5 rounded flex items-center justify-center flex-shrink-0"
                    style={{
                      border: `2px solid ${checked ? TEAM_COLOR[t] : '#d1d5db'}`,
                      background: checked ? TEAM_COLOR[t] : 'white',
                    }}>
                    {checked && <Check className="size-3" strokeWidth={3} style={{ color: 'white' }} />}
                  </div>
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Permissions (read-only) */}
        <div>
          <label style={lbl}>Permessi</label>
          <div className="space-y-2">
            {PERM_ROWS.map(({ key, label, tag, get }) => {
              const active = get(perms);
              return (
                <div key={key} className="flex items-center gap-2.5">
                  <div className="size-5 rounded flex items-center justify-center flex-shrink-0"
                    style={{
                      background: active ? 'var(--tqf-bordeaux)' : '#f3f4f6',
                      border: `1px solid ${active ? 'var(--tqf-bordeaux)' : '#d1d5db'}`,
                    }}>
                    {active && <Check className="size-3" strokeWidth={3} style={{ color: 'white' }} />}
                  </div>
                  <span className="text-sm flex-1"
                    style={{ color: active ? 'var(--tqf-dark)' : 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                    {label}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', opacity: 0.6 }}>
                    {tag}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status */}
        <div>
          <label style={lbl}>Stato</label>
          <select value={status} onChange={e => setStatus(e.target.value as UserStatus)}
            style={{ ...selectBase, color: status === 'active' ? '#15803d' : '#991b1b', fontWeight: 600 }}>
            <option value="active"   style={{ color: '#15803d', fontWeight: 600 }}>Attivo</option>
            <option value="inactive" style={{ color: '#991b1b', fontWeight: 600 }}>Inattivo</option>
          </select>
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          Salva
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { isSuperAdmin, isLoading: authLoading } = usePlannerAuth();
  const [users,   setUsers]   = useState<PlannerRaw[]>([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'planners'), snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as PlannerRaw))
        .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
      setUsers(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <div className="text-center">
          <p className="text-base mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)' }}>
            Accesso non autorizzato
          </p>
          <Link href="/planner" className="text-sm" style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
            ← Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const q = search.toLowerCase();
  const filtered = search
    ? users.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      )
    : users;

  return (
    <div className="min-h-screen pb-10" style={{ background: 'var(--tqf-beige)' }}>

      {/* Sticky header */}
      <header className="sticky top-0 z-10 px-4 pt-4 pb-3"
        style={{ background: 'white', borderBottom: '1px solid var(--tqf-beige-border)' }}>

        <div className="flex items-start gap-3 mb-3">
          <Link href="/planner" className="mt-1 flex-shrink-0" style={{ color: 'var(--tqf-muted)' }}>
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-widest mb-0.5"
              style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', letterSpacing: '0.15em' }}>
              Amministrazione
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400, fontSize: '1.25rem', lineHeight: 1.2 }}>
              Gestione Utenti
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Assegna team e permessi — XB / TeQF / entrambi
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl flex-shrink-0"
            style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
            <Users className="size-4" />
            <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
              {users.length}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: 'var(--tqf-muted)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per nome o email…"
            style={{
              width: '100%', padding: '0.6rem 2.25rem 0.6rem 2.25rem',
              borderRadius: '0.75rem', border: '1px solid var(--tqf-beige-border)',
              fontFamily: 'var(--font-body)', fontSize: '0.875rem',
              color: 'var(--tqf-dark)', background: 'var(--tqf-beige)', outline: 'none',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="size-4" style={{ color: 'var(--tqf-muted)' }} />
            </button>
          )}
        </div>
      </header>

      {search && (
        <div className="px-4 pt-3">
          <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            {filtered.length} {filtered.length === 1 ? 'risultato' : 'risultati'} per &ldquo;{search}&rdquo;
          </p>
        </div>
      )}

      <div className="px-4 pt-4">
        {filtered.length === 0 ? (
          <div className="rounded-2xl p-10 text-center"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {search ? 'Nessun utente trovato.' : 'Nessun utente registrato.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(u => <UserCard key={u.id} user={u} />)}
          </div>
        )}
      </div>
    </div>
  );
}
