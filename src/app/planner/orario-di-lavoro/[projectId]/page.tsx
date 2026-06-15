'use client';

import {
  addTeqfOrarioEntry,
  deleteTeqfOrarioEntry,
  updateTeqfOrarioEntry,
} from '@/actions/planner/teqf-projects';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { useI18n } from '@/hooks/useI18n';
import { LanguageSelector } from '@/components/LanguageSelector';
import { db } from '@/firebase/client';
import {
  OrarioEntry,
  OrarioGiorno,
  ORARIO_DEFAULT_ROLES,
} from '@/lib/planner-types';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// ─── Hour helpers ─────────────────────────────────────────────────────────────

function to12h(t24: string): string {
  if (!t24) return '';
  const [h, m] = t24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`;
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

// ─── Role colors ──────────────────────────────────────────────────────────────

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

// ─── Giorno form ──────────────────────────────────────────────────────────────

interface GiornoForm {
  data: string;
  entrataAM: string; uscitaAM: string;
  entrataPM: string; uscitaPM: string;
}

function emptyGiornoForm(): GiornoForm {
  return { data: '', entrataAM: '', uscitaAM: '', entrataPM: '', uscitaPM: '' };
}

// ─── GiornoFormCard (module-level to prevent remount) ─────────────────────────

interface GiornoFormCardProps {
  giorno: GiornoForm; index: number; canRemove: boolean;
  onChange: (i: number, g: GiornoForm) => void;
  onRemove: (i: number) => void;
}

function GiornoFormCard({ giorno, index, canRemove, onChange, onRemove }: GiornoFormCardProps) {
  const { t } = useI18n();
  const oreAM     = calcOre(giorno.entrataAM, giorno.uscitaAM);
  const orePM     = calcOre(giorno.entrataPM, giorno.uscitaPM);
  const oreGiorno = parseFloat((oreAM + orePM).toFixed(2));
  const up = (p: Partial<GiornoForm>) => onChange(index, { ...giorno, ...p });

  function TimeFields({ eKey, uKey }: { eKey: 'entrataAM'|'entrataPM'; uKey: 'uscitaAM'|'uscitaPM' }) {
    const e24 = giorno[eKey]; const u24 = giorno[uKey];
    const ore = calcOre(e24, u24);
    return (
      <>
        <div className="grid grid-cols-2 gap-2">
          {([
            [t('orarioDl_entryLabel'), eKey],
            [t('orarioDl_exitLabel'), uKey],
          ] as [string, typeof eKey | typeof uKey][]).map(([label, key]) => {
            const val = giorno[key as keyof GiornoForm];
            return (
              <div key={key}>
                <label style={{ ...lbl, marginBottom: '0.2rem' }}>{label}</label>
                <input type="time" value={val}
                  onChange={ev => up({ [key]: ev.target.value } as Partial<GiornoForm>)}
                  style={timeInput} />
                {val && (
                  <p className="text-xs mt-0.5 text-center" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                    {to12h(val)}
                  </p>
                )}
              </div>
            );
          })}
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
          <label style={lbl}>{t('orarioDl_dateLabel')}</label>
          <input type="date" value={giorno.data} onChange={e => up({ data: e.target.value })} style={inputSt} />
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
        <label style={lbl}>{t('orarioDl_amShift')}</label>
        <TimeFields eKey="entrataAM" uKey="uscitaAM" />
      </div>
      <div>
        <label style={lbl}>{t('orarioDl_pmShift')}</label>
        <TimeFields eKey="entrataPM" uKey="uscitaPM" />
      </div>
      {oreGiorno > 0 && (
        <div className="flex justify-end">
          <span className="text-xs px-2.5 py-1 rounded-lg font-semibold"
            style={{ background: oreBg(oreGiorno), color: oreColor(oreGiorno), fontFamily: 'var(--font-body)' }}>
            {t('orarioDl_dayHours')} {fmtOre(oreGiorno)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── OrarioModal ──────────────────────────────────────────────────────────────

type ModalMode = 'add' | 'edit';

interface FormState {
  name: string; role: string;
  customRoleInput: string; showCustomRole: boolean;
  giorni: GiornoForm[]; desmontaje: number;
}

function OrarioModal({
  mode, projectId, entry, createdBy, extraRoles, onClose, onSaved,
}: {
  mode: ModalMode; projectId: string; entry?: OrarioEntry;
  createdBy: string; extraRoles: string[];
  onClose: () => void; onSaved: () => void;
}) {
  const { t } = useI18n();
  const initGiorni = (): GiornoForm[] => {
    if (entry?.turni?.length) {
      return entry.turni.map(g => ({
        data: g.data ?? '',
        entrataAM: g.turnoAM ? to24h(g.turnoAM.entrata) : '',
        uscitaAM:  g.turnoAM ? to24h(g.turnoAM.uscita)  : '',
        entrataPM: g.turnoPM ? to24h(g.turnoPM.entrata) : '',
        uscitaPM:  g.turnoPM ? to24h(g.turnoPM.uscita)  : '',
      }));
    }
    return [emptyGiornoForm()];
  };

  const [form, setForm] = useState<FormState>(() => ({
    name: entry?.name ?? '', role: entry?.role ?? 'Fiorista',
    customRoleInput: '', showCustomRole: false,
    giorni: initGiorni(), desmontaje: entry?.desmontaje ?? 0,
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
    setForm(f => { const giorni = [...f.giorni]; giorni[index] = updated; return { ...f, giorni }; });
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error(t('orarioDl_nameRequired')); return; }

    const finalRole = form.showCustomRole
      ? form.customRoleInput.trim() || form.role : form.role;

    const turni: OrarioGiorno[] = form.giorni.map(g => {
      const oreAM = calcOre(g.entrataAM, g.uscitaAM);
      const orePM = calcOre(g.entrataPM, g.uscitaPM);
      return {
        data: g.data,
        turnoAM: g.entrataAM && g.uscitaAM
          ? { entrata: to12h(g.entrataAM), uscita: to12h(g.uscitaAM), ore: oreAM } : null,
        turnoPM: g.entrataPM && g.uscitaPM
          ? { entrata: to12h(g.entrataPM), uscita: to12h(g.uscitaPM), ore: orePM } : null,
      };
    });

    const totaleOre = parseFloat(
      turni.reduce((s, g) => s + (g.turnoAM?.ore ?? 0) + (g.turnoPM?.ore ?? 0), 0).toFixed(2)
    );

    setSaving(true);
    const result = mode === 'add'
      ? await addTeqfOrarioEntry(projectId, {
          name: form.name.trim(), role: finalRole,
          turni, totaleOre, desmontaje: form.desmontaje, createdBy,
        })
      : await updateTeqfOrarioEntry(projectId, entry!.id, {
          name: form.name.trim(), role: finalRole,
          turni, totaleOre, desmontaje: form.desmontaje,
        });

    if (result.success) {
      toast.success(mode === 'add' ? t('orarioDl_savedAdd') : t('orarioDl_savedEdit'));
      onSaved(); onClose();
    } else {
      toast.error(result.error ?? t('orarioDl_saveError'));
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl overflow-y-auto"
        style={{ background: 'white', maxHeight: '93dvh' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--tqf-beige-border)' }} />
        </div>
        <div className="px-5 pb-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              {mode === 'add' ? t('orarioDl_addTitle') : t('orarioDl_editTitle')}
            </h2>
            <button onClick={onClose} style={{ color: 'var(--tqf-muted)' }}><X className="size-5" /></button>
          </div>

          <div>
            <label style={lbl}>{t('orarioDl_nameLabel')}</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Maria García" autoFocus={mode === 'add'} style={inputSt} />
          </div>

          <div>
            <label style={lbl}>{t('orarioDl_roleLabel')}</label>
            {!form.showCustomRole ? (
              <div className="flex flex-wrap gap-2">
                {allRoles.map(r => {
                  const s = roleStyle(r); const active = form.role === r;
                  return (
                    <button key={r} type="button" onClick={() => set('role', r)}
                      className="px-3 py-2 rounded-xl text-sm font-medium"
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
                <button type="button" onClick={() => set('showCustomRole', true)}
                  className="px-3 py-2 rounded-xl text-sm"
                  style={{ border: '1.5px dashed var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  {t('orarioDl_addCategory')}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input type="text" value={form.customRoleInput}
                  onChange={e => set('customRoleInput', e.target.value)}
                  placeholder={t('orarioDl_categoryPlaceholder')} autoFocus
                  style={{ ...inputSt, flex: 1 }} />
                <button type="button"
                  onClick={() => { set('showCustomRole', false); if (form.customRoleInput.trim()) set('role', form.customRoleInput.trim()); }}
                  className="px-3 py-2 rounded-xl text-sm"
                  style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
                  OK
                </button>
                <button type="button" onClick={() => set('showCustomRole', false)} style={{ color: 'var(--tqf-muted)' }}>
                  <X className="size-4" />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label style={lbl}>{t('orarioDl_workDays')}</label>
            {form.giorni.map((g, i) => (
              <GiornoFormCard key={i} giorno={g} index={i}
                canRemove={form.giorni.length > 1}
                onChange={updateGiorno}
                onRemove={idx => setForm(f => ({ ...f, giorni: f.giorni.filter((_, ii) => ii !== idx) }))}
              />
            ))}
            <button type="button"
              onClick={() => setForm(f => ({ ...f, giorni: [...f.giorni, emptyGiornoForm()] }))}
              className="w-full py-3 rounded-2xl text-sm flex items-center justify-center gap-2"
              style={{ border: '2px dashed var(--tqf-beige-border)', color: 'var(--tqf-bordeaux)', background: 'white', fontFamily: 'var(--font-body)' }}>
              <Plus className="size-4" /> {t('orarioDl_addDay')}
            </button>
          </div>

          {totale > 0 && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: oreBg(totale) }}>
              <Clock className="size-4" style={{ color: oreColor(totale) }} />
              <span className="text-sm font-semibold" style={{ color: oreColor(totale), fontFamily: 'var(--font-body)' }}>
                TOTAL: {totale.toFixed(1)}h
              </span>
            </div>
          )}

          <div>
            <label style={lbl}>{t('orarioDl_desLabel')}</label>
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
              <button type="button" onClick={() => set('desmontaje', form.desmontaje + 1)}
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
              {mode === 'add' ? t('orarioDl_addBtn') : t('orarioDl_saveBtn')}
            </button>
            <button onClick={onClose}
              className="px-5 py-3.5 rounded-2xl text-sm"
              style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {t('orarioDl_cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── OrarioCard ───────────────────────────────────────────────────────────────

function OrarioCard({
  entry, canEdit, onEdit, onDelete,
}: {
  entry: OrarioEntry; canEdit: boolean;
  onEdit: () => void; onDelete: () => void;
}) {
  const { t, lang } = useI18n();
  const locale = lang === 'es' ? 'es-MX' : 'en-US';
  const [expanded, setExpanded] = useState(false);
  const rs = roleStyle(entry.role);
  const hasTurni = entry.turni?.length > 0;

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
              {hasTurni && (
                <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  {entry.turni.length} {entry.turni.length === 1 ? t('orarioDl_day1') : t('orarioDl_dayN')}
                </span>
              )}
              {entry.desmontaje > 0 && (
                <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  {entry.desmontaje} {t('orarioDl_desmontaje')}
                </span>
              )}
            </div>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="size-4 flex-shrink-0" style={{ color: 'var(--tqf-muted)' }} />
          : <ChevronDown className="size-4 flex-shrink-0" style={{ color: 'var(--tqf-muted)' }} />}
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-3">
          {hasTurni ? entry.turni.map((giorno, i) => {
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
                  <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t('orarioDl_noShift')}</p>
                )}
                {oreGiorno > 0 && giorno.turnoAM && giorno.turnoPM && (
                  <div className="text-right pt-1">
                    <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                      {t('orarioDl_dayHours')} <strong>{fmtOre(oreGiorno)}</strong>
                    </span>
                  </div>
                )}
              </div>
            );
          }) : null}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: oreBg(entry.totaleOre) }}>
              <Clock className="size-4" style={{ color: oreColor(entry.totaleOre) }} />
              <span className="text-sm font-semibold" style={{ color: oreColor(entry.totaleOre), fontFamily: 'var(--font-body)' }}>
                {fmtOre(entry.totaleOre)}
              </span>
              <span className="text-xs opacity-70" style={{ color: oreColor(entry.totaleOre), fontFamily: 'var(--font-body)' }}>
                {t('orarioDl_total')}
              </span>
            </div>
            {entry.desmontaje > 0 && (
              <span className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {entry.desmontaje} {t('orarioDl_desLabel')}
              </span>
            )}
          </div>

          <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            {t('orarioDl_lastModified')} {fmtDataOra(entry.ultimaModifica, locale)}
          </p>

          {canEdit && (
            <div className="flex gap-2 pt-1">
              <button onClick={onEdit}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm"
                style={{ border: '1px solid var(--tqf-cipria)', background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                <Pencil className="size-3.5" /> {t('orarioDl_editBtn')}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrarioDetailPage() {
  const params    = useParams();
  const projectId = params?.projectId as string;
  const { t, lang } = useI18n();

  const {
    isSuperAdmin, canManageCashControl,
    plannerUser, adminUser,
    isLoading: authLoading,
  } = usePlannerAuth();

  const [projectName, setProjectName] = useState('');
  const [entries,     setEntries]     = useState<OrarioEntry[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [modalMode,   setModalMode]   = useState<ModalMode>('add');
  const [editEntry,   setEditEntry]   = useState<OrarioEntry | undefined>();

  const canAccess = isSuperAdmin || canManageCashControl;
  const canEdit   = canManageCashControl || isSuperAdmin;

  useEffect(() => {
    if (authLoading || !projectId) return;
    const unsubProject = onSnapshot(
      doc(db, 'teqfProjects', projectId),
      snap => { if (snap.exists()) setProjectName(snap.data().name ?? ''); }
    );
    const unsubEntries = onSnapshot(
      query(collection(db, 'teqfProjects', projectId, 'orarioDiLavoro'), orderBy('createdAt', 'asc')),
      snap => {
        setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as OrarioEntry)));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => { unsubProject(); unsubEntries(); };
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
            {t('orarioDl_unauthorized')}
          </p>
          <Link href="/planner/orario-di-lavoro" className="text-sm"
            style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
            {t('orarioDl_backLink')}
          </Link>
        </div>
      </div>
    );
  }

  const createdBy   = adminUser?.id   ?? plannerUser?.id   ?? '';
  const totalOre    = entries.reduce((s, e) => s + (e.totaleOre ?? 0), 0);
  const totalDesm   = entries.reduce((s, e) => s + (e.desmontaje ?? 0), 0);
  const extraRoles  = Array.from(
    new Set(entries.map(e => e.role).filter(r => !ORARIO_DEFAULT_ROLES.includes(r as any)))
  );

  function openAdd() { setModalMode('add'); setEditEntry(undefined); setShowModal(true); }
  function openEdit(e: OrarioEntry) { setModalMode('edit'); setEditEntry(e); setShowModal(true); }

  async function handleDelete(entry: OrarioEntry) {
    if (!confirm(t('orarioDl_deleteConfirm', { name: entry.name }))) return;
    const r = await deleteTeqfOrarioEntry(projectId, entry.id);
    if (r.success) toast.success(t('orarioDl_deleted'));
    else toast.error(r.error ?? t('orarioDl_error'));
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: 'var(--tqf-beige)' }}>

      {/* Header */}
      <header className="sticky top-0 z-10 px-4 pt-3 pb-0"
        style={{ background: 'white', borderBottom: '1px solid var(--tqf-beige-border)' }}>
        <div className="flex items-center justify-between mb-2">
          <Link href="/planner/orario-di-lavoro" className="flex-shrink-0" style={{ color: 'var(--tqf-muted)' }}>
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex items-center gap-2 min-w-0 flex-1 mx-3">
            <div className="p-1.5 rounded-lg flex-shrink-0"
              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
              <Clock className="size-4" />
            </div>
            <p className="text-sm font-medium truncate"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontWeight: 400 }}>
              {projectName || t('orarioDl_fallback')}
            </p>
          </div>
          <LanguageSelector />
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-2 px-2 py-3 mb-3 rounded-xl"
          style={{ background: 'var(--tqf-beige)' }}>
          {[
            { label: t('orarioDl_statPeople'), value: String(entries.length) },
            { label: t('orarioDl_statHours'), value: fmtOre(totalOre), color: totalOre > 0 ? oreColor(totalOre) : undefined },
            { label: t('orarioDl_statDesm'), value: String(totalDesm) },
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
      </header>

      {/* Add button */}
      {canEdit && (
        <div className="mx-4 mt-4">
          <button onClick={openAdd}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-medium"
            style={{ border: '2px dashed var(--tqf-beige-border)', color: 'var(--tqf-bordeaux)', background: 'white', fontFamily: 'var(--font-body)' }}>
            <Plus className="size-4" /> {t('orarioDl_addPerson')}
          </button>
        </div>
      )}

      {/* Cards */}
      {entries.length === 0 ? (
        <div className="mx-4 mt-4 rounded-2xl p-10 text-center"
          style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
          <div className="mx-auto mb-4 size-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
            <Users className="size-6" />
          </div>
          <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            {t('orarioDl_noPeople')}
          </p>
        </div>
      ) : (
        <div className="mx-4 mt-3 space-y-3">
          {entries.map(e => (
            <OrarioCard
              key={e.id} entry={e} canEdit={canEdit}
              onEdit={() => openEdit(e)}
              onDelete={() => handleDelete(e)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <OrarioModal
          mode={modalMode} projectId={projectId} entry={editEntry}
          createdBy={createdBy} extraRoles={extraRoles}
          onClose={() => setShowModal(false)}
          onSaved={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
