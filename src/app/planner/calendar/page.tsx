'use client';

import {
  createTeqfCalendarEvent,
  deleteTeqfCalendarEvent,
  getXbEventsForDropdown,
  migrateTeqfEventsToDateRange,
  TeqfCalendarEvent,
  updateTeqfCalendarEvent,
  XbEventOption,
} from '@/actions/teqf/teqf-events';
import { db } from '@/firebase/client';
import { useLangContext } from '@/context/LangContext';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import AccessDenied from '@/components/planner/AccessDenied';
import { TeqfDatePicker } from '@/components/ui/TeqfDatePicker';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  ArrowLeft,
  CalendarDays,
  CalendarRange,
  ChevronRight,
  Edit2,
  ExternalLink,
  Link2,
  Link2Off,
  Loader2,
  LogOut,
  MapPin,
  Plus,
  Save,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// ── Translations ──────────────────────────────────────────────────────────────

const TR = {
  en: {
    pageTitle: 'Calendar',
    pageSubtitle: 'TeQF wedding event calendar',
    addEvent: '+ Add Event',
    noEvents: 'No events yet. Add your first wedding event.',
    eventStartDate: 'Event Start Date',
    eventEndDate: 'Event End Date',
    eventName: 'Wedding Name',
    location: 'Location',
    notes: 'Notes (optional)',
    linkXbEvent: 'Link to XB Team Event',
    selectXbPlaceholder: '— Not linked —',
    noXbEvents: 'No XB events available',
    save: 'Save',
    saving: 'Saving…',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    backToList: 'Back to Calendar',
    newEvent: 'New Event',
    editEvent: 'Edit Event',
    linkedXb: 'Linked to XB Team Event',
    notLinkedXb: 'Not linked to XB Team Event',
    notLinkedMsg: 'This event is not yet linked to an XB Team event.',
    openXb: 'Open XB Event',
    removeLink: 'Remove link',
    deleteTitle: 'Delete event?',
    deleteMsg: (name: string) => `"${name}" will be permanently deleted.`,
    confirmDelete: 'Yes, delete',
    cancelDelete: 'Cancel',
    startDateLabel: 'Start Date',
    endDateLabel: 'End Date',
    duration: (n: number) => n === 1 ? '1 day' : `${n} days`,
    errStartRequired: 'Start date is required.',
    errEndRequired: 'End date is required.',
    errDatePast: 'Start date cannot be in the past.',
    errEndBeforeStart: 'End date cannot be before start date.',
    errNameRequired: 'Wedding name is required.',
    errLocationRequired: 'Location is required.',
    created: 'Event created.',
    updated: 'Event updated.',
    deleted: 'Event deleted.',
    errorCreate: 'Failed to create event.',
    errorUpdate: 'Failed to update event.',
    errorDelete: 'Failed to delete event.',
    migrationBtn: 'Run date migration',
    migrating: 'Migrating…',
    migrationDone: (n: number) => `Migration complete: ${n} event(s) updated.`,
    formatLong: (d: string) =>
      new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      }),
  },
  es: {
    pageTitle: 'Calendario',
    pageSubtitle: 'Calendario de eventos de bodas TeQF',
    addEvent: '+ Agregar Evento',
    noEvents: 'Sin eventos aún. Agrega tu primer evento de boda.',
    eventStartDate: 'Fecha de inicio',
    eventEndDate: 'Fecha de fin',
    eventName: 'Nombre de la Boda',
    location: 'Ubicación',
    notes: 'Notas (opcional)',
    linkXbEvent: 'Vincular con Evento XB',
    selectXbPlaceholder: '— Sin vincular —',
    noXbEvents: 'No hay eventos XB disponibles',
    save: 'Guardar',
    saving: 'Guardando…',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Eliminar',
    backToList: 'Volver al Calendario',
    newEvent: 'Nuevo Evento',
    editEvent: 'Editar Evento',
    linkedXb: 'Vinculado a Evento XB',
    notLinkedXb: 'No vinculado a Evento XB',
    notLinkedMsg: 'Este evento aún no está vinculado a un evento del Equipo XB.',
    openXb: 'Abrir Evento XB',
    removeLink: 'Quitar vínculo',
    deleteTitle: '¿Eliminar evento?',
    deleteMsg: (name: string) => `"${name}" se eliminará permanentemente.`,
    confirmDelete: 'Sí, eliminar',
    cancelDelete: 'Cancelar',
    startDateLabel: 'Fecha de inicio',
    endDateLabel: 'Fecha de fin',
    duration: (n: number) => n === 1 ? '1 día' : `${n} días`,
    errStartRequired: 'La fecha de inicio es obligatoria.',
    errEndRequired: 'La fecha de fin es obligatoria.',
    errDatePast: 'La fecha de inicio no puede ser en el pasado.',
    errEndBeforeStart: 'La fecha de fin no puede ser anterior a la de inicio.',
    errNameRequired: 'El nombre de la boda es obligatorio.',
    errLocationRequired: 'La ubicación es obligatoria.',
    created: 'Evento creado.',
    updated: 'Evento actualizado.',
    deleted: 'Evento eliminado.',
    errorCreate: 'Error al crear el evento.',
    errorUpdate: 'Error al actualizar el evento.',
    errorDelete: 'Error al eliminar el evento.',
    migrationBtn: 'Ejecutar migración de fechas',
    migrating: 'Migrando…',
    migrationDone: (n: number) => `Migración completada: ${n} evento(s) actualizado(s).`,
    formatLong: (d: string) =>
      new Date(d + 'T00:00:00').toLocaleDateString('es-MX', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      }),
  },
} as const;

type Tr = typeof TR[keyof typeof TR];
type LangKey = 'en' | 'es';

// ── Date helpers ──────────────────────────────────────────────────────────────

function getStart(ev: TeqfCalendarEvent): string {
  return ev.eventStartDate || (ev as any).eventDate || '';
}
function getEnd(ev: TeqfCalendarEvent): string {
  return ev.eventEndDate || getStart(ev);
}
function dayCount(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
}
function isMultiDay(ev: TeqfCalendarEvent): boolean {
  const s = getStart(ev);
  const e = getEnd(ev);
  return !!s && !!e && s !== e;
}

function monthAbbr(d: Date, lang: LangKey): string {
  return d.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { month: 'short' })
    .replace('.', '').toUpperCase();
}

function formatRange(start: string, end: string, lang: LangKey): string {
  if (!start) return '';
  if (!end || start === end) {
    const d = new Date(start + 'T00:00:00');
    return d.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const locale = lang === 'es' ? 'es-MX' : 'en-US';
  const sMonth = monthAbbr(s, lang);
  const eMonth = monthAbbr(e, lang);
  const sDay = s.getDate();
  const eDay = e.getDate();
  const year = e.getFullYear();
  if (sMonth === eMonth && s.getFullYear() === e.getFullYear()) {
    return lang === 'es'
      ? `${sDay}–${eDay} ${sMonth[0] + sMonth.slice(1).toLowerCase()} ${year}`
      : `${sMonth} ${sDay}–${eDay}, ${year}`;
  }
  const sMon = sMonth[0] + sMonth.slice(1).toLowerCase();
  const eMon = eMonth[0] + eMonth.slice(1).toLowerCase();
  return lang === 'es'
    ? `${sDay} ${sMon} – ${eDay} ${eMon} ${year}`
    : `${sMonth} ${sDay} – ${eMonth} ${eDay}, ${year}`;
}

// ── View state ────────────────────────────────────────────────────────────────

type View =
  | { mode: 'list' }
  | { mode: 'detail'; event: TeqfCalendarEvent }
  | { mode: 'form'; editing?: TeqfCalendarEvent };

// ── Shared styles ─────────────────────────────────────────────────────────────

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '0.55rem 0.75rem',
  border: '1px solid var(--tqf-beige-border)', borderRadius: '0.5rem',
  fontFamily: 'var(--font-body)', fontSize: '0.875rem',
  color: 'var(--tqf-dark)', background: 'white', outline: 'none',
};
const ERR_STYLE: React.CSSProperties = {
  fontSize: '0.75rem', color: '#991b1b', fontFamily: 'var(--font-body)', marginTop: '0.25rem',
};
const LBL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.35rem',
  color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', letterSpacing: '0.04em',
};

// ── Form ──────────────────────────────────────────────────────────────────────

function EventForm({
  t, lang, editing, xbEvents, xbLoading, onSave, onCancel,
}: {
  t: Tr; lang: LangKey; editing?: TeqfCalendarEvent;
  xbEvents: XbEventOption[]; xbLoading: boolean;
  onSave: (data: {
    eventStartDate: string; eventEndDate: string;
    eventName: string; location: string; notes: string; xbEventId: string | null;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [startDate, setStartDate] = useState(editing ? getStart(editing) : '');
  const [endDate, setEndDate]     = useState(editing ? getEnd(editing) : '');
  const [name, setName]           = useState(editing?.eventName ?? '');
  const [loc, setLoc]             = useState(editing?.location ?? '');
  const [notes, setNotes]         = useState(editing?.notes ?? '');
  const [xbId, setXbId]           = useState<string>(editing?.xbEventId ?? '');
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [saving, setSaving]       = useState(false);

  function handleStartChange(v: string) {
    setStartDate(v);
    setErrors(p => ({ ...p, startDate: '' }));
    // Auto-advance end date if it would go before start
    if (!endDate || endDate < v) {
      setEndDate(v);
      setErrors(p => ({ ...p, endDate: '' }));
    }
  }

  function handleEndChange(v: string) {
    setEndDate(v);
    setErrors(p => ({ ...p, endDate: '' }));
  }

  function validate() {
    const errs: Record<string, string> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!startDate) {
      errs.startDate = t.errStartRequired;
    } else if (new Date(startDate + 'T00:00:00') < today) {
      errs.startDate = t.errDatePast;
    }
    if (!endDate) {
      errs.endDate = t.errEndRequired;
    } else if (startDate && endDate < startDate) {
      errs.endDate = t.errEndBeforeStart;
    }
    if (!name.trim()) errs.name = t.errNameRequired;
    if (!loc.trim())  errs.loc  = t.errLocationRequired;
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    await onSave({
      eventStartDate: startDate, eventEndDate: endDate,
      eventName: name.trim(), location: loc.trim(),
      notes: notes.trim(), xbEventId: xbId || null,
    });
    setSaving(false);
  }

  const nights = startDate && endDate && endDate > startDate
    ? dayCount(startDate, endDate)
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Start Date */}
      <div>
        <label style={LBL_STYLE}>{t.eventStartDate} *</label>
        <TeqfDatePicker
          value={startDate}
          onChange={handleStartChange}
          lang={lang}
          hasError={!!errors.startDate}
        />
        {errors.startDate && <p style={ERR_STYLE}>{errors.startDate}</p>}
      </div>

      {/* End Date */}
      <div>
        <label style={LBL_STYLE}>
          {t.eventEndDate} *
          {nights && nights > 1 && (
            <span style={{ marginLeft: '8px', color: 'var(--tqf-bordeaux)', fontWeight: 400, fontSize: '0.7rem' }}>
              · {t.duration(nights)}
            </span>
          )}
        </label>
        <TeqfDatePicker
          value={endDate}
          onChange={handleEndChange}
          lang={lang}
          hasError={!!errors.endDate}
        />
        {errors.endDate && <p style={ERR_STYLE}>{errors.endDate}</p>}
      </div>

      {/* Wedding Name */}
      <div>
        <label style={LBL_STYLE}>{t.eventName} *</label>
        <input
          type="text" value={name} placeholder="e.g. López Wedding"
          onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }}
          style={{ ...INPUT_STYLE, borderColor: errors.name ? '#fca5a5' : 'var(--tqf-beige-border)' }}
        />
        {errors.name && <p style={ERR_STYLE}>{errors.name}</p>}
      </div>

      {/* Location */}
      <div>
        <label style={LBL_STYLE}>{t.location} *</label>
        <input
          type="text" value={loc} placeholder="e.g. Hacienda Santa Fe, CDMX"
          onChange={e => { setLoc(e.target.value); setErrors(p => ({ ...p, loc: '' })); }}
          style={{ ...INPUT_STYLE, borderColor: errors.loc ? '#fca5a5' : 'var(--tqf-beige-border)' }}
        />
        {errors.loc && <p style={ERR_STYLE}>{errors.loc}</p>}
      </div>

      {/* Notes */}
      <div>
        <label style={LBL_STYLE}>{t.notes}</label>
        <textarea
          value={notes} rows={3}
          onChange={e => setNotes(e.target.value)}
          style={{ ...INPUT_STYLE, resize: 'vertical' }}
        />
      </div>

      {/* XB Event link */}
      <div>
        <label style={LBL_STYLE}>{t.linkXbEvent}</label>
        {xbLoading ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="size-4 animate-spin" style={{ color: 'var(--tqf-muted)' }} />
          </div>
        ) : (
          <select value={xbId} onChange={e => setXbId(e.target.value)} style={{ ...INPUT_STYLE }}>
            <option value="">{t.selectXbPlaceholder}</option>
            {xbEvents.length === 0
              ? <option disabled>{t.noXbEvents}</option>
              : xbEvents.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.label}{ev.date ? ` · ${ev.date}` : ''}
                  </option>
                ))
            }
          </select>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-1">
        <button
          type="submit" disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? t.saving : t.save}
        </button>
        <button
          type="button" onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)' }}
        >
          <X className="size-4" />
          {t.cancel}
        </button>
      </div>
    </form>
  );
}

// ── Delete modal ──────────────────────────────────────────────────────────────

function DeleteModal({ t, eventName, onConfirm, onCancel, deleting }: {
  t: Tr; eventName: string;
  onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onCancel}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-sm"
        style={{ background: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="size-12 rounded-xl flex items-center justify-center mb-4"
          style={{ background: '#fef2f2', color: '#991b1b' }}>
          <Trash2 className="size-5" />
        </div>
        <h3 className="text-lg mb-2"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
          {t.deleteTitle}
        </h3>
        <p className="text-sm mb-6" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
          {t.deleteMsg(eventName)}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onConfirm} disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: '#991b1b', color: 'white', fontFamily: 'var(--font-body)' }}
          >
            {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            {t.confirmDelete}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
            style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
          >
            {t.cancelDelete}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page header ───────────────────────────────────────────────────────────────

function PageHeader({ title, logout }: { title: string; logout: () => void }) {
  return (
    <header
      className="border-b px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30"
      style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}
    >
      <Link href="/planner" className="flex items-center gap-2 sm:gap-3 transition-opacity hover:opacity-75 flex-shrink-0">
        <Image src="/logo.png" alt="Te Quiero Feliz" width={30} height={30}
          className="object-contain"
          style={{ filter: 'invert(9%) sepia(80%) saturate(900%) hue-rotate(308deg) brightness(145%)' }}
        />
        <div className="hidden sm:block">
          <p style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontSize: '0.95rem', fontWeight: 300, lineHeight: 1.2 }}>
            Te Quiero Feliz
          </p>
          <p style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-muted)', fontSize: '0.55rem', letterSpacing: '0.18em' }}>
            {title.toUpperCase()}
          </p>
        </div>
      </Link>
      <div className="flex items-center gap-2">
        <LanguageSelector />
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm px-2.5 py-2 rounded-lg transition-colors hover:opacity-80"
          style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)' }}
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </header>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TeqfCalendarPage() {
  const { isSuperAdmin, canManageCashControl, plannerUser, adminUser, isLoading: authLoading, logout } =
    usePlannerAuth();
  const { lang } = useLangContext();
  const t = TR[lang as LangKey] ?? TR.en;

  const [events, setEvents]               = useState<TeqfCalendarEvent[]>([]);
  const [loading, setLoading]             = useState(true);
  const [view, setView]                   = useState<View>({ mode: 'list' });
  const [xbEvents, setXbEvents]           = useState<XbEventOption[]>([]);
  const [xbLoading, setXbLoading]         = useState(true);
  const [deleteTarget, setDeleteTarget]   = useState<TeqfCalendarEvent | null>(null);
  const [deleting, setDeleting]           = useState(false);
  const [migrating, setMigrating]         = useState(false);

  const isTeQFOrAdmin = isSuperAdmin || canManageCashControl;
  const creatorId     = plannerUser?.id ?? adminUser?.id ?? '';

  // Real-time listener — order by eventStartDate
  useEffect(() => {
    if (authLoading || !isTeQFOrAdmin) return;
    const q = query(collection(db, 'teqf_events'), orderBy('eventStartDate', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as TeqfCalendarEvent)));
        setLoading(false);
      },
      (snapErr) => {
        console.error('[teqf_events]', snapErr);
        setLoading(false);
      },
    );
    return unsub;
  }, [authLoading, isTeQFOrAdmin]);

  // Load XB events for dropdown (once)
  useEffect(() => {
    if (!isTeQFOrAdmin) return;
    getXbEventsForDropdown()
      .then(setXbEvents)
      .catch(() => setXbEvents([]))
      .finally(() => setXbLoading(false));
  }, [isTeQFOrAdmin]);

  // Keep detail view synced with real-time data
  useEffect(() => {
    if (view.mode === 'detail') {
      const latest = events.find(e => e.id === view.event.id);
      if (latest) setView({ mode: 'detail', event: latest });
    }
  }, [events]); // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  if (!isTeQFOrAdmin) return <AccessDenied />;

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleCreate(data: {
    eventStartDate: string; eventEndDate: string;
    eventName: string; location: string; notes: string; xbEventId: string | null;
  }) {
    const res = await createTeqfCalendarEvent({ ...data, createdBy: creatorId });
    if (res.success) { toast.success(t.created); setView({ mode: 'list' }); }
    else toast.error(res.error ?? t.errorCreate);
  }

  async function handleUpdate(id: string, data: {
    eventStartDate: string; eventEndDate: string;
    eventName: string; location: string; notes: string; xbEventId: string | null;
  }) {
    const res = await updateTeqfCalendarEvent(id, data);
    if (res.success) { toast.success(t.updated); setView({ mode: 'list' }); }
    else toast.error(res.error ?? t.errorUpdate);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteTeqfCalendarEvent(deleteTarget.id);
    if (res.success) {
      toast.success(t.deleted);
      setDeleteTarget(null);
      setView({ mode: 'list' });
    } else {
      toast.error(res.error ?? t.errorDelete);
    }
    setDeleting(false);
  }

  async function handleUnlink(ev: TeqfCalendarEvent) {
    const res = await updateTeqfCalendarEvent(ev.id, {
      eventStartDate: getStart(ev), eventEndDate: getEnd(ev),
      eventName: ev.eventName, location: ev.location,
      notes: ev.notes, xbEventId: null,
    });
    if (res.success) toast.success(t.updated);
    else toast.error(res.error ?? t.errorUpdate);
  }

  async function handleMigrate() {
    setMigrating(true);
    const res = await migrateTeqfEventsToDateRange();
    if (res.success) toast.success(t.migrationDone(res.updated));
    else toast.error(res.error ?? 'Migration failed.');
    setMigrating(false);
  }

  // ── XB link section ─────────────────────────────────────────────────────────

  function XbLinkSection({ ev }: { ev: TeqfCalendarEvent }) {
    const linked = xbEvents.find(x => x.id === ev.xbEventId);
    if (ev.xbEventId) {
      return (
        <div className="rounded-xl p-4" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="size-4" style={{ color: '#16a34a' }} />
            <span className="text-sm font-medium" style={{ color: '#15803d', fontFamily: 'var(--font-body)' }}>
              {t.linkedXb}
            </span>
          </div>
          <p className="text-sm mb-3" style={{ color: '#166534', fontFamily: 'var(--font-body)' }}>
            {linked ? linked.label : ev.xbEventId}
            {linked?.date && <span className="ml-2 opacity-60">· {linked.date}</span>}
          </p>
          <div className="flex gap-2 flex-wrap">
            <Link
              href={`/planner/events/${ev.xbEventId}`}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: '#16a34a', color: 'white', fontFamily: 'var(--font-body)' }}
            >
              <ExternalLink className="size-3" />
              {t.openXb}
            </Link>
            <button
              onClick={() => handleUnlink(ev)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
              style={{ color: '#15803d', border: '1px solid #86efac', background: 'white', fontFamily: 'var(--font-body)' }}
            >
              <Link2Off className="size-3" />
              {t.removeLink}
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-xl p-4" style={{ background: '#fafafa', border: '1px solid var(--tqf-beige-border)' }}>
        <div className="flex items-center gap-2 mb-1.5">
          <Link2Off className="size-4" style={{ color: 'var(--tqf-muted)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            {t.notLinkedXb}
          </span>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
          {t.notLinkedMsg}
        </p>
        <button
          onClick={() => setView({ mode: 'form', editing: ev })}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
          style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
        >
          <Link2 className="size-3" />
          {t.linkXbEvent}
        </button>
      </div>
    );
  }

  // ── LIST VIEW ───────────────────────────────────────────────────────────────

  if (view.mode === 'list') {
    return (
      <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
        <PageHeader title={t.pageTitle} logout={logout} />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">

          {/* Title + add */}
          <div className="flex items-start justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 300 }}>
                {t.pageTitle}
              </h1>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {t.pageSubtitle}
              </p>
            </div>
            <button
              onClick={() => setView({ mode: 'form' })}
              className="flex-shrink-0 flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">{t.addEvent}</span>
              <span className="sm:hidden">+</span>
            </button>
          </div>

          {/* SuperAdmin migration banner */}
          {isSuperAdmin && (
            <div className="mb-4 flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: '#fefce8', border: '1px solid #fde047' }}>
              <p className="text-xs" style={{ color: '#854d0e', fontFamily: 'var(--font-body)' }}>
                {lang === 'es'
                  ? 'Si hay eventos con fecha antigua (eventDate), ejecuta la migración para convertirlos al nuevo formato.'
                  : 'If there are legacy events (eventDate field), run the migration to convert them to the new format.'}
              </p>
              <button
                onClick={handleMigrate} disabled={migrating}
                className="flex-shrink-0 ml-3 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: '#854d0e', color: 'white', fontFamily: 'var(--font-body)' }}
              >
                {migrating ? <Loader2 className="size-3 animate-spin" /> : null}
                {migrating ? t.migrating : t.migrationBtn}
              </button>
            </div>
          )}

          {/* Event list */}
          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="size-6 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-2xl py-14 px-8 text-center"
              style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
              <div className="mx-auto mb-4 size-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
                <CalendarDays className="size-7" />
              </div>
              <p className="text-sm mb-5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {t.noEvents}
              </p>
              <button
                onClick={() => setView({ mode: 'form' })}
                className="inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
              >
                <Plus className="size-4" />
                {t.addEvent}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map(ev => {
                const start   = getStart(ev);
                const end     = getEnd(ev);
                const multi   = isMultiDay(ev);
                const count   = multi ? dayCount(start, end) : 1;
                const startDt = start ? new Date(start + 'T00:00:00') : null;

                return (
                  <button
                    key={ev.id}
                    onClick={() => setView({ mode: 'detail', event: ev })}
                    className="w-full text-left rounded-2xl px-4 py-4 flex items-center gap-4 transition-all hover:shadow-md active:scale-[0.99]"
                    style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
                  >
                    {/* Date badge */}
                    <div
                      className="flex-shrink-0 rounded-xl p-2.5 text-center min-w-[52px]"
                      style={{ background: multi ? 'var(--tqf-cipria)' : 'var(--tqf-cipria-light)' }}
                    >
                      {multi ? (
                        <>
                          <CalendarRange className="size-4 mx-auto mb-0.5" style={{ color: 'var(--tqf-bordeaux)' }} />
                          <p className="text-xs font-medium"
                            style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', lineHeight: 1 }}>
                            {t.duration(count)}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-medium uppercase"
                            style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', letterSpacing: '0.06em', lineHeight: 1 }}>
                            {startDt ? monthAbbr(startDt, lang as LangKey) : '—'}
                          </p>
                          <p className="text-2xl"
                            style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-display)', fontWeight: 300, lineHeight: 1.1, marginTop: '2px' }}>
                            {startDt ? startDt.getDate() : '—'}
                          </p>
                          <p className="text-xs"
                            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', lineHeight: 1, marginTop: '2px' }}>
                            {startDt ? startDt.getFullYear() : ''}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate"
                        style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)' }}>
                        {ev.eventName}
                      </p>
                      <p className="flex items-center gap-1 text-xs mt-0.5 truncate"
                        style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                        <MapPin className="size-3 flex-shrink-0" />
                        {ev.location}
                      </p>
                      {/* Date range text for multi-day */}
                      {multi && start && (
                        <p className="text-xs mt-0.5"
                          style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', opacity: 0.8 }}>
                          {formatRange(start, end, lang as LangKey)}
                        </p>
                      )}
                      {ev.xbEventId && (
                        <span className="inline-flex items-center gap-1 text-xs mt-1.5 px-2 py-0.5 rounded-full"
                          style={{ background: '#f0fdf4', color: '#16a34a', fontFamily: 'var(--font-body)' }}>
                          <Link2 className="size-2.5" />
                          {t.linkedXb}
                        </span>
                      )}
                    </div>

                    <ChevronRight className="size-4 flex-shrink-0" style={{ color: 'var(--tqf-muted)' }} />
                  </button>
                );
              })}
            </div>
          )}
        </main>

        {deleteTarget && (
          <DeleteModal t={t} eventName={deleteTarget.eventName}
            onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} deleting={deleting} />
        )}
      </div>
    );
  }

  // ── DETAIL VIEW ─────────────────────────────────────────────────────────────

  if (view.mode === 'detail') {
    const ev    = view.event;
    const start = getStart(ev);
    const end   = getEnd(ev);
    const multi = isMultiDay(ev);
    const days  = multi ? dayCount(start, end) : 1;

    return (
      <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
        <PageHeader title={t.pageTitle} logout={logout} />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
          <button
            onClick={() => setView({ mode: 'list' })}
            className="flex items-center gap-1.5 text-sm mb-5 transition-opacity hover:opacity-70"
            style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <ArrowLeft className="size-4" />
            {t.backToList}
          </button>

          {/* Main card */}
          <div className="rounded-2xl p-5 mb-4"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>

            {/* Date section */}
            <div className="flex items-start gap-3 mb-4 pb-4"
              style={{ borderBottom: '1px solid var(--tqf-beige-border)' }}>
              <div className="size-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
                {multi ? <CalendarRange className="size-4" /> : <CalendarDays className="size-4" />}
              </div>
              {multi ? (
                <div>
                  <div className="flex items-center gap-2 text-sm mb-1">
                    <span style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', minWidth: '80px' }}>
                      {t.startDateLabel}
                    </span>
                    <span className="font-medium capitalize" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                      {start ? t.formatLong(start) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <span style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', minWidth: '80px' }}>
                      {t.endDateLabel}
                    </span>
                    <span className="font-medium capitalize" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                      {end ? t.formatLong(end) : '—'}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                    style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                    <CalendarRange className="size-3" />
                    {t.duration(days)}
                  </span>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium capitalize"
                    style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)' }}>
                    {start ? t.formatLong(start) : '—'}
                  </p>
                  <p className="text-xs mt-0.5"
                    style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                    {t.duration(1)}
                  </p>
                </div>
              )}
            </div>

            {/* Name */}
            <h2 className="text-2xl mb-3"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 300 }}>
              {ev.eventName}
            </h2>

            {/* Location */}
            <div className="flex items-center gap-2 text-sm"
              style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              <MapPin className="size-4 flex-shrink-0" style={{ color: 'var(--tqf-bordeaux)' }} />
              {ev.location}
            </div>

            {/* Notes */}
            {ev.notes && (
              <div className="mt-4 pt-4 flex items-start gap-2"
                style={{ borderTop: '1px solid var(--tqf-beige-border)' }}>
                <StickyNote className="size-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--tqf-muted)' }} />
                <p className="text-sm whitespace-pre-wrap"
                  style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                  {ev.notes}
                </p>
              </div>
            )}
          </div>

          {/* XB link */}
          <div className="mb-4">
            <XbLinkSection ev={ev} />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setView({ mode: 'form', editing: ev })}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ color: 'var(--tqf-bordeaux)', border: '1px solid var(--tqf-cipria)', background: 'var(--tqf-cipria-light)', fontFamily: 'var(--font-body)' }}
            >
              <Edit2 className="size-4" />
              {t.edit}
            </button>
            <button
              onClick={() => setDeleteTarget(ev)}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ color: '#991b1b', border: '1px solid #fecaca', background: '#fef2f2', fontFamily: 'var(--font-body)' }}
            >
              <Trash2 className="size-4" />
              {t.delete}
            </button>
          </div>
        </main>

        {deleteTarget && (
          <DeleteModal t={t} eventName={deleteTarget.eventName}
            onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} deleting={deleting} />
        )}
      </div>
    );
  }

  // ── FORM VIEW ───────────────────────────────────────────────────────────────

  const editing = view.mode === 'form' ? view.editing : undefined;
  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      <PageHeader title={t.pageTitle} logout={logout} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={() => editing ? setView({ mode: 'detail', event: editing }) : setView({ mode: 'list' })}
          className="flex items-center gap-1.5 text-sm mb-5 transition-opacity hover:opacity-70"
          style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <ArrowLeft className="size-4" />
          {t.backToList}
        </button>

        <h1 className="text-2xl mb-5"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 300 }}>
          {editing ? t.editEvent : t.newEvent}
        </h1>

        <div className="rounded-2xl p-5"
          style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
          <EventForm
            t={t}
            lang={lang as LangKey}
            editing={editing}
            xbEvents={xbEvents}
            xbLoading={xbLoading}
            onSave={editing
              ? (data) => handleUpdate(editing.id, data)
              : handleCreate
            }
            onCancel={() => editing ? setView({ mode: 'detail', event: editing }) : setView({ mode: 'list' })}
          />
        </div>
      </main>
    </div>
  );
}
