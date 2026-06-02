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
  OrarioEntry,
  OrarioGiorno,
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
  Loader2,
  MapPin,
  Minus,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// ─── Translations ─────────────────────────────────────────────────────────────

type Lang = 'it' | 'es' | 'en';

type Tr = {
  accessDenied: string;
  dashboardBack: string;
  tabOrario: string;
  modifica: string;
  persone: string;
  oreTotali: string;
  desmontaje: string;
  aggiungiPersona: string;
  nessuna: string;
  modalAdd: string;
  modalEdit: string;
  nomeCognome: string;
  ruolo: string;
  aggiungiCategoria: string;
  nomeCategoria: string;
  giorni: string;
  aggiungiGiorno: string;
  data: string;
  turnoAM: string;
  turnoPM: string;
  oreGiorno: string;
  entrata: string;
  uscita: string;
  desLabel: string;
  btnAdd: string;
  btnSave: string;
  btnCancel: string;
  giorno1: string;
  giornoN: string;
  desm: string;
  nessunTurno: string;
  totali: string;
  ultimaModifica: string;
  editar: string;
  toastAdded: string;
  toastUpdated: string;
  toastDeleted: string;
  toastError: string;
  confirmDelete: (name: string) => string;
  valNome: string;
  valGiorni: string;
};

const T: Record<Lang, Tr> = {
  it: {
    accessDenied: 'Accesso non autorizzato',
    dashboardBack: 'Dashboard',
    tabOrario: 'Orario',
    modifica: 'Modifica',
    persone: 'Persone',
    oreTotali: 'Ore totali',
    desmontaje: 'Desmontaje',
    aggiungiPersona: 'Aggiungi persona',
    nessuna: 'Nessuna persona ancora. Usa il pulsante qui sopra.',
    modalAdd: 'Aggiungi persona',
    modalEdit: 'Modifica persona',
    nomeCognome: 'Nome e cognome *',
    ruolo: 'Ruolo *',
    aggiungiCategoria: '+ Aggiungi categoria',
    nomeCategoria: 'Nome categoria...',
    giorni: 'Giorni di lavoro',
    aggiungiGiorno: 'Aggiungi giorno',
    data: '📅 Data',
    turnoAM: '🌅 Turno AM (opzionale)',
    turnoPM: '🌆 Turno PM (opzionale)',
    oreGiorno: 'Ore giorno:',
    entrata: 'Entrata',
    uscita: 'Uscita',
    desLabel: 'Desmontaje',
    btnAdd: 'Aggiungi',
    btnSave: 'Salva modifiche',
    btnCancel: 'Annulla',
    giorno1: 'giorno',
    giornoN: 'giorni',
    desm: 'desm.',
    nessunTurno: 'Nessun turno registrato',
    totali: 'totali',
    ultimaModifica: 'Ultima modifica:',
    editar: 'Modifica',
    toastAdded: 'Persona aggiunta.',
    toastUpdated: 'Aggiornato.',
    toastDeleted: 'Rimosso.',
    toastError: 'Errore.',
    confirmDelete: (name) => `Eliminare ${name}?`,
    valNome: 'Il nome è obbligatorio.',
    valGiorni: 'Aggiungi almeno un giorno.',
  },
  es: {
    accessDenied: 'Acceso no autorizado',
    dashboardBack: 'Dashboard',
    tabOrario: 'Horario',
    modifica: 'Modificar',
    persone: 'Personas',
    oreTotali: 'Horas totales',
    desmontaje: 'Desmontaje',
    aggiungiPersona: 'Agregar persona',
    nessuna: 'Ninguna persona aún. Usa el botón de arriba.',
    modalAdd: 'Agregar persona',
    modalEdit: 'Editar persona',
    nomeCognome: 'Nombre y apellido *',
    ruolo: 'Rol *',
    aggiungiCategoria: '+ Agregar categoría',
    nomeCategoria: 'Nombre categoría...',
    giorni: 'Días de trabajo',
    aggiungiGiorno: 'Agregar día',
    data: '📅 Fecha',
    turnoAM: '🌅 Turno AM (opcional)',
    turnoPM: '🌆 Turno PM (opcional)',
    oreGiorno: 'Horas día:',
    entrata: 'Entrada',
    uscita: 'Salida',
    desLabel: 'Desmontaje',
    btnAdd: 'Agregar',
    btnSave: 'Guardar cambios',
    btnCancel: 'Cancelar',
    giorno1: 'día',
    giornoN: 'días',
    desm: 'desm.',
    nessunTurno: 'Sin turno registrado',
    totali: 'total',
    ultimaModifica: 'Última modificación:',
    editar: 'Editar',
    toastAdded: 'Persona agregada.',
    toastUpdated: 'Actualizado.',
    toastDeleted: 'Eliminado.',
    toastError: 'Error.',
    confirmDelete: (name) => `¿Eliminar a ${name}?`,
    valNome: 'El nombre es obligatorio.',
    valGiorni: 'Agrega al menos un día.',
  },
  en: {
    accessDenied: 'Unauthorized access',
    dashboardBack: 'Dashboard',
    tabOrario: 'Schedule',
    modifica: 'Edit',
    persone: 'People',
    oreTotali: 'Total hours',
    desmontaje: 'Dismount',
    aggiungiPersona: 'Add person',
    nessuna: 'No people yet. Use the button above.',
    modalAdd: 'Add person',
    modalEdit: 'Edit person',
    nomeCognome: 'First and last name *',
    ruolo: 'Role *',
    aggiungiCategoria: '+ Add category',
    nomeCategoria: 'Category name...',
    giorni: 'Work days',
    aggiungiGiorno: 'Add day',
    data: '📅 Date',
    turnoAM: '🌅 AM shift (optional)',
    turnoPM: '🌆 PM shift (optional)',
    oreGiorno: 'Day hours:',
    entrata: 'Start',
    uscita: 'End',
    desLabel: 'Dismount',
    btnAdd: 'Add',
    btnSave: 'Save changes',
    btnCancel: 'Cancel',
    giorno1: 'day',
    giornoN: 'days',
    desm: 'dismt.',
    nessunTurno: 'No shifts registered',
    totali: 'total',
    ultimaModifica: 'Last modified:',
    editar: 'Edit',
    toastAdded: 'Person added.',
    toastUpdated: 'Updated.',
    toastDeleted: 'Removed.',
    toastError: 'Error.',
    confirmDelete: (name) => `Delete ${name}?`,
    valNome: 'Name is required.',
    valGiorni: 'Add at least one day.',
  },
};

function langLocale(lang: Lang): string {
  if (lang === 'es') return 'es-MX';
  if (lang === 'en') return 'en-US';
  return 'it-IT';
}

// ─── Time / hour helpers ──────────────────────────────────────────────────────

function to12h(t24: string): string {
  if (!t24) return '';
  const [h, m] = t24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function to24h(t12: string): string {
  if (!t12) return '';
  const parts = t12.split(' ');
  if (parts.length !== 2) return t12;
  const [time, period] = parts;
  const [rawH, m] = time.split(':').map(Number);
  const h = period === 'PM' && rawH !== 12 ? rawH + 12
          : period === 'AM' && rawH === 12  ? 0
          : rawH;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

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

function fmtDate(d: string, locale: string): string {
  if (!d) return '—';
  return new Date(d + 'T12:00').toLocaleDateString(locale, {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function fmtDataOra(iso: string, locale: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: '2-digit' })
    + ' ' + d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
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

// ─── Role color map ───────────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, { bg: string; text: string }> = {
  Fiorista:    { bg: '#fdf2f4', text: 'var(--tqf-bordeaux)' },
  Staff:       { bg: '#eff6ff', text: '#1d4ed8' },
  Supervisore: { bg: '#f0fdf4', text: '#15803d' },
};
function roleStyle(role: string) {
  return ROLE_STYLES[role] ?? { bg: '#f3f4f6', text: '#374151' };
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputSt = {
  width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.625rem',
  border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)',
  fontSize: '0.9rem', color: 'var(--tqf-dark)', background: 'white', outline: 'none',
};
const lbl = {
  fontSize: '0.6rem', fontFamily: 'var(--font-body)', color: 'var(--tqf-muted)',
  textTransform: 'uppercase' as const, letterSpacing: '0.1em',
  display: 'block', marginBottom: '0.3rem',
};
const timeInput = {
  ...inputSt, fontWeight: 600, textAlign: 'center' as const,
  fontSize: '1rem', letterSpacing: '0.05em',
};

// ─── Giorno form types ────────────────────────────────────────────────────────

interface GiornoForm {
  data: string;
  entrataAM: string;
  uscitaAM: string;
  entrataPM: string;
  uscitaPM: string;
}

function emptyGiornoForm(): GiornoForm {
  return { data: '', entrataAM: '', uscitaAM: '', entrataPM: '', uscitaPM: '' };
}

// ─── GiornoFormCard ───────────────────────────────────────────────────────────

interface GiornoFormCardProps {
  giorno: GiornoForm;
  index: number;
  canRemove: boolean;
  onChange: (index: number, updated: GiornoForm) => void;
  onRemove: (index: number) => void;
  t: Tr;
}

function GiornoFormCard({ giorno, index, canRemove, onChange, onRemove, t }: GiornoFormCardProps) {
  const oreAM     = calcOre(giorno.entrataAM, giorno.uscitaAM);
  const orePM     = calcOre(giorno.entrataPM, giorno.uscitaPM);
  const oreGiorno = parseFloat((oreAM + orePM).toFixed(2));

  const up = (partial: Partial<GiornoForm>) => onChange(index, { ...giorno, ...partial });

  function TimeFields({ eKey, uKey }: {
    eKey: 'entrataAM' | 'entrataPM';
    uKey: 'uscitaAM'  | 'uscitaPM';
  }) {
    const e24 = giorno[eKey];
    const u24 = giorno[uKey];
    const ore = calcOre(e24, u24);
    return (
      <>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label style={{ ...lbl, marginBottom: '0.2rem' }}>{t.entrata}</label>
            <input type="time" value={e24}
              onChange={ev => up({ [eKey]: ev.target.value } as Partial<GiornoForm>)}
              style={timeInput} />
            {e24 && (
              <p className="text-xs mt-0.5 text-center" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {to12h(e24)}
              </p>
            )}
          </div>
          <div>
            <label style={{ ...lbl, marginBottom: '0.2rem' }}>{t.uscita}</label>
            <input type="time" value={u24}
              onChange={ev => up({ [uKey]: ev.target.value } as Partial<GiornoForm>)}
              style={timeInput} />
            {u24 && (
              <p className="text-xs mt-0.5 text-center" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {to12h(u24)}
              </p>
            )}
          </div>
        </div>
        {ore > 0 && (
          <p className="text-xs mt-1.5 text-right font-semibold"
            style={{ color: oreColor(ore), fontFamily: 'var(--font-body)' }}>
            → {fmtOre(ore)}
          </p>
        )}
      </>
    );
  }

  return (
    <div className="rounded-2xl p-4 space-y-4"
      style={{ background: 'var(--tqf-beige)', border: '1px solid var(--tqf-beige-border)' }}>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label style={lbl}>{t.data}</label>
          <input type="date" value={giorno.data}
            onChange={e => up({ data: e.target.value })}
            style={inputSt} />
        </div>
        {canRemove && (
          <button type="button" onClick={() => onRemove(index)}
            className="size-10 flex items-center justify-center rounded-xl flex-shrink-0"
            style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
            <X className="size-4" />
          </button>
        )}
      </div>

      <div>
        <label style={lbl}>{t.turnoAM}</label>
        <TimeFields eKey="entrataAM" uKey="uscitaAM" />
      </div>

      <div>
        <label style={lbl}>{t.turnoPM}</label>
        <TimeFields eKey="entrataPM" uKey="uscitaPM" />
      </div>

      {oreGiorno > 0 && (
        <div className="flex justify-end">
          <span className="text-xs px-2.5 py-1 rounded-lg font-semibold"
            style={{ background: oreBg(oreGiorno), color: oreColor(oreGiorno), fontFamily: 'var(--font-body)' }}>
            {t.oreGiorno} {fmtOre(oreGiorno)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

type ModalMode = 'add' | 'edit';

interface FormState {
  name: string;
  role: string;
  customRoleInput: string;
  showCustomRole: boolean;
  giorni: GiornoForm[];
  desmontaje: number;
}

function OrarioModal({
  mode, eventId, entry, createdBy, extraRoles, t,
  onClose, onSaved,
}: {
  mode: ModalMode;
  eventId: string;
  entry?: OrarioEntry;
  createdBy: string;
  extraRoles: string[];
  t: Tr;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initGiorni = (): GiornoForm[] => {
    if (entry?.turni?.length) {
      return entry.turni.map(g => ({
        data:      g.data ?? '',
        entrataAM: g.turnoAM ? to24h(g.turnoAM.entrata) : '',
        uscitaAM:  g.turnoAM ? to24h(g.turnoAM.uscita)  : '',
        entrataPM: g.turnoPM ? to24h(g.turnoPM.entrata) : '',
        uscitaPM:  g.turnoPM ? to24h(g.turnoPM.uscita)  : '',
      }));
    }
    const legacy = entry as any;
    if (legacy?.turnoAM?.entrata || legacy?.turnoPM?.entrata) {
      return [{
        data:      '',
        entrataAM: legacy.turnoAM?.entrata ? to24h(legacy.turnoAM.entrata) : '',
        uscitaAM:  legacy.turnoAM?.uscita  ? to24h(legacy.turnoAM.uscita)  : '',
        entrataPM: legacy.turnoPM?.entrata ? to24h(legacy.turnoPM.entrata) : '',
        uscitaPM:  legacy.turnoPM?.uscita  ? to24h(legacy.turnoPM.uscita)  : '',
      }];
    }
    return [emptyGiornoForm()];
  };

  const [form, setForm] = useState<FormState>(() => ({
    name:            entry?.name ?? '',
    role:            entry?.role ?? 'Fiorista',
    customRoleInput: '',
    showCustomRole:  false,
    giorni:          initGiorni(),
    desmontaje:      entry?.desmontaje ?? 0,
  }));
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const totale = parseFloat(
    form.giorni.reduce((s, g) =>
      s + calcOre(g.entrataAM, g.uscitaAM) + calcOre(g.entrataPM, g.uscitaPM), 0
    ).toFixed(2)
  );

  const allRoles = [
    ...Array.from(ORARIO_DEFAULT_ROLES),
    ...extraRoles.filter(r => !ORARIO_DEFAULT_ROLES.includes(r as any)),
  ];

  function updateGiorno(index: number, updated: GiornoForm) {
    setForm(f => {
      const giorni = [...f.giorni];
      giorni[index] = updated;
      return { ...f, giorni };
    });
  }

  function addGiorno() {
    setForm(f => ({ ...f, giorni: [...f.giorni, emptyGiornoForm()] }));
  }

  function removeGiorno(index: number) {
    setForm(f => ({ ...f, giorni: f.giorni.filter((_, i) => i !== index) }));
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error(t.valNome); return; }
    if (form.giorni.length === 0) { toast.error(t.valGiorni); return; }

    const finalRole = form.showCustomRole
      ? form.customRoleInput.trim() || form.role
      : form.role;

    const turni: OrarioGiorno[] = form.giorni.map(g => {
      const oreAM = calcOre(g.entrataAM, g.uscitaAM);
      const orePM = calcOre(g.entrataPM, g.uscitaPM);
      return {
        data: g.data,
        turnoAM: g.entrataAM && g.uscitaAM
          ? { entrata: to12h(g.entrataAM), uscita: to12h(g.uscitaAM), ore: oreAM }
          : null,
        turnoPM: g.entrataPM && g.uscitaPM
          ? { entrata: to12h(g.entrataPM), uscita: to12h(g.uscitaPM), ore: orePM }
          : null,
      };
    });

    const totaleOre = parseFloat(
      turni.reduce((s, g) => s + (g.turnoAM?.ore ?? 0) + (g.turnoPM?.ore ?? 0), 0).toFixed(2)
    );

    setSaving(true);
    const result = mode === 'add'
      ? await addOrarioEntry(eventId, {
          name: form.name.trim(), role: finalRole,
          turni, totaleOre, desmontaje: form.desmontaje, createdBy,
        })
      : await updateOrarioEntry(eventId, entry!.id, {
          name: form.name.trim(), role: finalRole,
          turni, totaleOre, desmontaje: form.desmontaje,
        });

    if (result.success) {
      toast.success(mode === 'add' ? t.toastAdded : t.toastUpdated);
      onSaved();
      onClose();
    } else {
      toast.error(result.error ?? t.toastError);
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl overflow-y-auto"
        style={{ background: 'white', maxHeight: '93dvh' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--tqf-beige-border)' }} />
        </div>

        <div className="px-5 pb-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              {mode === 'add' ? t.modalAdd : t.modalEdit}
            </h2>
            <button onClick={onClose} style={{ color: 'var(--tqf-muted)' }}><X className="size-5" /></button>
          </div>

          <div>
            <label style={lbl}>{t.nomeCognome}</label>
            <input type="text" value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Maria García" autoFocus={mode === 'add'}
              style={inputSt} />
          </div>

          <div>
            <label style={lbl}>{t.ruolo}</label>
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
                  {t.aggiungiCategoria}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input type="text" value={form.customRoleInput}
                  onChange={e => set('customRoleInput', e.target.value)}
                  placeholder={t.nomeCategoria}
                  autoFocus
                  style={{ ...inputSt, flex: 1 }} />
                <button type="button"
                  onClick={() => {
                    set('showCustomRole', false);
                    if (form.customRoleInput.trim()) set('role', form.customRoleInput.trim());
                  }}
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

          <div className="space-y-3">
            <label style={lbl}>{t.giorni}</label>
            {form.giorni.map((g, i) => (
              <GiornoFormCard
                key={i}
                giorno={g}
                index={i}
                canRemove={form.giorni.length > 1}
                onChange={updateGiorno}
                onRemove={removeGiorno}
                t={t}
              />
            ))}
            <button type="button" onClick={addGiorno}
              className="w-full py-3 rounded-2xl text-sm flex items-center justify-center gap-2"
              style={{ border: '2px dashed var(--tqf-beige-border)', color: 'var(--tqf-bordeaux)', background: 'white', fontFamily: 'var(--font-body)' }}>
              <Plus className="size-4" /> {t.aggiungiGiorno}
            </button>
          </div>

          {totale > 0 && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: oreBg(totale) }}>
              <Clock className="size-4" style={{ color: oreColor(totale) }} />
              <span className="text-sm font-semibold" style={{ color: oreColor(totale), fontFamily: 'var(--font-body)' }}>
                TOTALE: {totale.toFixed(1)}h
              </span>
            </div>
          )}

          <div>
            <label style={lbl}>{t.desLabel}</label>
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

          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {mode === 'add' ? t.btnAdd : t.btnSave}
            </button>
            <button onClick={onClose}
              className="px-5 py-3.5 rounded-2xl text-sm"
              style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {t.btnCancel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Employee card ────────────────────────────────────────────────────────────

function OrarioCard({
  entry, canEdit, lang, t, onEdit, onDelete,
}: {
  entry: OrarioEntry;
  canEdit: boolean;
  lang: Lang;
  t: Tr;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const rs     = roleStyle(entry.role);
  const locale = langLocale(lang);

  const hasTurni    = entry.turni?.length > 0;
  const legacy      = entry as any;
  const giornoCount = hasTurni ? entry.turni.length : 0;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>

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
              {hasTurni ? (
                <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  {giornoCount} {giornoCount === 1 ? t.giorno1 : t.giornoN}
                </span>
              ) : (
                <>
                  {legacy.turnoAM?.entrata && (
                    <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                      AM {legacy.turnoAM.entrata}–{legacy.turnoAM.uscita || '?'}
                    </span>
                  )}
                  {legacy.turnoPM?.entrata && (
                    <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                      PM {legacy.turnoPM.entrata}–{legacy.turnoPM.uscita || '?'}
                    </span>
                  )}
                </>
              )}
              {entry.desmontaje > 0 && (
                <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  {entry.desmontaje} {t.desm}
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

      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-3">

          {hasTurni ? (
            entry.turni.map((giorno, i) => {
              const oreGiorno = (giorno.turnoAM?.ore ?? 0) + (giorno.turnoPM?.ore ?? 0);
              return (
                <div key={i} className="rounded-xl p-3 space-y-2"
                  style={{ background: 'var(--tqf-beige)', border: '1px solid var(--tqf-beige-border)' }}>
                  {giorno.data && (
                    <p className="text-xs font-semibold flex items-center gap-1.5 mb-2"
                      style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                      <Calendar className="size-3.5 flex-shrink-0" />
                      {fmtDate(giorno.data, locale)}
                    </p>
                  )}
                  {giorno.turnoAM && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-6">🌅</span>
                        <span className="text-xs font-medium" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>AM</span>
                        <span className="text-sm" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                          {giorno.turnoAM.entrata} → {giorno.turnoAM.uscita}
                        </span>
                      </div>
                      {giorno.turnoAM.ore > 0 && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg"
                          style={{ background: oreBg(giorno.turnoAM.ore), color: oreColor(giorno.turnoAM.ore), fontFamily: 'var(--font-body)' }}>
                          {fmtOre(giorno.turnoAM.ore)}
                        </span>
                      )}
                    </div>
                  )}
                  {giorno.turnoPM && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-6">🌆</span>
                        <span className="text-xs font-medium" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>PM</span>
                        <span className="text-sm" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                          {giorno.turnoPM.entrata} → {giorno.turnoPM.uscita}
                        </span>
                      </div>
                      {giorno.turnoPM.ore > 0 && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg"
                          style={{ background: oreBg(giorno.turnoPM.ore), color: oreColor(giorno.turnoPM.ore), fontFamily: 'var(--font-body)' }}>
                          {fmtOre(giorno.turnoPM.ore)}
                        </span>
                      )}
                    </div>
                  )}
                  {!giorno.turnoAM && !giorno.turnoPM && (
                    <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t.nessunTurno}</p>
                  )}
                  {oreGiorno > 0 && giorno.turnoAM && giorno.turnoPM && (
                    <div className="text-right pt-1">
                      <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                        {t.oreGiorno} <strong>{fmtOre(oreGiorno)}</strong>
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            [
              { label: '🌅 AM', turno: legacy.turnoAM },
              { label: '🌆 PM', turno: legacy.turnoPM },
            ].map(({ label, turno }) => (
              <div key={label} className="rounded-xl p-3"
                style={{ background: 'var(--tqf-beige)', border: '1px solid var(--tqf-beige-border)' }}>
                <p className="text-xs mb-2 font-medium" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  {label}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {[{ l: t.entrata, val: turno?.entrata }, { l: t.uscita, val: turno?.uscita }].map(({ l, val }) => (
                      <div key={l}>
                        <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{l}</p>
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
            ))
          )}

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
                {t.totali}
              </span>
            </div>
            {entry.desmontaje > 0 && (
              <span className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {entry.desmontaje} {t.desLabel}
              </span>
            )}
          </div>

          <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            {t.ultimaModifica} {fmtDataOra(entry.ultimaModifica, locale)}
          </p>

          {canEdit && (
            <div className="flex gap-2 pt-1">
              <button onClick={onEdit}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm"
                style={{ border: '1px solid var(--tqf-cipria)', background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                <Pencil className="size-3.5" /> {t.editar}
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

export default function ProjectPage() {
  const params  = useParams();
  const router  = useRouter();
  const eventId = params?.id as string;

  const {
    plannerUser, adminUser, isSuperAdmin,
    canManageCashControl,
    isLoading: authLoading,
  } = usePlannerAuth();

  const [event,     setEvent]     = useState<PlannerEvent | null>(null);
  const [entries,   setEntries]   = useState<OrarioEntry[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [lang,      setLangState] = useState<Lang>('it');

  const canOrario = isSuperAdmin || canManageCashControl;

  useEffect(() => {
    const saved = localStorage.getItem('tqf-lang') as Lang | null;
    if (saved && (['it', 'es', 'en'] as Lang[]).includes(saved)) setLangState(saved);
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem('tqf-lang', l);
  }

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [editEntry, setEditEntry] = useState<OrarioEntry | undefined>();

  useEffect(() => {
    if (!eventId) return;
    getPlannerEvent(eventId).then(e => {
      if (!e) { router.replace('/planner'); return; }
      setEvent(e);
      setLoading(false);
    });
  }, [eventId, router]);

  useEffect(() => {
    if (!eventId || !canOrario) return;
    const unsub = onSnapshot(
      query(collection(db, 'plannerEvents', eventId, 'orarioDiLavoro'), orderBy('createdAt', 'asc')),
      snap => setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as OrarioEntry)))
    );
    return () => unsub();
  }, [eventId, canOrario]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  const t      = T[lang];
  const locale = langLocale(lang);

  if (!canOrario) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <div className="text-center">
          <p className="text-base mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)' }}>{t.accessDenied}</p>
          <Link href="/planner" className="text-sm" style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
            ← {t.dashboardBack}
          </Link>
        </div>
      </div>
    );
  }

  const createdBy = adminUser?.id ?? plannerUser?.id ?? '';
  const totalOre  = entries.reduce((s, e) => s + (e.totaleOre ?? 0), 0);
  const totalDesm = entries.reduce((s, e) => s + (e.desmontaje ?? 0), 0);

  const firstDay       = event?.days?.[0];
  const eventDateLabel = firstDay
    ? new Date(firstDay.date + 'T12:00').toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const extraRoles = Array.from(
    new Set(entries.map(e => e.role).filter(r => !ORARIO_DEFAULT_ROLES.includes(r as any)))
  );

  function openAdd() { setModalMode('add'); setEditEntry(undefined); setShowModal(true); }
  function openEdit(e: OrarioEntry) { setModalMode('edit'); setEditEntry(e); setShowModal(true); }

  async function handleDelete(entry: OrarioEntry) {
    if (!confirm(t.confirmDelete(entry.name))) return;
    const r = await deleteOrarioEntry(eventId, entry.id);
    if (r.success) toast.success(t.toastDeleted);
    else toast.error(r.error ?? t.toastError);
  }

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
            <span className="hidden xs:inline">{t.dashboardBack}</span>
          </Link>

          <div className="flex flex-col items-center min-w-0">
            <p className="text-sm font-medium truncate max-w-[160px]"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontWeight: 400 }}>
              {event?.eventCode || event?.clientName || 'Progetto'}
            </p>
            {event?.clientName && event?.eventCode && (
              <p className="text-xs truncate" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {event.clientName}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Language switcher */}
            <div className="flex items-center rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--tqf-beige-border)' }}>
              {(['it', 'es', 'en'] as Lang[]).map(l => (
                <button key={l} onClick={() => setLang(l)}
                  className="px-2 py-1 text-xs font-semibold uppercase"
                  style={{
                    background: lang === l ? 'var(--tqf-bordeaux)' : 'white',
                    color: lang === l ? 'white' : 'var(--tqf-muted)',
                    fontFamily: 'var(--font-body)',
                    letterSpacing: '0.04em',
                    transition: 'all 0.12s',
                  }}>
                  {l}
                </button>
              ))}
            </div>

            <Link href={`/planner/events/${eventId}`}
              className="text-xs px-2.5 py-1.5 rounded-lg"
              style={{ color: 'var(--tqf-bordeaux)', border: '1px solid var(--tqf-cipria)', background: 'var(--tqf-cipria-light)', fontFamily: 'var(--font-body)' }}>
              {t.modifica}
            </Link>
          </div>
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

        {/* Tab indicator */}
        <div className="flex -mx-4 border-t" style={{ borderColor: 'var(--tqf-beige-border)' }}>
          <div className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium"
            style={{
              color: 'var(--tqf-bordeaux)',
              fontFamily: 'var(--font-body)',
              borderBottom: '2px solid var(--tqf-bordeaux)',
              background: 'white',
            }}>
            <Users className="size-4" />
            {t.tabOrario}
            <span className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
              {entries.length}
            </span>
          </div>
        </div>
      </header>

      {/* ══ ORARIO DI LAVORO ══ */}
      {/* Stats bar */}
      <div className="mx-4 mt-4 rounded-2xl px-4 py-3 grid grid-cols-3 gap-2"
        style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
        {[
          { label: t.persone,    value: String(entries.length) },
          { label: t.oreTotali,  value: fmtOre(totalOre), color: totalOre > 0 ? oreColor(totalOre) : undefined },
          { label: t.desmontaje, value: String(totalDesm) },
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
          <Plus className="size-4" /> {t.aggiungiPersona}
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
            {t.nessuna}
          </p>
        </div>
      ) : (
        <div className="mx-4 mt-3 space-y-3">
          {entries.map(e => (
            <OrarioCard
              key={e.id}
              entry={e}
              canEdit={canOrario}
              lang={lang}
              t={t}
              onEdit={() => openEdit(e)}
              onDelete={() => handleDelete(e)}
            />
          ))}
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
          t={t}
          onClose={() => setShowModal(false)}
          onSaved={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
