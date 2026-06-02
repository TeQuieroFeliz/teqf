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
import { CashMovement, NominaEntry, PlannerEvent } from '@/lib/planner-types';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  Download,
  Loader2,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// ─── Hour helpers ─────────────────────────────────────────────────────────────

function calcHours(entry: string, exit: string): number {
  if (!entry || !exit) return 0;
  const [eh, em] = entry.split(':').map(Number);
  const [xh, xm] = exit.split(':').map(Number);
  let mins = xh * 60 + xm - (eh * 60 + em);
  if (mins < 0) mins += 1440;
  return parseFloat((mins / 60).toFixed(2));
}
function fmtHours(h: number) {
  if (h === 0) return '—';
  const hrs = Math.floor(h);
  const m   = Math.round((h - hrs) * 60);
  return m > 0 ? `${hrs}h ${m}m` : `${hrs}h`;
}
function hoursColor(h: number) {
  if (h >= 12) return '#991b1b';
  if (h >= 10) return '#b45309';
  if (h > 0)  return '#15803d';
  return 'var(--tqf-muted)';
}
function hoursBg(h: number) {
  if (h >= 12) return '#fef2f2';
  if (h >= 10) return '#fef9ee';
  if (h > 0)  return '#f0fdf4';
  return '#f3f4f6';
}
function fmtCurrency(n: number) {
  return `$${Math.abs(n).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;
}

// ─── NominaCard ───────────────────────────────────────────────────────────────

function NominaCard({
  entry, eventId, canEdit, canApprove, approverName, onDeleted,
}: {
  entry: NominaEntry; eventId: string;
  canEdit: boolean; canApprove: boolean;
  approverName: string; onDeleted: () => void;
}) {
  const [entryAM, setEntryAM] = useState(entry.entryTimeAM);
  const [exitAM,  setExitAM]  = useState(entry.exitTimeAM);
  const [entryPM, setEntryPM] = useState(entry.entryTimePM);
  const [exitPM,  setExitPM]  = useState(entry.exitTimePM);
  const [desm,    setDesm]    = useState(entry.desmontajeCount ?? 0);
  const [saving,    setSaving]    = useState(false);
  const [approving, setApproving] = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [expanded,  setExpanded]  = useState(false);

  const lastUpdated = useRef(entry.updatedAt);
  useEffect(() => {
    if (entry.updatedAt !== lastUpdated.current) {
      lastUpdated.current = entry.updatedAt;
      setEntryAM(entry.entryTimeAM); setExitAM(entry.exitTimeAM);
      setEntryPM(entry.entryTimePM); setExitPM(entry.exitTimePM);
      setDesm(entry.desmontajeCount ?? 0);
    }
  }, [entry.updatedAt, entry.entryTimeAM, entry.exitTimeAM, entry.entryTimePM, entry.exitTimePM, entry.desmontajeCount]);

  const hoursAM  = calcHours(entryAM, exitAM);
  const hoursPM  = calcHours(entryPM, exitPM);
  const total    = parseFloat((hoursAM + hoursPM).toFixed(2));
  const isApproved = !!entry.approvedBy;

  const timeInput: React.CSSProperties = {
    width: '100%', padding: '0.5rem', borderRadius: '0.625rem',
    border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)',
    fontSize: '1rem', fontWeight: 600, color: 'var(--tqf-dark)',
    background: isApproved ? 'var(--tqf-beige)' : 'white',
    outline: 'none', textAlign: 'center' as const,
  };
  const shiftLbl: React.CSSProperties = {
    fontSize: '0.6rem', fontFamily: 'var(--font-body)', color: 'var(--tqf-muted)',
    textTransform: 'uppercase' as const, letterSpacing: '0.12em',
  };

  async function handleSave() {
    setSaving(true);
    const r = await updateNominaEntry(eventId, entry.id, {
      entryTimeAM: entryAM, exitTimeAM: exitAM, hoursAM,
      entryTimePM: entryPM, exitTimePM: exitPM, hoursPM,
      totalHours: total, desmontajeCount: desm,
    });
    if (r.success) toast.success(`${entry.personName} — salvato.`);
    else toast.error(r.error ?? 'Errore.');
    setSaving(false);
  }

  async function handleApprove() {
    setApproving(true);
    const r = isApproved
      ? await revokeNominaApproval(eventId, entry.id)
      : await approveNominaEntry(eventId, entry.id, approverName);
    if (!r.success) toast.error(r.error ?? 'Errore.');
    setApproving(false);
  }

  async function handleDelete() {
    if (!confirm(`Eliminare ${entry.personName} dalla nómina?`)) return;
    setDeleting(true);
    const r = await deleteNominaEntry(eventId, entry.id);
    if (r.success) onDeleted();
    else { toast.error(r.error ?? 'Errore.'); setDeleting(false); }
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
      {/* Header row — always visible */}
      <div
        className="flex items-center justify-between px-4 py-3.5 cursor-pointer"
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
            <div className="flex items-center gap-2 flex-wrap">
              {total > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{ background: hoursBg(total), color: hoursColor(total), fontFamily: 'var(--font-body)' }}>
                  {fmtHours(total)}
                </span>
              )}
              {(entryAM || exitAM) && (
                <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  AM {entryAM || '?'}–{exitAM || '?'}
                </span>
              )}
              {(entryPM || exitPM) && (
                <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  PM {entryPM || '?'}–{exitPM || '?'}
                </span>
              )}
              {desm > 0 && (
                <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{desm} desm.</span>
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

      {/* Expanded: shift inputs + actions */}
      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-4">

          {/* AM */}
          <div>
            <p style={shiftLbl} className="mb-2">🌅 Turno Mattina</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p style={{ ...shiftLbl, marginBottom: '0.25rem' }}>Entrata</p>
                <input type="time" value={entryAM}
                  onChange={e => setEntryAM(e.target.value)}
                  disabled={!canEdit || isApproved} style={timeInput} />
              </div>
              <div>
                <p style={{ ...shiftLbl, marginBottom: '0.25rem' }}>Uscita</p>
                <input type="time" value={exitAM}
                  onChange={e => setExitAM(e.target.value)}
                  disabled={!canEdit || isApproved} style={timeInput} />
              </div>
            </div>
            {hoursAM > 0 && (
              <p className="text-xs mt-1 text-right font-semibold"
                style={{ color: hoursColor(hoursAM), fontFamily: 'var(--font-body)' }}>
                {fmtHours(hoursAM)}
              </p>
            )}
          </div>

          {/* PM */}
          <div>
            <p style={shiftLbl} className="mb-2">🌆 Turno Pomeriggio</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p style={{ ...shiftLbl, marginBottom: '0.25rem' }}>Entrata</p>
                <input type="time" value={entryPM}
                  onChange={e => setEntryPM(e.target.value)}
                  disabled={!canEdit || isApproved} style={timeInput} />
              </div>
              <div>
                <p style={{ ...shiftLbl, marginBottom: '0.25rem' }}>Uscita</p>
                <input type="time" value={exitPM}
                  onChange={e => setExitPM(e.target.value)}
                  disabled={!canEdit || isApproved} style={timeInput} />
              </div>
            </div>
            {hoursPM > 0 && (
              <p className="text-xs mt-1 text-right font-semibold"
                style={{ color: hoursColor(hoursPM), fontFamily: 'var(--font-body)' }}>
                {fmtHours(hoursPM)}
              </p>
            )}
          </div>

          {/* Total + Desmontaje */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: total > 0 ? hoursBg(total) : '#f3f4f6' }}>
              <Clock className="size-4" style={{ color: hoursColor(total) }} />
              <span className="text-base font-semibold" style={{ color: hoursColor(total), fontFamily: 'var(--font-body)' }}>
                {total > 0 ? fmtHours(total) : '—'}
              </span>
              <span className="text-xs opacity-70" style={{ color: hoursColor(total), fontFamily: 'var(--font-body)' }}>totali</span>
            </div>

            <div className="flex items-center">
              <p className="text-xs mr-2" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>Desmontaje</p>
              <button type="button" disabled={!canEdit || isApproved || desm <= 0}
                onClick={() => setDesm(v => Math.max(0, v - 1))}
                className="size-8 flex items-center justify-center rounded-l-xl disabled:opacity-30"
                style={{ border: '1px solid var(--tqf-beige-border)', background: 'white' }}>
                <Minus className="size-3.5" />
              </button>
              <div className="size-8 flex items-center justify-center text-sm font-semibold"
                style={{ borderTop: '1px solid var(--tqf-beige-border)', borderBottom: '1px solid var(--tqf-beige-border)', background: 'var(--tqf-beige)', fontFamily: 'var(--font-body)' }}>
                {desm}
              </div>
              <button type="button" disabled={!canEdit || isApproved}
                onClick={() => setDesm(v => v + 1)}
                className="size-8 flex items-center justify-center rounded-r-xl disabled:opacity-30"
                style={{ border: '1px solid var(--tqf-beige-border)', background: 'white' }}>
                <Plus className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Actions */}
          {(canEdit || canApprove) && (
            <div className="flex gap-2 pt-1">
              {canEdit && !isApproved && (
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium disabled:opacity-50"
                  style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  Salva
                </button>
              )}
              {canApprove && (
                <button onClick={handleApprove} disabled={approving}
                  className="flex items-center justify-center px-4 py-3 rounded-2xl text-sm disabled:opacity-50"
                  style={isApproved
                    ? { background: '#fef9ee', color: '#b45309', border: '1px solid #fde68a', fontFamily: 'var(--font-body)' }
                    : { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontFamily: 'var(--font-body)' }}>
                  {approving ? <Loader2 className="size-4 animate-spin" />
                    : isApproved ? <ShieldOff className="size-4" /> : <ShieldCheck className="size-4" />}
                </button>
              )}
              {canApprove && (
                <button onClick={handleDelete} disabled={deleting}
                  className="flex items-center justify-center px-4 py-3 rounded-2xl text-sm disabled:opacity-50"
                  style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', fontFamily: 'var(--font-body)' }}>
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

  const [event,    setEvent]    = useState<PlannerEvent | null>(null);
  const [entries,  setEntries]  = useState<NominaEntry[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [cashBudget, setCashBudget] = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('nomina');

  // Add-person form
  const [showAdd,   setShowAdd]   = useState(false);
  const [newName,   setNewName]   = useState('');
  const [addingPerson, setAddingPerson] = useState(false);
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

  // Real-time nomina
  useEffect(() => {
    if (!eventId) return;
    const unsub = onSnapshot(
      query(collection(db, 'plannerEvents', eventId, 'nomina'), orderBy('createdAt', 'asc')),
      snap => setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as NominaEntry)))
    );
    return () => unsub();
  }, [eventId]);

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

  const isOwnEvent  = plannerUser?.id === event?.plannerId;
  const canView  = isSuperAdmin || canManageCashControl || (canCreateProjects && isOwnEvent);
  const canEdit  = isSuperAdmin || canManageCashControl;
  const canApprove = isSuperAdmin;
  const approverName = adminUser?.name ?? adminUser?.email ?? plannerUser?.name ?? 'Admin';

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

  // Cash stats
  const totalSpent = movements.reduce((s, m) => s + m.amount, 0);
  const balance    = cashBudget - totalSpent;

  // Nomina stats
  const totalHours = entries.reduce((s, e) => s + (e.totalHours ?? 0), 0);
  const approved   = entries.filter(e => !!e.approvedBy).length;

  // First event day date display
  const firstDay = event?.days?.[0];
  const eventDateLabel = firstDay
    ? new Date(firstDay.date + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  async function handleAddPerson() {
    if (!newName.trim()) { toast.error('Inserisci il nome della persona.'); return; }
    setAddingPerson(true);
    const r = await addNominaEntry(eventId, newName.trim());
    if (r.success) { toast.success(`${newName.trim()} aggiunta.`); setNewName(''); setShowAdd(false); }
    else toast.error(r.error ?? 'Errore.');
    setAddingPerson(false);
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
    } catch (e: any) {
      toast.error(e.message ?? 'Errore download PDF.');
    }
    setDownloading(false);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-8" style={{ background: 'var(--tqf-beige)' }}>

      {/* ── Sticky header ────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-10 px-4 pt-3 pb-0"
        style={{ background: 'white', borderBottom: '1px solid var(--tqf-beige-border)' }}
      >
        {/* Top row */}
        <div className="flex items-center justify-between mb-3">
          <Link
            href="/planner"
            className="flex items-center gap-1.5 text-sm"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
          >
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

          <Link
            href={`/planner/events/${eventId}`}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg"
            style={{ color: 'var(--tqf-bordeaux)', border: '1px solid var(--tqf-cipria)', background: 'var(--tqf-cipria-light)', fontFamily: 'var(--font-body)' }}
          >
            Modifica
          </Link>
        </div>

        {/* Event meta */}
        {(eventDateLabel || firstDay?.venue) && (
          <div className="flex items-center gap-3 pb-3 flex-wrap">
            {eventDateLabel && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
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
          {([
            { id: 'nomina' as Tab, icon: <Users className="size-4" />, label: 'Nómina',
              badge: `${entries.length}` },
            { id: 'gastos' as Tab, icon: <Wallet className="size-4" />, label: 'Gastos',
              badge: movements.length > 0 ? fmtCurrency(cashBudget > 0 ? balance : totalSpent) : null },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative"
              style={{
                color: activeTab === tab.id ? 'var(--tqf-bordeaux)' : 'var(--tqf-muted)',
                fontFamily: 'var(--font-body)',
                borderBottom: activeTab === tab.id ? '2px solid var(--tqf-bordeaux)' : '2px solid transparent',
                background: 'white',
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.badge && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    background: activeTab === tab.id ? 'var(--tqf-cipria-light)' : '#f3f4f6',
                    color: activeTab === tab.id ? 'var(--tqf-bordeaux)' : 'var(--tqf-muted)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* ══════════════════ NÓMINA TAB ══════════════════ */}
      {activeTab === 'nomina' && (
        <>
          {/* Stats bar */}
          <div className="mx-4 mt-4 rounded-2xl px-4 py-3 grid grid-cols-4 gap-2"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            {[
              { label: 'Persone', value: String(entries.length) },
              { label: 'Ore', value: totalHours > 0 ? fmtHours(totalHours) : '—',
                color: hoursColor(totalHours) },
              { label: 'Desm.', value: String(entries.reduce((s, e) => s + (e.desmontajeCount ?? 0), 0)) },
              { label: 'Approv.', value: `${approved}/${entries.length}`,
                color: approved === entries.length && entries.length > 0 ? '#15803d' : undefined },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className="text-base font-semibold" style={{ color: color ?? 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                  {value}
                </p>
                <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Actions row */}
          <div className="mx-4 mt-3 flex gap-2">
            {canEdit && (
              <button
                onClick={() => setShowAdd(v => !v)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium"
                style={{
                  border: showAdd ? '1.5px solid var(--tqf-bordeaux)' : '2px dashed var(--tqf-beige-border)',
                  color: 'var(--tqf-bordeaux)', background: showAdd ? 'var(--tqf-cipria-light)' : 'white',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <Plus className="size-4" />
                Aggiungi persona
              </button>
            )}
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

          {/* Add-person inline form */}
          {showAdd && canEdit && (
            <div className="mx-4 mt-3 rounded-2xl p-4 space-y-3"
              style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
              <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                Nuova persona
              </p>
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
                  <Users className="size-4" />
                </div>
                <input
                  type="text" value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddPerson()}
                  placeholder="Nome e cognome" autoFocus
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)', background: 'var(--tqf-beige)' }}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddPerson} disabled={addingPerson}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                  style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
                  {addingPerson ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  Aggiungi
                </button>
                <button onClick={() => { setShowAdd(false); setNewName(''); }}
                  className="px-4 py-2.5 rounded-xl text-sm"
                  style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  Annulla
                </button>
              </div>
            </div>
          )}

          {/* Entry cards */}
          {entries.length === 0 ? (
            <div className="mx-4 mt-4 rounded-2xl p-10 text-center"
              style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
              <div className="mx-auto mb-4 size-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
                <Users className="size-6" />
              </div>
              <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {canEdit ? 'Usa il pulsante qui sopra per aggiungere il team.' : 'Nessuna persona nella nómina.'}
              </p>
            </div>
          ) : (
            <div className="mx-4 mt-3 space-y-3">
              {entries.map(e => (
                <NominaCard
                  key={e.id} entry={e} eventId={eventId}
                  canEdit={canEdit} canApprove={canApprove}
                  approverName={approverName}
                  onDeleted={() => toast.success('Rimosso dalla nómina.')}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════════════ GASTOS TAB ══════════════════ */}
      {activeTab === 'gastos' && (
        <div className="mx-4 mt-4 space-y-3">
          {/* Balance card */}
          <div
            className="rounded-3xl px-5 pt-5 pb-4"
            style={{
              background: cashBudget > 0
                ? (balance >= 0 ? '#0f2e1a' : '#2a0e0e')
                : '#1a0f0a',
            }}
          >
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
              {cashBudget > 0 && (
                <span className="text-xs opacity-60" style={{ color: 'white', fontFamily: 'var(--font-body)' }}>
                  Budget {fmtCurrency(cashBudget)}
                </span>
              )}
              <span className="text-xs opacity-60" style={{ color: 'white', fontFamily: 'var(--font-body)' }}>
                Gastato {fmtCurrency(totalSpent)}
              </span>
              <span className="text-xs opacity-50" style={{ color: 'white', fontFamily: 'var(--font-body)' }}>
                {movements.length} movim.
              </span>
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
                      <p className="text-sm capitalize truncate"
                        style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                        {m.category}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                        {m.date} {m.time} · {m.registeredByName?.split(' ')[0]}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                    <span className="text-xs px-1.5 py-0.5 rounded-full"
                      style={m.status === 'approved'
                        ? { background: '#f0fdf4', color: '#15803d', fontFamily: 'var(--font-body)' }
                        : { background: '#fef9ee', color: '#b45309', fontFamily: 'var(--font-body)' }}>
                      {m.status === 'approved' ? '✓' : '·'}
                    </span>
                    <p className="text-sm font-semibold" style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                      -{fmtCurrency(m.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA to full page */}
          <Link
            href={`/planner/projects/${eventId}/cash-control`}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-medium"
            style={{ border: '1.5px solid var(--tqf-beige-border)', color: 'var(--tqf-bordeaux)', background: 'white', fontFamily: 'var(--font-body)' }}
          >
            <Wallet className="size-4" />
            {movements.length === 0 ? 'Registra il primo gasto' : 'Gestisci tutti i gastos'}
          </Link>
        </div>
      )}
    </div>
  );
}
