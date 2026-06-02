'use client';

import {
  addTeqfCashMovement,
  deleteTeqfCashMovement,
  updateTeqfCashMovement,
} from '@/actions/planner/teqf-projects';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { db } from '@/firebase/client';
import { TeqfCashMovement, TeqfMovementType } from '@/lib/teqf-types';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  return `€${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(d: string): string {
  if (!d) return '—';
  return new Date(d + 'T12:00').toLocaleDateString('it-IT', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
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

// ─── Quick tags ───────────────────────────────────────────────────────────────

const QUICK_TAGS = ['Flores', 'Ferreteria', 'Comida', 'Uber'];

// ─── Movement modal ───────────────────────────────────────────────────────────

interface MovForm {
  date: string;
  description: string;
  amount: string;
  type: TeqfMovementType;
}

function MovementModal({
  projectId, existing, createdBy, createdByName, onClose, onSaved,
}: {
  projectId: string;
  existing?: TeqfCashMovement;
  createdBy: string;
  createdByName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<MovForm>({
    date:        existing?.date        ?? todayISO(),
    description: existing?.description ?? '',
    amount:      existing?.amount      ? String(existing.amount) : '',
    type:        existing?.type        ?? 'expense',
  });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof MovForm>(k: K, v: MovForm[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.description.trim()) { toast.error('La descrizione è obbligatoria.'); return; }
    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      toast.error('Importo non valido.'); return;
    }
    setSaving(true);
    const data = {
      date:        form.date,
      description: form.description.trim(),
      amount,
      type:        form.type,
      assignedTo:  createdByName,
      status:      'completed' as const,
    };
    const r = existing
      ? await updateTeqfCashMovement(projectId, existing.id, data)
      : await addTeqfCashMovement(projectId, { ...data, createdBy });

    if (r.success) { toast.success(existing ? 'Aggiornato.' : 'Movimento aggiunto.'); onSaved(); onClose(); }
    else toast.error(r.error ?? 'Errore salvataggio.');
    setSaving(false);
  }

  const isIncome = form.type === 'income';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl overflow-y-auto"
        style={{ background: 'white', maxHeight: '90dvh' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--tqf-beige-border)' }} />
        </div>
        <div className="px-5 pb-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              {existing ? 'Modifica movimento' : 'Aggiungi movimento'}
            </h2>
            <button onClick={onClose} style={{ color: 'var(--tqf-muted)' }}><X className="size-5" /></button>
          </div>

          {/* Tipo: Uscita / Entrata */}
          <div>
            <label style={lbl}>Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {(['expense', 'income'] as TeqfMovementType[]).map(t => {
                const active = form.type === t;
                const isInc  = t === 'income';
                return (
                  <button key={t} type="button"
                    onClick={() => set('type', t)}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium"
                    style={{
                      border: `1.5px solid ${active ? (isInc ? '#15803d' : '#991b1b') : 'var(--tqf-beige-border)'}`,
                      background: active ? (isInc ? '#f0fdf4' : '#fef2f2') : 'white',
                      color: active ? (isInc ? '#15803d' : '#991b1b') : 'var(--tqf-muted)',
                      fontFamily: 'var(--font-body)',
                    }}>
                    {isInc ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                    {isInc ? 'Entrata' : 'Uscita'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Importo */}
          <div>
            <label style={lbl}>Importo (€) *</label>
            <input
              type="number" inputMode="decimal" min="0" step="0.01"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              placeholder="0.00"
              style={{
                ...inputSt,
                fontSize: '1.4rem', fontWeight: 700, textAlign: 'center' as const,
                color: isIncome ? '#15803d' : '#991b1b',
              }}
            />
          </div>

          {/* Descrizione + quick tags */}
          <div>
            <label style={lbl}>Descrizione *</label>
            <input type="text" value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="es. Acquisto fiori" autoFocus={!existing} style={inputSt} />
            <div className="flex gap-2 mt-2 flex-wrap">
              {QUICK_TAGS.map(tag => {
                const active = form.description === tag;
                return (
                  <button key={tag} type="button"
                    onClick={() => set('description', active ? '' : tag)}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      border: `1px solid ${active ? 'var(--tqf-bordeaux)' : 'var(--tqf-beige-border)'}`,
                      background: active ? 'var(--tqf-cipria-light)' : 'white',
                      color: active ? 'var(--tqf-bordeaux)' : 'var(--tqf-muted)',
                      fontFamily: 'var(--font-body)',
                    }}>
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Data */}
          <div>
            <label style={lbl}>Data</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inputSt} />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {existing ? 'Salva modifiche' : 'Aggiungi'}
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

export default function CashControlDetailPage() {
  const params    = useParams();
  const projectId = params?.projectId as string;

  const {
    isSuperAdmin, canManageCashControl,
    plannerUser, adminUser,
    isLoading: authLoading,
  } = usePlannerAuth();

  const [projectName, setProjectName] = useState('');
  const [movements,   setMovements]   = useState<TeqfCashMovement[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [editMov,     setEditMov]     = useState<TeqfCashMovement | undefined>();

  const canAccess = isSuperAdmin || canManageCashControl;
  const canEdit   = canManageCashControl;

  useEffect(() => {
    if (authLoading || !projectId) return;
    const unsubProject = onSnapshot(
      doc(db, 'teqfProjects', projectId),
      snap => { if (snap.exists()) setProjectName(snap.data().name ?? ''); }
    );
    const unsubMov = onSnapshot(
      query(collection(db, 'teqfProjects', projectId, 'cashControl'), orderBy('date', 'desc')),
      snap => {
        setMovements(snap.docs.map(d => ({ id: d.id, ...d.data() } as TeqfCashMovement)));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => { unsubProject(); unsubMov(); };
  }, [projectId, authLoading]);

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
          <Link href="/planner/cash-control" className="text-sm"
            style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
            ← Cash Control
          </Link>
        </div>
      </div>
    );
  }

  const createdBy     = adminUser?.id   ?? plannerUser?.id   ?? '';
  const createdByName = adminUser?.name ?? plannerUser?.name ?? '';

  const totalIncome  = movements.filter(m => m.type === 'income').reduce((s, m) => s + m.amount, 0);
  const totalExpense = movements.filter(m => m.type === 'expense').reduce((s, m) => s + m.amount, 0);
  const saldo        = totalIncome - totalExpense;

  function openAdd()  { setEditMov(undefined); setShowModal(true); }
  function openEdit(m: TeqfCashMovement) { setEditMov(m); setShowModal(true); }

  async function handleDelete(m: TeqfCashMovement) {
    if (!confirm(`Eliminare "${m.description}"?`)) return;
    const r = await deleteTeqfCashMovement(projectId, m.id);
    if (r.success) toast.success('Rimosso.');
    else toast.error(r.error ?? 'Errore.');
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: 'var(--tqf-beige)' }}>

      {/* Header */}
      <header className="sticky top-0 z-10 px-4 pt-3 pb-3"
        style={{ background: 'white', borderBottom: '1px solid var(--tqf-beige-border)' }}>
        <div className="flex items-center gap-3 mb-2">
          <Link href="/planner/cash-control" className="flex-shrink-0" style={{ color: 'var(--tqf-muted)' }}>
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: '#f0fdf4', color: '#15803d' }}>
              <Wallet className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontWeight: 400 }}>
                {projectName || 'Cash Control'}
              </p>
              <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {movements.length} {movements.length === 1 ? 'movimento' : 'movimenti'}
              </p>
            </div>
          </div>
          {canEdit && (
            <button onClick={openAdd}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl flex-shrink-0"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
              <Plus className="size-3.5" /> Aggiungi
            </button>
          )}
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-2 rounded-xl px-3 py-2.5"
          style={{ background: 'var(--tqf-beige)' }}>
          {[
            { label: 'Entrate', value: fmtCurrency(totalIncome),  color: '#15803d' },
            { label: 'Uscite',  value: fmtCurrency(totalExpense), color: '#991b1b' },
            { label: 'Saldo',   value: fmtCurrency(saldo),        color: saldo >= 0 ? '#15803d' : '#991b1b' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className="text-sm font-semibold" style={{ color, fontFamily: 'var(--font-body)' }}>{value}</p>
              <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{label}</p>
            </div>
          ))}
        </div>
      </header>

      {/* Movements list */}
      <div className="px-4 pt-4 space-y-2">
        {movements.length === 0 ? (
          <div className="rounded-2xl p-10 text-center"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <div className="mx-auto mb-4 size-12 rounded-2xl flex items-center justify-center"
              style={{ background: '#f0fdf4', color: '#15803d' }}>
              <Wallet className="size-6" />
            </div>
            <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Nessun movimento ancora. Usa il pulsante &ldquo;Aggiungi&rdquo;.
            </p>
          </div>
        ) : movements.map(m => {
          const isInc  = m.type === 'income';
          const isComp = m.status === 'completed';
          return (
            <div key={m.id} className="rounded-2xl px-4 py-3"
              style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: isInc ? '#f0fdf4' : '#fef2f2' }}>
                  {isInc
                    ? <TrendingUp className="size-4" style={{ color: '#15803d' }} />
                    : <TrendingDown className="size-4" style={{ color: '#991b1b' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate"
                      style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                      {m.description}
                    </p>
                    <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={isComp
                        ? { background: '#f0fdf4', color: '#15803d', fontFamily: 'var(--font-body)' }
                        : { background: '#fef9ee', color: '#b45309', fontFamily: 'var(--font-body)' }}>
                      {isComp ? 'Completato' : 'In attesa'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                    <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                      {fmtDate(m.date)}
                    </span>
                    {m.assignedTo && (
                      <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                        · {m.assignedTo}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <p className="text-sm font-bold"
                    style={{ color: isInc ? '#15803d' : '#991b1b', fontFamily: 'var(--font-body)' }}>
                    {isInc ? '+' : '-'}{fmtCurrency(m.amount)}
                  </p>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(m)}
                        className="p-1.5 rounded-lg"
                        style={{ color: 'var(--tqf-bordeaux)', background: 'var(--tqf-cipria-light)' }}>
                        <Pencil className="size-3" />
                      </button>
                      <button onClick={() => handleDelete(m)}
                        className="p-1.5 rounded-lg"
                        style={{ color: '#991b1b', background: '#fef2f2' }}>
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <MovementModal
          projectId={projectId}
          existing={editMov}
          createdBy={createdBy}
          createdByName={createdByName}
          onClose={() => setShowModal(false)}
          onSaved={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
