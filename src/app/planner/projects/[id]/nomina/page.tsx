'use client';

import {
  addNominaEntry,
  approveNominaEntry,
  deleteNominaEntry,
  revokeNominaApproval,
  updateNominaEntry,
} from '@/actions/planner/event-nomina';
import { getPlannerEvent } from '@/actions/planner/planner-event-crud';
import { db } from '@/firebase/client';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { NominaEntry, PlannerEvent } from '@/lib/planner-types';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// ── Hour helpers ──────────────────────────────────────────────────────────────

function calcHours(entry: string, exit: string): number {
  if (!entry || !exit) return 0;
  const [eh, em] = entry.split(':').map(Number);
  const [xh, xm] = exit.split(':').map(Number);
  let mins = xh * 60 + xm - (eh * 60 + em);
  if (mins < 0) mins += 1440; // crosses midnight
  return parseFloat((mins / 60).toFixed(2));
}

function fmtHours(h: number): string {
  if (h === 0) return '—';
  const hours = Math.floor(h);
  const mins  = Math.round((h - hours) * 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function hoursColor(h: number): string {
  if (h >= 12) return '#991b1b';
  if (h >= 10) return '#b45309';
  if (h > 0)   return '#15803d';
  return 'var(--tqf-muted)';
}

function hoursBg(h: number): string {
  if (h >= 12) return '#fef2f2';
  if (h >= 10) return '#fef9ee';
  if (h > 0)   return '#f0fdf4';
  return '#f3f4f6';
}

// ── Per-person card ───────────────────────────────────────────────────────────

function NominaCard({
  entry,
  eventId,
  canEdit,
  canApprove,
  approverName,
  onDeleted,
}: {
  entry: NominaEntry;
  eventId: string;
  canEdit: boolean;
  canApprove: boolean;
  approverName: string;
  onDeleted: () => void;
}) {
  const [entryAM, setEntryAM] = useState(entry.entryTimeAM);
  const [exitAM,  setExitAM]  = useState(entry.exitTimeAM);
  const [entryPM, setEntryPM] = useState(entry.entryTimePM);
  const [exitPM,  setExitPM]  = useState(entry.exitTimePM);
  const [desm,    setDesm]    = useState(entry.desmontajeCount ?? 0);
  const [saving,    setSaving]    = useState(false);
  const [approving, setApproving] = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [expanded,  setExpanded]  = useState(true);

  // Sync local state when Firestore pushes an update (e.g. remote approval)
  const lastUpdated = useRef(entry.updatedAt);
  useEffect(() => {
    if (entry.updatedAt !== lastUpdated.current) {
      lastUpdated.current = entry.updatedAt;
      setEntryAM(entry.entryTimeAM);
      setExitAM(entry.exitTimeAM);
      setEntryPM(entry.entryTimePM);
      setExitPM(entry.exitTimePM);
      setDesm(entry.desmontajeCount ?? 0);
    }
  }, [entry.updatedAt, entry.entryTimeAM, entry.exitTimeAM, entry.entryTimePM, entry.exitTimePM, entry.desmontajeCount]);

  const hoursAM = calcHours(entryAM, exitAM);
  const hoursPM = calcHours(entryPM, exitPM);
  const total   = parseFloat((hoursAM + hoursPM).toFixed(2));

  const isApproved = !!entry.approvedBy;

  async function handleSave() {
    setSaving(true);
    const result = await updateNominaEntry(eventId, entry.id, {
      entryTimeAM: entryAM, exitTimeAM: exitAM, hoursAM,
      entryTimePM: entryPM, exitTimePM: exitPM, hoursPM,
      totalHours: total,
      desmontajeCount: desm,
    });
    if (result.success) toast.success(`${entry.personName} — salvato.`);
    else toast.error(result.error ?? 'Errore salvataggio.');
    setSaving(false);
  }

  async function handleApprove() {
    setApproving(true);
    const result = isApproved
      ? await revokeNominaApproval(eventId, entry.id)
      : await approveNominaEntry(eventId, entry.id, approverName);
    if (!result.success) toast.error(result.error ?? 'Errore.');
    setApproving(false);
  }

  async function handleDelete() {
    if (!confirm(`Eliminare ${entry.personName} dalla nómina?`)) return;
    setDeleting(true);
    const result = await deleteNominaEntry(eventId, entry.id);
    if (result.success) onDeleted();
    else { toast.error(result.error ?? 'Errore eliminazione.'); setDeleting(false); }
  }

  const timeInput: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.5rem',
    borderRadius: '0.625rem',
    border: '1px solid var(--tqf-beige-border)',
    fontFamily: 'var(--font-body)',
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--tqf-dark)',
    background: isApproved ? 'var(--tqf-beige)' : 'white',
    outline: 'none',
    textAlign: 'center',
  };

  const shiftLabel: React.CSSProperties = {
    fontSize: '0.6rem',
    fontFamily: 'var(--font-body)',
    color: 'var(--tqf-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
    >
      {/* ── Card header ── */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        style={{ borderBottom: expanded ? '1px solid var(--tqf-beige-border)' : 'none' }}
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="size-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
            style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}
          >
            {entry.personName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
              {entry.personName}
            </p>
            <div className="flex items-center gap-2">
              {total > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{ background: hoursBg(total), color: hoursColor(total), fontFamily: 'var(--font-body)' }}
                >
                  {fmtHours(total)}
                </span>
              )}
              {desm > 0 && (
                <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  {desm} desm.
                </span>
              )}
              {isApproved && (
                <span className="text-xs flex items-center gap-0.5" style={{ color: '#15803d', fontFamily: 'var(--font-body)' }}>
                  <Check className="size-3" /> Approvato
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

      {/* ── Expanded content ── */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 pt-3">

          {/* AM shift */}
          <div>
            <p style={shiftLabel} className="mb-2">🌅 Turno Mattina</p>
            <div className="grid grid-cols-2 gap-2 items-end">
              <div>
                <p style={{ ...shiftLabel, marginBottom: '0.25rem' }}>Entrata</p>
                <input
                  type="time"
                  value={entryAM}
                  onChange={e => setEntryAM(e.target.value)}
                  disabled={!canEdit || isApproved}
                  style={timeInput}
                />
              </div>
              <div>
                <p style={{ ...shiftLabel, marginBottom: '0.25rem' }}>Uscita</p>
                <input
                  type="time"
                  value={exitAM}
                  onChange={e => setExitAM(e.target.value)}
                  disabled={!canEdit || isApproved}
                  style={timeInput}
                />
              </div>
            </div>
            {hoursAM > 0 && (
              <p className="text-xs mt-1 text-right" style={{ color: hoursColor(hoursAM), fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                {fmtHours(hoursAM)}
              </p>
            )}
          </div>

          {/* PM shift */}
          <div>
            <p style={shiftLabel} className="mb-2">🌆 Turno Pomeriggio</p>
            <div className="grid grid-cols-2 gap-2 items-end">
              <div>
                <p style={{ ...shiftLabel, marginBottom: '0.25rem' }}>Entrata</p>
                <input
                  type="time"
                  value={entryPM}
                  onChange={e => setEntryPM(e.target.value)}
                  disabled={!canEdit || isApproved}
                  style={timeInput}
                />
              </div>
              <div>
                <p style={{ ...shiftLabel, marginBottom: '0.25rem' }}>Uscita</p>
                <input
                  type="time"
                  value={exitPM}
                  onChange={e => setExitPM(e.target.value)}
                  disabled={!canEdit || isApproved}
                  style={timeInput}
                />
              </div>
            </div>
            {hoursPM > 0 && (
              <p className="text-xs mt-1 text-right" style={{ color: hoursColor(hoursPM), fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                {fmtHours(hoursPM)}
              </p>
            )}
          </div>

          {/* Total + Desmontaje row */}
          <div className="flex items-center justify-between">
            {/* Total hours badge */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: total > 0 ? hoursBg(total) : '#f3f4f6' }}
            >
              <Clock className="size-4" style={{ color: hoursColor(total) }} />
              <span
                className="text-base font-semibold"
                style={{ color: hoursColor(total), fontFamily: 'var(--font-body)' }}
              >
                {total > 0 ? fmtHours(total) : '—'}
              </span>
              <span className="text-xs" style={{ color: hoursColor(total), opacity: 0.7, fontFamily: 'var(--font-body)' }}>
                totali
              </span>
            </div>

            {/* Desmontaje spinner */}
            <div className="flex items-center gap-0">
              <p className="text-xs mr-2" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                Desmontaje
              </p>
              <button
                type="button"
                disabled={!canEdit || isApproved || desm <= 0}
                onClick={() => setDesm(v => Math.max(0, v - 1))}
                className="size-8 flex items-center justify-center rounded-l-xl transition-opacity disabled:opacity-30"
                style={{ border: '1px solid var(--tqf-beige-border)', background: 'white', color: 'var(--tqf-dark)' }}
              >
                <Minus className="size-3.5" />
              </button>
              <div
                className="size-8 flex items-center justify-center text-sm font-semibold"
                style={{ borderTop: '1px solid var(--tqf-beige-border)', borderBottom: '1px solid var(--tqf-beige-border)', background: 'var(--tqf-beige)', color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}
              >
                {desm}
              </div>
              <button
                type="button"
                disabled={!canEdit || isApproved}
                onClick={() => setDesm(v => v + 1)}
                className="size-8 flex items-center justify-center rounded-r-xl transition-opacity disabled:opacity-30"
                style={{ border: '1px solid var(--tqf-beige-border)', background: 'white', color: 'var(--tqf-dark)' }}
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Action buttons */}
          {(canEdit || canApprove) && (
            <div className="flex gap-2 pt-1">
              {canEdit && !isApproved && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  Salva
                </button>
              )}

              {canApprove && (
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={isApproved
                    ? { background: '#fef9ee', color: '#b45309', border: '1px solid #fde68a', fontFamily: 'var(--font-body)' }
                    : { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontFamily: 'var(--font-body)' }
                  }
                  title={isApproved ? 'Revoca approvazione' : 'Approva'}
                >
                  {approving
                    ? <Loader2 className="size-4 animate-spin" />
                    : isApproved
                    ? <ShieldOff className="size-4" />
                    : <ShieldCheck className="size-4" />
                  }
                </button>
              )}

              {canApprove && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', fontFamily: 'var(--font-body)' }}
                >
                  {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </button>
              )}
            </div>
          )}

          {isApproved && (
            <p className="text-xs text-center" style={{ color: '#15803d', fontFamily: 'var(--font-body)' }}>
              ✓ Approvato da {entry.approvedBy}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Summary bar ───────────────────────────────────────────────────────────────

function SummaryBar({ entries }: { entries: NominaEntry[] }) {
  const totalPeople    = entries.length;
  const totalHours     = entries.reduce((s, e) => s + (e.totalHours ?? 0), 0);
  const totalDesmontaje = entries.reduce((s, e) => s + (e.desmontajeCount ?? 0), 0);
  const approved       = entries.filter(e => !!e.approvedBy).length;

  return (
    <div
      className="mx-4 mt-4 rounded-2xl px-4 py-3 grid grid-cols-4 gap-2"
      style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
    >
      {[
        { label: 'Persone',    value: String(totalPeople) },
        { label: 'Ore totali', value: totalHours > 0 ? fmtHours(totalHours) : '—', color: hoursColor(totalHours) },
        { label: 'Desmontaje', value: String(totalDesmontaje) },
        { label: 'Approvati',  value: `${approved}/${totalPeople}` },
      ].map(({ label, value, color }) => (
        <div key={label} className="text-center">
          <p
            className="text-base font-semibold"
            style={{ color: color ?? 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}
          >
            {value}
          </p>
          <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NominaPage() {
  const params  = useParams();
  const router  = useRouter();
  const eventId = params?.id as string;

  const {
    plannerUser, adminUser, isSuperAdmin,
    canManageCashControl, canCreateProjects,
    isLoading: authLoading,
  } = usePlannerAuth();

  const [event,    setEvent]    = useState<PlannerEvent | null>(null);
  const [entries,  setEntries]  = useState<NominaEntry[]>([]);
  const [eventLoading, setEventLoading] = useState(true);

  // Add-person form
  const [showAdd,    setShowAdd]    = useState(false);
  const [newName,    setNewName]    = useState('');
  const [addingPerson, setAddingPerson] = useState(false);

  // PDF download
  const [downloading, setDownloading] = useState(false);

  // Load event once
  useEffect(() => {
    if (!eventId) return;
    getPlannerEvent(eventId).then(e => {
      if (!e) { router.replace('/planner'); return; }
      setEvent(e);
      setEventLoading(false);
    });
  }, [eventId, router]);

  // Real-time nomina entries
  useEffect(() => {
    if (!eventId) return;
    const q = query(
      collection(db, 'plannerEvents', eventId, 'nomina'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as NominaEntry)));
    });
    return () => unsub();
  }, [eventId]);

  // Gate while loading
  if (authLoading || eventLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  const isOwnEvent = plannerUser?.id === event?.plannerId;
  const canView  = isSuperAdmin || canManageCashControl || (canCreateProjects && isOwnEvent);
  const canEdit  = isSuperAdmin || canManageCashControl;
  const canApprove = isSuperAdmin;

  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--tqf-beige)' }}>
        <div className="text-center">
          <p className="text-base mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)' }}>Accesso non autorizzato</p>
          <Link href="/planner" className="text-sm" style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>← Dashboard</Link>
        </div>
      </div>
    );
  }

  const approverName = adminUser?.name ?? adminUser?.email ?? plannerUser?.name ?? 'Admin';

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleAddPerson() {
    if (!newName.trim()) { toast.error('Inserisci il nome della persona.'); return; }
    setAddingPerson(true);
    const result = await addNominaEntry(eventId, newName.trim());
    if (result.success) {
      toast.success(`${newName.trim()} aggiunta alla nómina.`);
      setNewName('');
      setShowAdd(false);
    } else {
      toast.error(result.error ?? 'Errore.');
    }
    setAddingPerson(false);
  }

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      const res = await fetch('/api/nomina-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      if (!res.ok) throw new Error('Errore generazione PDF.');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `TQF_Nomina_${(event?.eventCode || 'evento').replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e.message ?? 'Errore download PDF.');
    }
    setDownloading(false);
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-8" style={{ background: 'var(--tqf-beige)' }}>

      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
        style={{ background: 'white', borderBottom: '1px solid var(--tqf-beige-border)' }}
      >
        <Link
          href={`/planner/projects/${eventId}`}
          className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
        >
          <ArrowLeft className="size-4" />
          <span className="hidden xs:inline">Evento</span>
        </Link>

        <div className="flex items-center gap-2">
          <p
            className="text-sm font-medium truncate max-w-[140px]"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontWeight: 400 }}
          >
            {event?.eventCode || event?.clientName || 'Evento'}
          </p>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}
          >
            Nómina
          </span>
        </div>

        <button
          onClick={handleDownloadPdf}
          disabled={downloading || entries.length === 0}
          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ color: 'var(--tqf-bordeaux)', border: '1px solid var(--tqf-cipria)', background: 'var(--tqf-cipria-light)', fontFamily: 'var(--font-body)' }}
        >
          {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          <span className="hidden sm:inline">PDF</span>
        </button>
      </header>

      {/* Summary */}
      <SummaryBar entries={entries} />

      {/* Add-person button / form */}
      {canEdit && (
        <div className="mx-4 mt-4">
          {!showAdd ? (
            <button
              onClick={() => setShowAdd(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-medium transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ border: '2px dashed var(--tqf-beige-border)', color: 'var(--tqf-bordeaux)', background: 'white', fontFamily: 'var(--font-body)' }}
            >
              <Plus className="size-4" />
              Aggiungi persona
            </button>
          ) : (
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
            >
              <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                Nuova persona
              </p>
              <div className="flex items-center gap-2">
                <div
                  className="size-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}
                >
                  <Users className="size-4" />
                </div>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddPerson()}
                  placeholder="Nome e cognome"
                  autoFocus
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)', background: 'var(--tqf-beige)' }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddPerson}
                  disabled={addingPerson}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
                >
                  {addingPerson ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  Aggiungi
                </button>
                <button
                  onClick={() => { setShowAdd(false); setNewName(''); }}
                  className="px-4 py-3 rounded-xl text-sm transition-opacity hover:opacity-70"
                  style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
                >
                  Annulla
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Entries list */}
      {entries.length === 0 ? (
        <div
          className="mx-4 mt-4 rounded-2xl p-10 text-center"
          style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
        >
          <div
            className="mx-auto mb-4 size-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}
          >
            <Users className="size-7" />
          </div>
          <p className="text-base mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
            Nessuna persona ancora
          </p>
          <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            {canEdit ? 'Usa il pulsante qui sopra per aggiungere il team.' : 'Non ci sono entrate di nómina per questo evento.'}
          </p>
        </div>
      ) : (
        <div className="mx-4 mt-4 space-y-3">
          {entries.map(entry => (
            <NominaCard
              key={entry.id}
              entry={entry}
              eventId={eventId}
              canEdit={canEdit}
              canApprove={canApprove}
              approverName={approverName}
              onDeleted={() => toast.success('Rimosso dalla nómina.')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
