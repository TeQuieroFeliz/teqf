'use client';

import { TeqfDatePicker } from '@/components/ui/TeqfDatePicker';
import { FunctionType, WeddingFunction } from '@/lib/wedding-types';

// ── Translations ──────────────────────────────────────────────────────────────

export const FUNCTION_TR = {
  en: {
    sectionBasic: 'Basic Info',
    functionType: 'Function Type *',
    functionName: 'Custom Name',
    functionNamePh: 'e.g. Ramona & Diego — Reception',
    order: 'Order',
    sectionDate: 'Date',
    date: 'Function Date *',
    sectionVenue: 'Venue',
    venue: 'Venue *',
    venuePh: 'e.g. Sofitel CDMX - Salón Versalles',
    errVenue: 'Venue is required for each function',
    sectionTimes: 'Schedule',
    setupStartTime: 'Setup Start',
    venueEntryTime: 'Venue Entry',
    eventStartTime: 'Event Start',
    eventEndTime: 'Event End',
    breakdownTime: 'Breakdown',
    sectionNotes: 'General Notes',
    notesPlaceholder: 'Notes, special requirements, vendor contacts…',
    functionTypes: {
      haldi: 'Haldi', sangeet: 'Sangeet', ceremony: 'Ceremony',
      cocktail: 'Cocktail', reception: 'Reception', custom: 'Custom',
    } as Record<FunctionType, string>,
    errType: 'Please select a function type.',
    errDate: 'Please select a date.',
    save: 'Save Function', saving: 'Saving…', cancel: 'Cancel',
  },
  es: {
    sectionBasic: 'Información Básica',
    functionType: 'Tipo de Función *',
    functionName: 'Nombre Personalizado',
    functionNamePh: 'Ej. Ramona & Diego — Recepción',
    order: 'Orden',
    sectionDate: 'Fecha',
    date: 'Fecha de la Función *',
    sectionVenue: 'Sede',
    venue: 'Sede *',
    venuePh: 'Ej. Sofitel CDMX - Salón Versalles',
    errVenue: 'La sede es obligatoria para cada función',
    sectionTimes: 'Horario',
    setupStartTime: 'Inicio Montaje',
    venueEntryTime: 'Entrada a la Sede',
    eventStartTime: 'Inicio del Evento',
    eventEndTime: 'Fin del Evento',
    breakdownTime: 'Desmontaje',
    sectionNotes: 'Notas Generales',
    notesPlaceholder: 'Notas, requerimientos especiales, contactos de proveedores…',
    functionTypes: {
      haldi: 'Haldi', sangeet: 'Sangeet', ceremony: 'Ceremonia',
      cocktail: 'Cocktail', reception: 'Recepción', custom: 'Personalizado',
    } as Record<FunctionType, string>,
    errType: 'Selecciona el tipo de función.',
    errDate: 'Selecciona una fecha.',
    save: 'Guardar Función', saving: 'Guardando…', cancel: 'Cancelar',
  },
} as const;
export type FnTr = typeof FUNCTION_TR[keyof typeof FUNCTION_TR];
export type FnLangKey = 'en' | 'es';

// ── Form state ────────────────────────────────────────────────────────────────

export interface FunctionFormData {
  functionType: FunctionType;
  functionName: string;
  order: number;
  date: string;
  venue: string;
  setupStartTime: string;
  venueEntryTime: string;
  eventStartTime: string;
  eventEndTime: string;
  breakdownTime: string;
  generalNotes: string;
}

export function initialFormData(fn?: WeddingFunction): FunctionFormData {
  if (fn) {
    return {
      functionType: fn.functionType,
      functionName: fn.functionName,
      order: fn.order,
      date: fn.date,
      venue: fn.venue,
      setupStartTime: fn.setupStartTime,
      venueEntryTime: fn.venueEntryTime,
      eventStartTime: fn.eventStartTime,
      eventEndTime: fn.eventEndTime,
      breakdownTime: fn.breakdownTime,
      generalNotes: fn.generalNotes,
    };
  }
  return {
    functionType: 'ceremony',
    functionName: '',
    order: 1,
    date: '',
    venue: '',
    setupStartTime: '',
    venueEntryTime: '',
    eventStartTime: '',
    eventEndTime: '',
    breakdownTime: '',
    generalNotes: '',
  };
}

export function validateForm(data: FunctionFormData, t: FnTr): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!data.functionType)          errs.functionType = t.errType;
  if (!data.date)                  errs.date         = t.errDate;
  if (!data.venue.trim() || data.venue.trim().length < 3) errs.venue = t.errVenue;
  return errs;
}

// ── Shared styles ─────────────────────────────────────────────────────────────

export const INPUT_STYLE = {
  width: '100%', padding: '0.55rem 0.75rem',
  border: '1px solid var(--tqf-beige-border)', borderRadius: '0.5rem',
  fontFamily: 'var(--font-body)', fontSize: '0.875rem',
  color: 'var(--tqf-dark)', background: 'white', outline: 'none',
} as const;

export const LBL_STYLE = {
  display: 'block', fontSize: '0.75rem', fontWeight: 500,
  marginBottom: '0.35rem', color: 'var(--tqf-muted)',
  fontFamily: 'var(--font-body)', letterSpacing: '0.04em',
} as const;

export const ERR_STYLE = {
  fontSize: '0.75rem', color: '#991b1b',
  fontFamily: 'var(--font-body)', marginTop: '0.25rem',
} as const;

// ── Form UI ───────────────────────────────────────────────────────────────────

interface FunctionFormProps {
  data: FunctionFormData;
  onChange: (patch: Partial<FunctionFormData>) => void;
  errors: Record<string, string>;
  lang: FnLangKey;
  t: FnTr;
}

export function FunctionForm({ data, onChange, errors, lang, t }: FunctionFormProps) {
  const TYPES: FunctionType[] = ['haldi', 'sangeet', 'ceremony', 'cocktail', 'reception', 'custom'];

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <SectionCard title={t.sectionBasic}>
        <div>
          <label style={LBL_STYLE}>{t.functionType}</label>
          <select value={data.functionType}
            onChange={e => onChange({ functionType: e.target.value as FunctionType })}
            style={{ ...INPUT_STYLE, borderColor: errors.functionType ? '#fca5a5' : 'var(--tqf-beige-border)' }}>
            {TYPES.map(tp => <option key={tp} value={tp}>{t.functionTypes[tp]}</option>)}
          </select>
          {errors.functionType && <p style={ERR_STYLE}>{errors.functionType}</p>}
        </div>

        <div>
          <label style={LBL_STYLE}>{t.functionName}</label>
          <input type="text" value={data.functionName} placeholder={t.functionNamePh}
            onChange={e => onChange({ functionName: e.target.value })}
            style={INPUT_STYLE} />
        </div>

        <div>
          <label style={LBL_STYLE}>{t.order}</label>
          <input type="number" min={1} max={20} value={data.order}
            onChange={e => onChange({ order: parseInt(e.target.value) || 1 })}
            style={{ ...INPUT_STYLE, width: '80px' }} />
        </div>
      </SectionCard>

      {/* Date */}
      <SectionCard title={t.sectionDate}>
        <div>
          <label style={LBL_STYLE}>{t.date}</label>
          <TeqfDatePicker value={data.date} onChange={v => onChange({ date: v })}
            lang={lang} hasError={!!errors.date}
            placeholder={lang === 'es' ? 'Seleccionar fecha' : 'Select date'} />
          {errors.date && <p style={ERR_STYLE}>{errors.date}</p>}
        </div>
      </SectionCard>

      {/* Venue */}
      <SectionCard title={t.sectionVenue}>
        <div>
          <label style={LBL_STYLE}>{t.venue}</label>
          <input type="text" value={data.venue} placeholder={t.venuePh}
            onChange={e => onChange({ venue: e.target.value })}
            style={{ ...INPUT_STYLE, borderColor: errors.venue ? '#fca5a5' : 'var(--tqf-beige-border)' }} />
          {errors.venue && <p style={ERR_STYLE}>{errors.venue}</p>}
        </div>
      </SectionCard>

      {/* Schedule */}
      <SectionCard title={t.sectionTimes}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {([
            ['setupStartTime',  t.setupStartTime],
            ['venueEntryTime',  t.venueEntryTime],
            ['eventStartTime',  t.eventStartTime],
            ['eventEndTime',    t.eventEndTime],
            ['breakdownTime',   t.breakdownTime],
          ] as [keyof FunctionFormData, string][]).map(([key, label]) => (
            <div key={key}>
              <label style={LBL_STYLE}>{label}</label>
              <input type="time" value={data[key] as string}
                onChange={e => onChange({ [key]: e.target.value })}
                style={INPUT_STYLE} />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* General Notes */}
      <SectionCard title={t.sectionNotes}>
        <textarea value={data.generalNotes} rows={4}
          placeholder={t.notesPlaceholder}
          onChange={e => onChange({ generalNotes: e.target.value })}
          style={{ ...INPUT_STYLE, resize: 'vertical' }} />
      </SectionCard>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 space-y-3"
      style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
      <h3 className="text-sm font-medium pb-1 border-b"
        style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-bordeaux)', borderColor: 'var(--tqf-beige-border)' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}
