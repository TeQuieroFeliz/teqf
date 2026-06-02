'use client';

import {
  addNominaEntry,
  deleteNominaEntry,
  updateNominaEntry,
} from '@/actions/planner/event-nomina';
import { getPlannerEvent } from '@/actions/planner/planner-event-crud';
import { db } from '@/firebase/client';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import {
  CashMovement,
  NominaEntry,
  NominaRole,
  NominaTurno,
  NOMINA_ROLES,
  PlannerEvent,
} from '@/lib/planner-types';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  Download,
  Loader2,
  MapPin,
  Minus,
  Pencil,
  Plus,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// ─── helpers ──────────────────────────────────────────────────────────────────

function calcOre(entrata: string, uscita: string): number {
  if (!entrata || !uscita) return 0;
  const [eh, em] = entrata.split(':').map(Number);
  const [uh, um] = uscita.split(':').map(Number);
  let mins = uh * 60 + um - (eh * 60 + em);
  if (mins < 0) mins += 1440;
  return parseFloat((mins / 60).toFixed(2));
}
function fmtOre(h: number) {
  if (!h) return '—';
  const hrs = Math.floor(h);
  const m   = Math.round((h - hrs) * 60);
  return m > 0 ? `${hrs}h ${m}m` : `${hrs}h`;
}
function oreColor(h: number) {
  if (h >= 12) return '#991b1b';
  if (h >= 10) return '#b45309';
  if (h > 0)  return '#15803d';
  return 'var(--tqf-muted)';
}
function oreBg(h: number) {
  if (h >= 12) return '#fef2f2';
  if (h >= 10) return '#fef9ee';
  if (h > 0)  return '#f0fdf4';
  return '#f3f4f6';
}
function fmtCurrency(n: number) {
  return `$${Math.abs(n).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;
}
function fmtDataOra(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })
    + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

const ROLE_COLORS: Record<NominaRole, { bg: string; text: string }> = {
  Fiorista:   { bg: '#fdf2f4', text: 'var(--tqf-bordeaux)' },
  Staff:      { bg: '#eff6ff', text: '#1d4ed8' },
  Supervisore:{ bg: '#f0fdf4', text: '#15803d' },
};

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

type ModalMode = 'add' | 'edit';

type FormState = {
  name: string;
  role: NominaRole;
  entrataAM: string;
  uscitaAM: string;
  entrataPM: string;
  uscitaPM: string;
  desmontaje: number;
};

const EMPTY_FORM: FormState = {
  name: '', role: 'Fiorista',
  entrataAM: '', uscitaAM: '',
  entrataPM: '', uscitaPM: '',
  desmontaje: 0,
};

function NominaModal({
  mode,
  eventId,
  entry,
  createdBy,
  onClose,
  onSaved,
}: {
  mode: ModalMode;
  eventId: string;
  entry?: NominaEntry;
  createdBy: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => {
    if (mode === 'edit' && entry) {
      return {
        name: entry.name,
        role: entry.role,
        entrataAM: entry.turnoAM.entrata,
        uscitaAM:  entry.turnoAM.uscita,
        entrataPM: entry.turnoPM.entrata,
        uscitaPM:  entry.turnoPM.uscita,
        desmontaje: entry.desmontaje,
      };
    }
    return EMPTY_FORM;
  });
  const [saving, setSaving] = useState(false);

  const oreAM    = calcOre(form.entrataAM, form.uscitaAM);
  const orePM    = calcOre(form.entrataPM, form.uscitaPM);
  const totale   = parseFloat((oreAM + orePM).toFixed(2));

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Il nome è obbligatorio.'); return; }

    const turnoAM: NominaTurno = { entrata: form.entrataAM, uscita: form.uscitaAM, ore: oreAM };
    const turnoPM: NominaTurno = { entrata: form.entrataPM, uscita: form.uscitaPM, ore: orePM };

    setSaving(true);
    let result: { success: boolean; error?: string };
    if (mode === 'add') {
      result = await addNominaEntry(eventId, {
        name: form.name.trim(), role: form.role,
        turnoAM, turnoPM, totaleOre: totale,
        desmontaje: form.desmontaje, createdBy,
      });
    } else {
      result = await updateNominaEntry(eventId, entry!.id, {
        name: form.name.trim(), role: form.role,
        turnoAM, turnoPM, totaleOre: totale,
        desmontaje: form.desmontaje,
      });
    }

    if (result.success) {
      toast.success(mode === 'add' ? 'Persona aggiunta.' : 'Aggiornato.');
      onSaved();
      onClose();
    } else {
      toast.error(result.error ?? 'Errore.');
    }
    setSaving(false);
  }

  const inputSt: React.CSSProperties = {
    width: '100%', padding: '0.55rem 0.75rem',
    borderRadius: '0.625rem', border: '1px solid var(--tqf-beige-border)',
    fontFamily: 'var(--font-body)', fontSize: '0.9rem',
    color: 'var(--tqf-dark)', background: 'white', outline: 'none',
  };
  const lbl: React.CSSProperties = {
    fontSize: '0.6rem', fontFamily: 'var(--font-body)', color: 'var(--tqf-muted)',
    textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.3rem',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl overflow-y-auto"
        style={{ background: 'white', maxHeight: '92dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--tqf-beige-border)' }} />
        </div>

        <div className="px-5 pb-8 space-y-4">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              {mode === 'add' ? 'Aggiungi persona' : 'Modifica persona'}
            </h2>
            <button onClick={onClose} style={{ color: 'var(--tqf-muted)' }}>
              <X className="size-5" />
            </button>
          </div>

          {/* Name */}
          <div>
            <label style={lbl}>Nome e cognome *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Maria García"
              autoFocus={mode === 'add'}
              style={inputSt}
            />
          </div>

          {/* Role */}
          <div>
            <label style={lbl}>Ruolo *</label>
            <div className="grid grid-cols-3 gap-2">
              {NOMINA_ROLES.map(r => {
                const c = ROLE_COLORS[r];
                const active = form.role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => set('role', r)}
                    className="py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{
                      border: `1.5px solid ${active ? c.text : 'var(--tqf-beige-border)'}`,
                      background: active ? c.bg : 'white',
                      color: active ? c.text : 'var(--tqf-muted)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* AM shift */}
          <div>
            <label style={lbl}>🌅 Turno Mattina</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label style={{ ...lbl, marginBottom: '0.2rem' }}>Entrata</label>
                <input type="time" value={form.entrataAM}
                  onChange={e => set('entrataAM', e.target.value)}
                  style={{ ...inputSt, fontWeight: 600, textAlign: 'center' }} />
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: '0.2rem' }}>Uscita</label>
                <input type="time" value={form.uscitaAM}
                  onChange={e => set('uscitaAM', e.target.value)}
                  style={{ ...inputSt, fontWeight: 600, textAlign: 'center' }} />
              </div>
            </div>
            {oreAM > 0 && (
              <p className="text-xs mt-1 text-right font-semibold"
                style={{ color: oreColor(oreAM), fontFamily: 'var(--font-body)' }}>
                {fmtOre(oreAM)}
              </p>
            )}
          </div>

          {/* PM shift */}
          <div>
            <label style={lbl}>🌆 Turno Pomeriggio</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label style={{ ...lbl, marginBottom: '0.2rem' }}>Entrata</label>
                <input type="time" value={form.entrataPM}
                  onChange={e => set('entrataPM', e.target.value)}
                  style={{ ...inputSt, fontWeight: 600, textAlign: 'center' }} />
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: '0.2rem' }}>Uscita</label>
                <input type="time" value={form.uscitaPM}
                  onChange={e => set('uscitaPM', e.target.value)}
                  style={{ ...inputSt, fontWeight: 600, textAlign: 'center' }} />
              </div>
            </div>
            {orePM > 0 && (
              <p className="text-xs mt-1 text-right font-semibold"
                style={{ color: oreColor(orePM), fontFamily: 'var(--font-body)' }}>
                {fmtOre(orePM)}
              </p>
            )}
          </div>

          {/* Total preview */}
          {totale > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: oreBg(totale) }}>
              <Clock className="size-4" style={{ color: oreColor(totale) }} />
              <span className="text-sm font-semibold" style={{ color: oreColor(totale), fontFamily: 'var(--font-body)' }}>
                {fmtOre(totale)} totali
              </span>
            </div>
          )}

          {/* Desmontaje */}
          <div>
            <label style={lbl}>Desmontaje</label>
            <div className="flex items-center gap-0 w-fit">
              <button type="button" disabled={form.desmontaje <= 0}
                onClick={() => set('desmontaje', Math.max(0, form.desmontaje - 1))}
                className="size-10 flex items-center justify-center rounded-l-xl disabled:opacity-30"
                style={{ border: '1px solid var(--tqf-beige-border)', background: 'white' }}>
                <Minus className="size-4" />
              </button>
              <div className="w-12 h-10 flex items-center justify-center text-base font-semibold"
                style={{ borderTop: '1px solid var(--tqf-beige-border)', borderBottom: '1px solid var(--tqf-beige-border)', background: 'var(--tqf-beige)', fontFamily: 'var(--font-body)' }}>
                {form.desmontaje}
              </div>
              <button type="button"
                onClick={() => set('desmontaje', form.desmontaje + 1)}
                className="size-10 flex items-center justify-center rounded-r-xl"
                style={{ border: '1px solid var(--tqf-beige-border)', background: 'white' }}>
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {mode === 'add' ? 'Aggiungi' : 'Salva modifiche'}
            </button>
            <button
              onClick={onClose}
              className="px-5 py-3.5 rounded-2xl text-sm"
              style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
            >
              Annulla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Employee card ────────────────────────────────────────────────────────────

function NominaCard({
  entry, canEdit, onEdit, onDelete,
}: {
  entry: NominaEntry;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const roleColor = ROLE_COLORS[entry.role] ?? ROLE_COLORS.Staff;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>

      {/* Header — always visible */}
      <div
        className="flex items-center justify-between px-4 py-3.5 cursor-pointer"
        style={{ borderBottom: expanded ? '1px solid var(--tqf-beige-border)' : 'none' }}
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="size-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
            style={{ background: roleColor.bg, color: roleColor.text, fontFamily: 'var(--font-body)' }}
          >
            {entry.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                {entry.name}
              </p>
              <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: roleColor.bg, color: roleColor.text, fontFamily: 'var(--font-body)' }}>
                {entry.role}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              {entry.totaleOre > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{ background: oreBg(entry.totaleOre), color: oreColor(entry.totaleOre), fontFamily: 'var(--font-body)' }}>
                  {fmtOre(entry.totaleOre)}
                </span>
              )}
              {entry.turnoAM?.entrata && (
                <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  AM {entry.turnoAM.entrata}–{entry.turnoAM.uscita || '?'}
                </span>
              )}
              {entry.turnoPM?.entrata && (
                <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  PM {entry.turnoPM.entrata}–{entry.turnoPM.uscita || '?'}
                </span>
              )}
              {entry.desmontaje > 0 && (
                <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  {entry.desmontaje} desm.
                </span>
              )}
            </div>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="size-4 flex-shrink-0" style={{ color: 'var(--tqf-muted)' }} />
          : <ChevronDown className="size-4 flex-shrink-0" style={{ color: 'var(--tqf-muted)' }} />
        }
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-3">
          {/* Shift rows */}
          {[
            { label: '🌅 Turno Mattina', turno: entry.turnoAM },
            { label: '🌆 Turno Pomeriggio', turno: entry.turnoPM },
          ].map(({ label, turno }) => (
            <div key={label} className="rounded-xl p-3"
              style={{ background: 'var(--tqf-beige)', border: '1px solid var(--tqf-beige-border)' }}>
              <p className="text-xs mb-2 font-medium" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {label}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>Entrata</p>
                    <p className="text-base font-semibold" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                      {turno?.entrata || '—'}
                    </p>
                  </div>
                  <div className="w-px h-8" style={{ background: 'var(--tqf-beige-border)' }} />
                  <div>
                    <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>Uscita</p>
                    <p className="text-base font-semibold" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                      {turno?.uscita || '—'}
                    </p>
                  </div>
                </div>
                {(turno?.ore ?? 0) > 0 && (
                  <span className="text-sm font-semibold px-2.5 py-1 rounded-lg"
                    style={{ background: oreBg(turno!.ore), color: oreColor(turno!.ore), fontFamily: 'var(--font-body)' }}>
                    {fmtOre(turno!.ore)}
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Totals row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: oreBg(entry.totaleOre) }}>
              <Clock className="size-4" style={{ color: oreColor(entry.totaleOre) }} />
              <span className="text-sm font-semibold" style={{ color: oreColor(entry.totaleOre), fontFamily: 'var(--font-body)' }}>
                {fmtOre(entry.totaleOre)}
              </span>
              <span className="text-xs opacity-70" style={{ color: oreColor(entry.totaleOre), fontFamily: 'var(--font-body)' }}>
                totali
              </span>
            </div>
            {entry.desmontaje > 0 && (
              <span className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {entry.desmontaje} desmontaje
              </span>
            )}
          </div>

          {/* Ultima modifica */}
          <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            Ultima modifica: {fmtDataOra(entry.ultimaModifica)}
          </p>

          {/* Edit / Delete */}
          {canEdit && (
            <div className="flex gap-2 pt-1">
              <button onClick={onEdit}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm"
                style={{ border: '1px solid var(--tqf-cipria)', background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                <Pencil className="size-3.5" /> Editar
              </button>
              <button onClick={onDelete}
                className="flex items-center justify-center px-4 py-2.5 rounded-xl text-sm"
                style={{ border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', fontFamily: 'var(--font-body)' }}>
                <Trash2 className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = 'nomina' | 'gastos';

export default function ProjectPage() {
  const params  = useParams();
  const router  = useRouter();
  const eventId = params?.id as string;

  const {
    plannerUser, adminUser, isSuperAdmin,
    canManageCashControl, canCreateProjects,
    isLoading: authLoading,
  } = usePlannerAuth();

  const [event,     setEvent]     = useState<PlannerEvent | null>(null);
  const [entries,   setEntries]   = useState<NominaEntry[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [cashBudget, setCashBudget] = useState(0);
  const [loading,   setLoading]   = useState(true);

  // Tabs — default to nomina only if user can see it, else gastos
  const canNomina = isSuperAdmin || canManageCashControl;
  const [activeTab, setActiveTab] = useState<Tab>('nomina');

  // Modal state
  const [modalMode, setModalMode]   = useState<ModalMode>('add');
  const [editEntry, setEditEntry]   = useState<NominaEntry | undefined>();
  const [showModal, setShowModal]   = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Load event once
  useEffect(() => {
    if (!eventId) return;
    getPlannerEvent(eventId).then(e => {
      if (!e) { router.replace('/planner'); return; }
      setEvent(e);
      setCashBudget((e as any).cashControlBudget ?? 0);
      setLoading(false);
    });
  }, [eventId, router]);

  // Default tab: gastos for XB-only users
  useEffect(() => {
    if (!authLoading && !canNomina) setActiveTab('gastos');
  }, [authLoading, canNomina]);

  // Real-time nomina
  useEffect(() => {
    if (!eventId || !canNomina) return;
    const unsub = onSnapshot(
      query(collection(db, 'plannerEvents', eventId, 'nomina'), orderBy('createdAt', 'asc')),
      snap => setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as NominaEntry)))
    );
    return () => unsub();
  }, [eventId, canNomina]);

  // Real-time cash movements
  useEffect(() => {
    if (!eventId) return;
    const unsub = onSnapshot(
      query(collection(db, 'plannerEvents', eventId, 'cashControl'), orderBy('timestamp', 'desc')),
      snap => setMovements(snap.docs.map(d => ({ id: d.id, ...d.data() } as CashMovement)))
    );
    return () => unsub();
  }, [eventId]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  const isOwnEvent = plannerUser?.id === event?.plannerId;
  const canView    = isSuperAdmin || canManageCashControl || (canCreateProjects && isOwnEvent);

  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <div className="text-center">
          <p className="text-base mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)' }}>Accesso non autorizzato</p>
          <Link href="/planner" className="text-sm" style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>← Dashboard</Link>
        </div>
      </div>
    );
  }

  const createdBy   = adminUser?.id ?? plannerUser?.id ?? '';
  const totalOre    = entries.reduce((s, e) => s + (e.totaleOre ?? 0), 0);
  const totalDesm   = entries.reduce((s, e) => s + (e.desmontaje ?? 0), 0);
  const totalSpent  = movements.reduce((s, m) => s + m.amount, 0);
  const balance     = cashBudget - totalSpent;
  const firstDay    = event?.days?.[0];
  const eventDateLabel = firstDay
    ? new Date(firstDay.date + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  function openAdd()  { setModalMode('add'); setEditEntry(undefined); setShowModal(true); }
  function openEdit(e: NominaEntry) { setModalMode('edit'); setEditEntry(e); setShowModal(true); }

  async function handleDelete(entry: NominaEntry) {
    if (!confirm(`Eliminare ${entry.name}?`)) return;
    const r = await deleteNominaEntry(eventId, entry.id);
    if (r.success) toast.success('Persona rimossa.');
    else toast.error(r.error ?? 'Errore.');
  }

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      const res = await fetch('/api/nomina-pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      if (!res.ok) throw new Error('Errore generazione PDF.');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `TQF_Nomina_${(event?.eventCode || 'evento').replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { toast.error(e.message); }
    setDownloading(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-8" style={{ background: 'var(--tqf-beige)' }}>

      {/* Sticky header */}
      <header
        className="sticky top-0 z-10 px-4 pt-3 pb-0"
        style={{ background: 'white', borderBottom: '1px solid var(--tqf-beige-border)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <Link href="/planner"
            className="flex items-center gap-1.5 text-sm"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            <ArrowLeft className="size-4" />
            <span className="hidden xs:inline">Dashboard</span>
          </Link>

          <div className="flex flex-col items-center min-w-0">
            <p className="text-sm font-medium truncate max-w-[180px]"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontWeight: 400 }}>
              {event?.eventCode || event?.clientName || 'Progetto'}
            </p>
            {event?.clientName && event?.eventCode && (
              <p className="text-xs truncate" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {event.clientName}
              </p>
            )}
          </div>

          <Link href={`/planner/events/${eventId}`}
            className="text-xs px-2.5 py-1.5 rounded-lg"
            style={{ color: 'var(--tqf-bordeaux)', border: '1px solid var(--tqf-cipria)', background: 'var(--tqf-cipria-light)', fontFamily: 'var(--font-body)' }}>
            Modifica
          </Link>
        </div>

        {/* Event meta */}
        {(eventDateLabel || firstDay?.venue) && (
          <div className="flex items-center gap-3 pb-2 flex-wrap">
            {eventDateLabel && (
              <span className="flex items-center gap-1 text-xs"
                style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                <Calendar className="size-3.5" /> {eventDateLabel}
              </span>
            )}
            {firstDay?.venue && (
              <span className="flex items-center gap-1 text-xs truncate max-w-[200px]"
                style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                <MapPin className="size-3.5 flex-shrink-0" /> {firstDay.venue}
              </span>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex -mx-4 border-t" style={{ borderColor: 'var(--tqf-beige-border)' }}>
          {/* Nomina tab — only for SuperAdmin and TeQF */}
          {canNomina && (
            <button
              onClick={() => setActiveTab('nomina')}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium"
              style={{
                color: activeTab === 'nomina' ? 'var(--tqf-bordeaux)' : 'var(--tqf-muted)',
                fontFamily: 'var(--font-body)',
                borderBottom: activeTab === 'nomina' ? '2px solid var(--tqf-bordeaux)' : '2px solid transparent',
                background: 'white',
              }}
            >
              <Users className="size-4" />
              Nómina
              <span className="text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  background: activeTab === 'nomina' ? 'var(--tqf-cipria-light)' : '#f3f4f6',
                  color: activeTab === 'nomina' ? 'var(--tqf-bordeaux)' : 'var(--tqf-muted)',
                  fontFamily: 'var(--font-body)',
                }}>
                {entries.length}
              </span>
            </button>
          )}

          {/* Gastos tab */}
          <button
            onClick={() => setActiveTab('gastos')}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium"
            style={{
              color: activeTab === 'gastos' ? 'var(--tqf-bordeaux)' : 'var(--tqf-muted)',
              fontFamily: 'var(--font-body)',
              borderBottom: activeTab === 'gastos' ? '2px solid var(--tqf-bordeaux)' : '2px solid transparent',
              background: 'white',
            }}
          >
            <Wallet className="size-4" />
            Gastos
            {movements.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  background: activeTab === 'gastos' ? 'var(--tqf-cipria-light)' : '#f3f4f6',
                  color: activeTab === 'gastos' ? 'var(--tqf-bordeaux)' : 'var(--tqf-muted)',
                  fontFamily: 'var(--font-body)',
                }}>
                {cashBudget > 0 ? fmtCurrency(balance) : fmtCurrency(totalSpent)}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ══ NÓMINA TAB ══ */}
      {activeTab === 'nomina' && canNomina && (
        <>
          {/* Stats bar */}
          <div className="mx-4 mt-4 rounded-2xl px-4 py-3 grid grid-cols-3 gap-2"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            {[
              { label: 'Persone',    value: String(entries.length) },
              { label: 'Ore totali', value: fmtOre(totalOre), color: totalOre > 0 ? oreColor(totalOre) : undefined },
              { label: 'Desmontaje', value: String(totalDesm) },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className="text-lg font-semibold"
                  style={{ color: color ?? 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                  {value}
                </p>
                <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Action bar */}
          <div className="mx-4 mt-3 flex gap-2">
            <button
              onClick={openAdd}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium"
              style={{ border: '2px dashed var(--tqf-beige-border)', color: 'var(--tqf-bordeaux)', background: 'white', fontFamily: 'var(--font-body)' }}
            >
              <Plus className="size-4" /> Aggiungi persona
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading || entries.length === 0}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm disabled:opacity-40"
              style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', background: 'white', fontFamily: 'var(--font-body)' }}
            >
              {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              PDF
            </button>
          </div>

          {/* Cards */}
          {entries.length === 0 ? (
            <div className="mx-4 mt-4 rounded-2xl p-10 text-center"
              style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
              <div className="mx-auto mb-4 size-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
                <Users className="size-6" />
              </div>
              <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                Nessuna persona ancora. Usa il pulsante qui sopra.
              </p>
            </div>
          ) : (
            <div className="mx-4 mt-3 space-y-3">
              {entries.map(e => (
                <NominaCard
                  key={e.id}
                  entry={e}
                  canEdit={canNomina}
                  onEdit={() => openEdit(e)}
                  onDelete={() => handleDelete(e)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ══ GASTOS TAB ══ */}
      {activeTab === 'gastos' && (
        <div className="mx-4 mt-4 space-y-3">
          {/* Balance */}
          <div className="rounded-3xl px-5 pt-5 pb-4"
            style={{ background: cashBudget > 0 ? (balance >= 0 ? '#0f2e1a' : '#2a0e0e') : '#1a0f0a' }}>
            <p className="text-xs uppercase tracking-widest opacity-50 mb-1"
              style={{ fontFamily: 'var(--font-body)', color: 'white', letterSpacing: '0.16em' }}>
              {cashBudget > 0 ? 'Saldo attuale' : 'Spesa totale'}
            </p>
            <p className="text-5xl font-light leading-none mb-2"
              style={{
                fontFamily: 'var(--font-display)',
                color: cashBudget > 0 ? (balance >= 0 ? '#6aff9e' : '#ff6a6a') : 'white',
              }}>
              {cashBudget > 0
                ? (balance < 0 ? '-' : '') + fmtCurrency(balance)
                : fmtCurrency(totalSpent)}
            </p>
            <div className="flex gap-4">
              {cashBudget > 0 && <span className="text-xs opacity-60" style={{ color: 'white', fontFamily: 'var(--font-body)' }}>Budget {fmtCurrency(cashBudget)}</span>}
              <span className="text-xs opacity-60" style={{ color: 'white', fontFamily: 'var(--font-body)' }}>Gastato {fmtCurrency(totalSpent)}</span>
              <span className="text-xs opacity-50" style={{ color: 'white', fontFamily: 'var(--font-body)' }}>{movements.length} movim.</span>
            </div>
          </div>

          {/* Last 5 movements */}
          {movements.length > 0 && (
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
              <div className="px-4 py-3 border-b flex items-center justify-between"
                style={{ borderColor: 'var(--tqf-beige-border)' }}>
                <p className="text-sm" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
                  Movimenti recenti
                </p>
                <Link href={`/planner/projects/${eventId}/cash-control`}
                  className="text-xs" style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                  Ver todo →
                </Link>
              </div>
              {movements.slice(0, 5).map(m => (
                <div key={m.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0"
                  style={{ borderColor: 'var(--tqf-beige-border)' }}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--tqf-cipria-light)' }}>
                      {m.paymentMethod === 'tarjeta'
                        ? <CreditCard className="size-3.5" style={{ color: 'var(--tqf-bordeaux)' }} />
                        : <Wallet className="size-3.5" style={{ color: 'var(--tqf-bordeaux)' }} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm capitalize truncate" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>{m.category}</p>
                      <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                        {m.date} {m.time} · {m.registeredByName?.split(' ')[0]}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold flex-shrink-0 ml-3"
                    style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                    -{fmtCurrency(m.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}

          <Link href={`/planner/projects/${eventId}/cash-control`}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-medium"
            style={{ border: '1.5px solid var(--tqf-beige-border)', color: 'var(--tqf-bordeaux)', background: 'white', fontFamily: 'var(--font-body)' }}>
            <Wallet className="size-4" />
            {movements.length === 0 ? 'Registra il primo gasto' : 'Gestisci tutti i gastos'}
          </Link>
        </div>
      )}

      {/* Add/Edit modal */}
      {showModal && (
        <NominaModal
          mode={modalMode}
          eventId={eventId}
          entry={editEntry}
          createdBy={createdBy}
          onClose={() => setShowModal(false)}
          onSaved={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
