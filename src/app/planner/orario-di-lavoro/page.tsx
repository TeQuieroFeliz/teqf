'use client';

import { createTeqfProject } from '@/actions/planner/teqf-projects';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useI18n } from '@/hooks/useI18n';
import { db } from '@/firebase/client';
import { TeqfProject } from '@/lib/teqf-types';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  Loader2,
  Plus,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string): string {
  if (!d) return '—';
  return new Date(d + 'T12:00').toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputSt = {
  width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.625rem',
  border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)',
  fontSize: '0.9rem', color: 'var(--tqf-dark)', background: 'white', outline: 'none',
};
const lbl = {
  display: 'block', fontSize: '0.6rem', textTransform: 'uppercase' as const,
  letterSpacing: '0.1em', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)',
  marginBottom: '0.3rem',
};

// ─── Create modal ─────────────────────────────────────────────────────────────

function CreateProjectModal({
  onClose, onCreated, createdBy, createdByName,
}: {
  onClose: () => void;
  onCreated: () => void;
  createdBy: string;
  createdByName: string;
}) {
  const { t } = useI18n();
  const [name,      setName]      = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd,   setDateEnd]   = useState('');
  const [saving,    setSaving]    = useState(false);

  async function handleSave() {
    if (!name.trim()) { toast.error(t('orario_nameRequired')); return; }
    setSaving(true);
    const r = await createTeqfProject({
      name: name.trim(), dateStart, dateEnd, createdBy, createdByName,
    });
    if (r.success) { toast.success(t('orario_created')); onCreated(); onClose(); }
    else toast.error(r.error ?? t('orario_createError'));
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl"
        style={{ background: 'white' }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--tqf-beige-border)' }} />
        </div>
        <div className="px-5 pb-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              {t('orario_newProjectTitle')}
            </h2>
            <button onClick={onClose} style={{ color: 'var(--tqf-muted)' }}><X className="size-5" /></button>
          </div>
          <div>
            <label style={lbl}>{t('orario_projectName')}</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder={t('orario_projectNamePlaceholder')} autoFocus style={inputSt}
              onKeyDown={e => e.key === 'Enter' && handleSave()} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={lbl}>{t('orario_startDate')}</label>
              <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} style={inputSt} />
            </div>
            <div>
              <label style={lbl}>{t('orario_endDate')}</label>
              <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} style={inputSt} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {t('orario_create')}
            </button>
            <button onClick={onClose}
              className="px-5 py-3.5 rounded-2xl text-sm"
              style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {t('cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrarioDiLavoroPage() {
  const {
    isSuperAdmin, canManageCashControl,
    plannerUser, adminUser,
    isLoading: authLoading,
  } = usePlannerAuth();
  const { t } = useI18n();
  const [projects,    setProjects]    = useState<TeqfProject[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);

  const canAccess = isSuperAdmin || canManageCashControl;

  useEffect(() => {
    if (authLoading) return;
    if (!canAccess) { setLoading(false); return; }
    const unsub = onSnapshot(
      query(collection(db, 'teqfProjects'), orderBy('createdAt', 'desc')),
      snap => {
        setProjects(snap.docs
          .map(d => ({ id: d.id, ...d.data() } as TeqfProject))
          .filter(p => p.status === 'active'));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [canAccess, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <div className="text-center">
          <p className="text-base mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)' }}>
            {t('orario_unauthorized')}
          </p>
          <Link href="/planner" className="text-sm" style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
            {t('orario_backDashboard')}
          </Link>
        </div>
      </div>
    );
  }

  const createdBy     = adminUser?.id   ?? plannerUser?.id   ?? '';
  const createdByName = adminUser?.name ?? plannerUser?.name ?? 'TeQF';

  return (
    <div className="min-h-screen pb-8" style={{ background: 'var(--tqf-beige)' }}>

      {/* Header */}
      <header className="sticky top-0 z-10 px-4 sm:px-6 py-4 flex items-center justify-between"
        style={{ background: 'white', borderBottom: '1px solid var(--tqf-beige-border)' }}>
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/planner"
            className="flex items-center gap-1.5 text-sm flex-shrink-0"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            <ArrowLeft className="size-4" /> {t('dashboard')}
          </Link>
          <div className="h-4 w-px flex-shrink-0" style={{ background: 'var(--tqf-beige-border)' }} />
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg flex-shrink-0"
              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
              <Clock className="size-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
                {t('orario_title')}
              </h1>
              <p className="text-xs hidden sm:block" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {t('orario_subtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSelector />
          {canManageCashControl && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl flex-shrink-0"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">{t('orario_newProject')}</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {projects.length === 0 ? (
          <div className="rounded-2xl p-12 text-center"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <div className="mx-auto mb-4 size-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
              <Users className="size-6" />
            </div>
            <p className="text-base mb-1"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              {t('orario_noProjects')}
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {t('orario_noProjectsDesc')}
            </p>
            {canManageCashControl && (
              <button onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-xl"
                style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
                <Plus className="size-4" /> {t('orario_createFirst')}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm mb-2" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {t('orario_projectsHint', { n: projects.length })}
            </p>
            {projects.map(p => (
              <Link key={p.id}
                href={`/planner/orario-di-lavoro/${p.id}`}
                className="flex items-center justify-between rounded-2xl px-5 py-4 transition-all hover:shadow-md active:scale-[0.99]"
                style={{ background: 'white', border: '1px solid var(--tqf-beige-border)', textDecoration: 'none' }}>
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-2.5 rounded-xl flex-shrink-0"
                    style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
                    <Clock className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-medium truncate"
                      style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-display)', fontWeight: 400 }}>
                      {p.name}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      {(p.dateStart || p.dateEnd) && (
                        <span className="flex items-center gap-1 text-xs"
                          style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                          <Calendar className="size-3" />
                          {p.dateStart ? fmtDate(p.dateStart) : '—'}
                          {p.dateEnd && ` → ${fmtDate(p.dateEnd)}`}
                        </span>
                      )}
                      {p.createdByName && (
                        <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                          {p.createdByName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className="text-xs px-2.5 py-1 rounded-lg hidden sm:block"
                    style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                    {t('orario_schedule')}
                  </span>
                  <ArrowRight className="size-4 sm:hidden" style={{ color: 'var(--tqf-muted)' }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {}}
          createdBy={createdBy}
          createdByName={createdByName}
        />
      )}
    </div>
  );
}
