'use client';

// PART-3: IT/ES language switch + date localization
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { db } from '@/firebase/client';
import { TeqfProject } from '@/lib/teqf-types';
import { useT } from '@/hooks/useT';
import IT from '@/locales/cash-control/it.json';
import ES from '@/locales/cash-control/es.json';
import { format as fmtDateFns, parseISO } from 'date-fns';
import { es as dateES, it as dateIT } from 'date-fns/locale';
import { addDoc, collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string, lang: 'it' | 'es'): string {
  if (!d) return '—';
  try {
    return fmtDateFns(parseISO(d), 'dd MMM yyyy', { locale: lang === 'it' ? dateIT : dateES });
  } catch {
    return d;
  }
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
  onClose, createdBy, createdByName,
}: {
  onClose: () => void;
  createdBy: string;
  createdByName: string;
}) {
  const [name,      setName]      = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd,   setDateEnd]   = useState('');
  const [saving,    setSaving]    = useState(false);

  async function handleSave() {
    if (!name.trim()) { toast.error('Il nome è obbligatorio.'); return; }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, 'teqfProjects'), {
        name: name.trim(), dateStart, dateEnd, createdBy, createdByName,
        status: 'active', createdAt: now, updatedAt: now,
      });
      toast.success('Progetto creato.');
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? 'Errore creazione.');
    } finally {
      setSaving(false);
    }
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
              Nuovo progetto
            </h2>
            <button onClick={onClose} style={{ color: 'var(--tqf-muted)' }}><X className="size-5" /></button>
          </div>
          <div>
            <label style={lbl}>Nome progetto *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="es. Bilancio Matrimonio Rossi" autoFocus style={inputSt}
              onKeyDown={e => e.key === 'Enter' && handleSave()} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={lbl}>Data inizio</label>
              <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} style={inputSt} />
            </div>
            <div>
              <label style={lbl}>Data fine</label>
              <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} style={inputSt} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Crea
            </button>
            <button onClick={onClose}
              className="px-5 py-3.5 rounded-2xl text-sm"
              style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Annulla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Rename modal ─────────────────────────────────────────────────────────────

function RenameModal({ project, onClose }: { project: TeqfProject; onClose: () => void }) {
  const [name,   setName]   = useState(project.name);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) { toast.error('Il nome è obbligatorio.'); return; }
    if (trimmed === project.name) { onClose(); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'teqfProjects', project.id), {
        name: trimmed, updatedAt: new Date().toISOString(),
      });
      toast.success('Nome aggiornato.');
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? 'Errore durante il salvataggio.');
    } finally {
      setSaving(false);
    }
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
              Rinomina progetto
            </h2>
            <button onClick={onClose} style={{ color: 'var(--tqf-muted)' }}><X className="size-5" /></button>
          </div>
          <div>
            <label style={lbl}>Nome progetto *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              autoFocus style={inputSt}
              onKeyDown={e => e.key === 'Enter' && handleSave()} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Salva
            </button>
            <button onClick={onClose}
              className="px-5 py-3.5 rounded-2xl text-sm"
              style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Annulla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CashControlPage() {
  const {
    isSuperAdmin, canManageCashControl,
    plannerUser, adminUser,
    isLoading: authLoading,
  } = usePlannerAuth();

  // PART-3: IT/ES language switch
  const { t, lang, setLang } = useT({ it: IT, es: ES });

  const [projects,        setProjects]        = useState<TeqfProject[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [showCreate,      setShowCreate]      = useState(false);
  const [renamingProject, setRenamingProject] = useState<TeqfProject | null>(null);

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
            Accesso non autorizzato
          </p>
          <Link href="/planner" className="text-sm" style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
            ← Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const createdBy     = adminUser?.id    ?? plannerUser?.id    ?? '';
  const createdByName = adminUser?.name  ?? plannerUser?.name  ?? 'TeQF';

  async function handleDeleteProject(p: TeqfProject) {
    if (!confirm(`Eliminare il progetto "${p.name}"? Questa azione non è reversibile.`)) return;
    try {
      await updateDoc(doc(db, 'teqfProjects', p.id), {
        status: 'archived', updatedAt: new Date().toISOString(),
      });
      toast.success('Progetto eliminato.');
    } catch (e: any) {
      toast.error(e.message ?? 'Errore durante l\'eliminazione.');
    }
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: 'var(--tqf-beige)' }}>

      {/* Header */}
      <header className="sticky top-0 z-10 px-4 sm:px-6 py-4 flex items-center justify-between"
        style={{ background: 'white', borderBottom: '1px solid var(--tqf-beige-border)' }}>
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/planner"
            className="flex items-center gap-1.5 text-sm flex-shrink-0"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            <ArrowLeft className="size-4" /> Dashboard
          </Link>
          <div className="h-4 w-px flex-shrink-0" style={{ background: 'var(--tqf-beige-border)' }} />
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: '#f0fdf4', color: '#15803d' }}>
              <Wallet className="size-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
                Cash Control
              </h1>
              <p className="text-xs hidden sm:block" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                Registra movimenti monetari
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* PART-3: IT/ES language toggle */}
          <button onClick={() => setLang(lang === 'it' ? 'es' : 'it')}
            className="text-xs px-2 py-1 rounded-lg"
            style={{
              border: '1px solid var(--tqf-beige-border)',
              color: 'var(--tqf-muted)',
              fontFamily: 'var(--font-body)',
              background: 'white',
            }}>
            {t('langSwitch')}
          </button>
          {canManageCashControl && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Nuovo progetto</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {projects.length === 0 ? (
          <div className="rounded-2xl p-12 text-center"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <div className="mx-auto mb-4 size-12 rounded-2xl flex items-center justify-center"
              style={{ background: '#f0fdf4', color: '#15803d' }}>
              <Wallet className="size-6" />
            </div>
            <p className="text-base mb-1"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              Nessun progetto ancora
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Crea un progetto per iniziare a registrare i movimenti.
            </p>
            {canManageCashControl && (
              <button onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-xl"
                style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
                <Plus className="size-4" /> Crea primo progetto
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm mb-2" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {projects.length} {projects.length === 1 ? 'progetto' : 'progetti'} · seleziona per gestire il cash control
            </p>
            {projects.map(p => (
              <div key={p.id}
                className="flex items-center justify-between rounded-2xl px-5 py-4 transition-all hover:shadow-md"
                style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
                <Link href={`/planner/cash-control/${p.id}`}
                  className="flex items-center gap-4 min-w-0 flex-1"
                  style={{ textDecoration: 'none' }}>
                  <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: '#f0fdf4', color: '#15803d' }}>
                    <Wallet className="size-5" />
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
                          {p.dateStart ? fmtDate(p.dateStart, lang) : '—'}
                          {p.dateEnd && ` → ${fmtDate(p.dateEnd, lang)}`}
                        </span>
                      )}
                      {p.createdByName && (
                        <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                          {p.createdByName}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                  {canManageCashControl && (
                    <>
                      <button
                        onClick={() => setRenamingProject(p)}
                        className="p-2 rounded-lg hover:opacity-70"
                        style={{ color: 'var(--tqf-muted)' }}>
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProject(p)}
                        className="p-2 rounded-lg hover:opacity-70"
                        style={{ color: '#991b1b' }}>
                        <Trash2 className="size-4" />
                      </button>
                    </>
                  )}
                  <span className="text-xs px-2.5 py-1 rounded-lg hidden sm:block"
                    style={{ background: '#f0fdf4', color: '#15803d', fontFamily: 'var(--font-body)' }}>
                    Cash Control →
                  </span>
                  <ArrowRight className="size-4 sm:hidden" style={{ color: 'var(--tqf-muted)' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          createdBy={createdBy}
          createdByName={createdByName}
        />
      )}

      {renamingProject && (
        <RenameModal
          project={renamingProject}
          onClose={() => setRenamingProject(null)}
        />
      )}
    </div>
  );
}
