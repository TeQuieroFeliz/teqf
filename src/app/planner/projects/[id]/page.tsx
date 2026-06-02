'use client';

import {
  addOrarioEntry,
  deleteOrarioEntry,
  updateOrarioEntry,
} from '@/actions/planner/event-orario';
import { getPlannerEvent } from '@/actions/planner/planner-event-crud';
import { db } from '@/firebase/client';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import {
  CashMovement,
  OrarioEntry,
  OrarioTurno,
  ORARIO_DEFAULT_ROLES,
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

// ─── Time / hour helpers ──────────────────────────────────────────────────────

/** Native <input type="time"> gives HH:MM (24h). Convert to "H:MM AM/PM". */
function to12h(t24: string): string {
  if (!t24) return '';
  const [h, m] = t24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/** Stored "H:MM AM/PM" → HH:MM (24h) for the time input value. */
function to24h(t12: string): string {
  if (!t12) return '';
  const parts = t12.split(' ');
  if (parts.length !== 2) return t12; // already 24h or empty
  const [time, period] = parts;
  const [rawH, m] = time.split(':').map(Number);
  const h = period === 'PM' && rawH !== 12 ? rawH + 12
          : period === 'AM' && rawH === 12  ? 0
          : rawH;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Hours calculation in 24h internal representation.
 * Rule: if uscita <= entrata (same or earlier), assume next-day → add 24h.
 * Examples: 06:00→06:00 = 24h | 22:00→10:00 = 12h | 10:00→14:00 = 4h
 */
function calcOre(e24: string, u24: string): number {
  if (!e24 || !u24) return 0;
  const [eh, em] = e24.split(':').map(Number);
  const [uh, um] = u24.split(':').map(Number);
  let diff = (uh * 60 + um) - (eh * 60 + em);
  if (diff <= 0) diff += 1440;
  return parseFloat((diff / 60).toFixed(2));
}

function fmtOre(h: number): string {
  if (!h) return '—';
  const hrs = Math.floor(h);
  const m   = Math.round((h - hrs) * 60);
  return m > 0 ? `${hrs}h ${m}m` : `${hrs}h`;
}

function oreColor(h: number): string {
  if (h > 12) return '#991b1b';
  if (h >= 10) return '#b45309';
  if (h > 0)   return '#15803d';
  return 'var(--tqf-muted)';
}
function oreBg(h: number): string {
  if (h > 12) return '#fef2f2';
  if (h >= 10) return '#fef9ee';
  if (h > 0)   return '#f0fdf4';
  return '#f3f4f6';
}

function fmtCurrency(n: number): string {
  return `$${Math.abs(n).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;
}
function fmtDataOra(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })
    + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

// ─── Role color map (predefined; custom roles get a neutral style) ────────────

const ROLE_STYLES: Record<string, { bg: string; text: string }> = {
  Fiorista:   { bg: '#fdf2f4', text: 'var(--tqf-bordeaux)' },
  Staff:      { bg: '#eff6ff', text: '#1d4ed8' },
  Supervisore:{ bg: '#f0fdf4', text: '#15803d' },
};
function roleStyle(role: string) {
  return ROLE_STYLES[role] ?? { bg: '#f3f4f6', text: '#374151' };
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

type ModalMode = 'add' | 'edit';

interface FormState {
  name: string;
  role: string;
  customRoleInput: string;
  showCustomRole: boolean;
  entrataAM: string; // HH:MM (24h) — for input element
  uscitaAM: string;
  entrataPM: string;
  uscitaPM: string;
  desmontaje: number;
}

function OrarioModal({
  mode, eventId, entry, createdBy, extraRoles,
  onClose, onSaved,
}: {
  mode: ModalMode;
  eventId: string;
  entry?: OrarioEntry;
  createdBy: string;
  extraRoles: string[];   // custom roles from existing entries
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => ({
    name:            entry?.name ?? '',
    role:            entry?.role ?? 'Fiorista',
    customRoleInput: '',
    showCustomRole:  false,
    entrataAM:  entry ? to24h(entry.turnoAM.entrata) : '',
    uscitaAM:   entry ? to24h(entry.turnoAM.uscita)  : '',
    entrataPM:  entry ? to24h(entry.turnoPM.entrata) : '',
    uscitaPM:   entry ? to24h(entry.turnoPM.uscita)  : '',
    desmontaje: entry?.desmontaje ?? 0,
  }));
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const oreAM  = calcOre(form.entrataAM, form.uscitaAM);
  const orePM  = calcOre(form.entrataPM, form.uscitaPM);
  const totale = parseFloat((oreAM + orePM).toFixed(2));

  // All roles available in dropdown
  const allRoles = [
    ...Array.from(ORARIO_DEFAULT_ROLES),
    ...extraRoles.filter(r => !ORARIO_DEFAULT_ROLES.includes(r as any)),
  ];

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Il nome è obbligatorio.'); return; }

    const finalRole = form.showCustomRole
      ? form.customRoleInput.trim() || form.role
      : form.role;

    const turnoAM: OrarioTurno = {
      entrata: to12h(form.entrataAM),
      uscita:  to12h(form.uscitaAM),
      ore:     oreAM,
    };
    const turnoPM: OrarioTurno = {
      entrata: to12h(form.entrataPM),
      uscita:  to12h(form.uscitaPM),
      ore:     orePM,
    };

    setSaving(true);
    const result = mode === 'add'
      ? await addOrarioEntry(eventId, {
          name: form.name.trim(), role: finalRole,
          turnoAM, turnoPM, totaleOre: totale,
          desmontaje: form.desmontaje, createdBy,
        })
      : await updateOrarioEntry(eventId, entry!.id, {
          name: form.name.trim(), role: finalRole,
          turnoAM, turnoPM, totaleOre: totale,
          desmontaje: form.desmontaje,
        });

    if (result.success) {
      toast.success(mode === 'add' ? 'Persona aggiunta.' : 'Aggiornato.');
      onSaved();
      onClose();
    } else {
      toast.error(result.error ?? 'Errore salvataggio.');
    }
    setSaving(false);
  }

  const inputSt: React.CSSProperties = {
    width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.625rem',
    border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)',
    fontSize: '0.9rem', color: 'var(--tqf-dark)', background: 'white', outline: 'none',
  };
  const lbl: React.CSSProperties = {
    fontSize: '0.6rem', fontFamily: 'var(--font-body)', color: 'var(--tqf-muted)',
    textTransform: 'uppercase', letterSpacing: '0.1em',
    display: 'block', marginBottom: '0.3rem',
  };
  const timeInput: React.CSSProperties = {
    ...inputSt, fontWeight: 600, textAlign: 'center',
    fontSize: '1rem', letterSpacing: '0.05em',
  };

  function ShiftBlock({
    label, e24Key, u24Key,
  }: { label: string; e24Key: 'entrataAM' | 'entrataPM'; u24Key: 'uscitaAM' | 'uscitaPM' }) {
    const e24 = form[e24Key] as string;
    const u24 = form[u24Key] as string;
    const ore = calcOre(e24, u24);
    return (
      <div>
        <label style={lbl}>{label}</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label style={{ ...lbl, marginBottom: '0.2rem' }}>Entrata</label>
            <input type="time" value={e24}
              onChange={ev => set(e24Key, ev.target.value)}
              style={timeInput} />
            {e24 && <p className="text-xs mt-0.5 text-center" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{to12h(e24)}</p>}
          </div>
          <div>
            <label style={{ ...lbl, marginBottom: '0.2rem' }}>Uscita</label>
            <input type="time" value={u24}
              onChange={ev => set(u24Key, ev.target.value)}
              style={timeInput} />
            {u24 && <p className="text-xs mt-0.5 text-center" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{to12h(u24)}</p>}
          </div>
        </div>
        {ore > 0 && (
          <p className="text-xs mt-1.5 text-right font-semibold"
            style={{ color: oreColor(ore), fontFamily: 'var(--font-body)' }}>
            → {fmtOre(ore)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl overflow-y-auto"
        style={{ background: 'white', maxHeight: '93dvh' }}
        onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--tqf-beige-border)' }} />
        </div>

        <div className="px-5 pb-8 space-y-4">
          {/* Title */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              {mode === 'add' ? 'Aggiungi persona' : 'Modifica persona'}
            </h2>
            <button onClick={onClose} style={{ color: 'var(--tqf-muted)' }}><X className="size-5" /></button>
          </div>

          {/* Name */}
          <div>
            <label style={lbl}>Nome e cognome *</label>
            <input type="text" value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Maria García" autoFocus={mode === 'add'}
              style={inputSt} />
          </div>

          {/* Role selector */}
          <div>
            <label style={lbl}>Ruolo *</label>
            {!form.showCustomRole ? (
              <div className="flex flex-wrap gap-2">
                {allRoles.map(r => {
                  const s = roleStyle(r);
                  const active = form.role === r;
                  return (
                    <button key={r} type="button"
                      onClick={() => set('role', r)}
                      className="px-3 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{
                        border: `1.5px solid ${active ? s.text : 'var(--tqf-beige-border)'}`,
                        background: active ? s.bg : 'white',
                        color: active ? s.text : 'var(--tqf-muted)',
                        fontFamily: 'var(--font-body)',
                      }}>
                      {r}
                    </button>
                  );
                })}
                <button type="button"
                  onClick={() => set('showCustomRole', true)}
                  className="px-3 py-2 rounded-xl text-sm transition-all"
                  style={{ border: '1.5px dashed var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  + Aggiungi categoria
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input type="text" value={form.customRoleInput}
                  onChange={e => set('customRoleInput', e.target.value)}
                  placeholder="Nome categoria..."
                  autoFocus
                  style={{ ...inputSt, flex: 1 }} />
                <button type="button"
                  onClick={() => { set('showCustomRole', false); if (form.customRoleInput.trim()) set('role', form.customRoleInput.trim()); }}
                  className="px-3 py-2 rounded-xl text-sm"
                  style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
                  OK
                </button>
                <button type="button"
                  onClick={() => set('showCustomRole', false)}
                  style={{ color: 'var(--tqf-muted)' }}>
                  <X className="size-4" />
                </button>
              </div>
            )}
          </div>

          {/* AM shift */}
          <ShiftBlock label="🌅 Turno AM" e24Key="entrataAM" u24Key="uscitaAM" />

          {/* PM shift */}
          <ShiftBlock label="🌆 Turno PM" e24Key="entrataPM" u24Key="uscitaPM" />

          {/* Total preview */}
          {totale > 0 && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
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
              <button type="button"
                disabled={form.desmontaje <= 0}
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
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {mode === 'add' ? 'Aggiungi' : 'Salva modifiche'}
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

// ─── Employee card ────────────────────────────────────────────────────────────

function OrarioCard({
  entry, canEdit, onEdit, onDelete,
}: {
  entry: OrarioEntry;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const rs = roleStyle(entry.role);

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 cursor-pointer"
        style={{ borderBottom: expanded ? '1px solid var(--tqf-beige-border)' : 'none' }}
        onClick={() => setExpanded(v => !v)}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
            style={{ background: rs.bg, color: rs.text, fontFamily: 'var(--font-body)' }}>
            {entry.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                {entry.name}
              </p>
              <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: rs.bg, color: rs.text, fontFamily: 'var(--font-body)' }}>
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
          {/* Shift cards */}
          {[
            { label: '🌅 Turno AM',  turno: entry.turnoAM },
            { label: '🌆 Turno PM',  turno: entry.turnoPM },
          ].map(({ label, turno }) => (
            <div key={label} className="rounded-xl p-3"
              style={{ background: 'var(--tqf-beige)', border: '1px solid var(--tqf-beige-border)' }}>
              <p className="text-xs mb-2 font-medium" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {label}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {[{ lbl: 'Entrata', val: turno?.entrata }, { lbl: 'Uscita', val: turno?.uscita }].map(({ lbl, val }) => (
                    <div key={lbl}>
                      <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{lbl}</p>
                      <p className="text-base font-semibold" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                        {val || '—'}
                      </p>
                    </div>
                  ))}
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

          {/* Total + desmontaje */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: oreBg(entry.totaleOre) }}>
              <Clock className="size-4" style={{ color: oreColor(entry.totaleOre) }} />
              <span className="text-sm font-semibold"
                style={{ color: oreColor(entry.totaleOre), fontFamily: 'var(--font-body)' }}>
                {fmtOre(entry.totaleOre)}
              </span>
              <span className="text-xs opacity-70"
                style={{ color: oreColor(entry.totaleOre), fontFamily: 'var(--font-body)' }}>
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

type Tab = 'orario' | 'gastos';

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
  const [entries,   setEntries]   = useState<OrarioEntry[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [cashBudget, setCashBudget] = useState(0);
  const [loading,   setLoading]   = useState(true);

  // Access: SuperAdmin + TeQF only for Orario di Lavoro
  const canOrario = isSuperAdmin || canManageCashControl;

  const [activeTab, setActiveTab] = useState<Tab>('orario');

  // Modal state
  const [showModal,  setShowModal]  = useState(false);
  const [modalMode,  setModalMode]  = useState<ModalMode>('add');
  const [editEntry,  setEditEntry]  = useState<OrarioEntry | undefined>();

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

  // Default tab to gastos for XB-only users
  useEffect(() => {
    if (!authLoading && !canOrario) setActiveTab('gastos');
  }, [authLoading, canOrario]);

  // Real-time orario entries
  useEffect(() => {
    if (!eventId || !canOrario) return;
    const unsub = onSnapshot(
      query(collection(db, 'plannerEvents', eventId, 'orarioDiLavoro'), orderBy('createdAt', 'asc')),
      snap => setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as OrarioEntry)))
    );
    return () => unsub();
  }, [eventId, canOrario]);

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

  const firstDay       = event?.days?.[0];
  const eventDateLabel = firstDay
    ? new Date(firstDay.date + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  // Custom roles from existing entries (not in default list)
  const extraRoles = Array.from(
    new Set(entries.map(e => e.role).filter(r => !ORARIO_DEFAULT_ROLES.includes(r as any)))
  );

  function openAdd()  { setModalMode('add'); setEditEntry(undefined); setShowModal(true); }
  function openEdit(e: OrarioEntry) { setModalMode('edit'); setEditEntry(e); setShowModal(true); }

  async function handleDelete(entry: OrarioEntry) {
    if (!confirm(`Eliminare ${entry.name}?`)) return;
    const r = await deleteOrarioEntry(eventId, entry.id);
    if (r.success) toast.success('Rimosso.');
    else toast.error(r.error ?? 'Errore.');
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-8" style={{ background: 'var(--tqf-beige)' }}>

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-10 px-4 pt-3 pb-0"
        style={{ background: 'white', borderBottom: '1px solid var(--tqf-beige-border)' }}>

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

        {/* Tab bar */}
        <div className="flex -mx-4 border-t" style={{ borderColor: 'var(--tqf-beige-border)' }}>
          {/* Orario tab — SuperAdmin + TeQF only */}
          {canOrario && (
            <button onClick={() => setActiveTab('orario')}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium"
              style={{
                color: activeTab === 'orario' ? 'var(--tqf-bordeaux)' : 'var(--tqf-muted)',
                fontFamily: 'var(--font-body)',
                borderBottom: activeTab === 'orario' ? '2px solid var(--tqf-bordeaux)' : '2px solid transparent',
                background: 'white',
              }}>
              <Users className="size-4" />
              Orario
              <span className="text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  background: activeTab === 'orario' ? 'var(--tqf-cipria-light)' : '#f3f4f6',
                  color: activeTab === 'orario' ? 'var(--tqf-bordeaux)' : 'var(--tqf-muted)',
                  fontFamily: 'var(--font-body)',
                }}>
                {entries.length}
              </span>
            </button>
          )}

          {/* Gastos tab */}
          <button onClick={() => setActiveTab('gastos')}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium"
            style={{
              color: activeTab === 'gastos' ? 'var(--tqf-bordeaux)' : 'var(--tqf-muted)',
              fontFamily: 'var(--font-body)',
              borderBottom: activeTab === 'gastos' ? '2px solid var(--tqf-bordeaux)' : '2px solid transparent',
              background: 'white',
            }}>
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

      {/* ══ ORARIO DI LAVORO TAB ══ */}
      {activeTab === 'orario' && canOrario && (
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

          {/* Add button */}
          <div className="mx-4 mt-3">
            <button onClick={openAdd}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-medium"
              style={{ border: '2px dashed var(--tqf-beige-border)', color: 'var(--tqf-bordeaux)', background: 'white', fontFamily: 'var(--font-body)' }}>
              <Plus className="size-4" /> Aggiungi persona
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
                <OrarioCard
                  key={e.id}
                  entry={e}
                  canEdit={canOrario}
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
          {/* Balance card */}
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
              {cashBudget > 0 ? (balance < 0 ? '-' : '') + fmtCurrency(balance) : fmtCurrency(totalSpent)}
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
                <p className="text-sm" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>Movimenti recenti</p>
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
        <OrarioModal
          mode={modalMode}
          eventId={eventId}
          entry={editEntry}
          createdBy={createdBy}
          extraRoles={extraRoles}
          onClose={() => setShowModal(false)}
          onSaved={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
