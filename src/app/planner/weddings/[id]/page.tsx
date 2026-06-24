'use client';

import {
  deleteWedding,
  getTeqfPlanners,
  getWedding,
  removeQuoteFile,
  updateWeddingStatus,
} from '@/actions/weddings/weddings';
import { getFunctions, deleteFunction } from '@/actions/weddings/functions';
import { getVersions, saveAsNewVersion, restoreVersion } from '@/actions/weddings/versions';
import { syncWithTeqfCalendar, unlinkFromCalendar } from '@/actions/weddings/calendar-sync';
import { useLangContext } from '@/context/LangContext';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import AccessDenied from '@/components/planner/AccessDenied';
import { deleteFromStorage } from '@/lib/storage-upload';
import { Wedding, WeddingFunction, WeddingStatus, WeddingVersion, QuoteFile } from '@/lib/wedding-types';
import {
  ArrowLeft, CalendarDays, ChevronDown, Clock, Edit2, ExternalLink,
  FileText, Heart, History, Link2, Link2Off, Loader2, LogOut, MapPin,
  Plus, Save, Trash2, X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// ── Translations ──────────────────────────────────────────────────────────────

const TR = {
  en: {
    tab_info: 'Info', tab_functions: 'Functions', tab_versions: 'Versions',
    backToList: '← Weddings',
    editWedding: 'Edit',
    deleteWedding: 'Delete Wedding',
    deleteConfirm: (n: string) => `Permanently delete "${n}"?`,
    status_draft: 'Draft', status_in_review: 'In Review', status_quoted: 'Quoted',
    status_approved: 'Approved', status_completed: 'Completed',
    changeStatus: 'Change Status',
    saveVersion: 'Save as Version',
    versionLabel: 'Version label (optional)',
    versionDesc: 'Describe the changes *',
    versionSave: 'Save Version', versionSaving: 'Saving…',
    versionSaved: 'Version saved.',
    versionDescRequired: 'Please describe the changes.',
    primaryLocation: 'Location',
    assignedTeqf: 'TeQF Planner',
    noTeqf: 'Not assigned',
    createdBy: 'Created by',
    dateRange: 'Date',
    noDate: 'No date set',
    status: 'Status',
    calendarSync: 'Sync with Calendar',
    calendarSynced: 'Synced with TeQF Calendar',
    calendarUnlink: 'Unlink',
    calendarUnlinked: 'Linked to TeQF Calendar.',
    calendarSyncDone: 'Calendar event updated.',
    viewInCalendar: 'View in Calendar',
    quoteFiles: 'Quote Files',
    noQuoteFiles: 'No quote files uploaded yet.',
    uploadQuote: 'Upload PDF',
    version: 'v',
    uploadedBy: 'by',
    deleteFile: 'Remove',
    // Functions tab
    addFunction: '+ Add Function',
    noFunctions: 'No functions yet. Add the first one.',
    functionDate: 'Date',
    functionVenue: 'Venue',
    functionOrder: 'Order',
    fnDelete: 'Delete',
    fnDeleteConfirm: (n: string) => `Delete function "${n}"?`,
    fnDeleted: 'Function deleted.',
    // Versions tab
    noVersions: 'No versions saved yet.',
    restore: 'Restore',
    restoreConfirm: (n: number) => `Restore to version ${n}?`,
    restored: 'Version restored.',
    viewVersion: 'View',
    versionRestored: 'RESTORED',
    deleted: 'Wedding deleted.',
    deleteError: 'Failed to delete wedding.',
    synced: 'Synced with TeQF Calendar.',
    unlinkDone: 'Unlinked from calendar.',
    functionTypes: {
      haldi: 'Haldi', sangeet: 'Sangeet', ceremony: 'Ceremony',
      reception: 'Reception', custom: 'Custom',
    } as Record<string, string>,
    duration: (n: number) => n === 1 ? '1 day' : `${n} days`,
  },
  es: {
    tab_info: 'Info', tab_functions: 'Funciones', tab_versions: 'Versiones',
    backToList: '← Bodas',
    editWedding: 'Editar',
    deleteWedding: 'Eliminar Boda',
    deleteConfirm: (n: string) => `¿Eliminar permanentemente "${n}"?`,
    status_draft: 'Borrador', status_in_review: 'En Revisión', status_quoted: 'Cotizado',
    status_approved: 'Aprobado', status_completed: 'Completado',
    changeStatus: 'Cambiar Estado',
    saveVersion: 'Guardar Versión',
    versionLabel: 'Etiqueta (opcional)',
    versionDesc: 'Describe los cambios *',
    versionSave: 'Guardar', versionSaving: 'Guardando…',
    versionSaved: 'Versión guardada.',
    versionDescRequired: 'Describe los cambios.',
    primaryLocation: 'Ubicación',
    assignedTeqf: 'Planificadora TeQF',
    noTeqf: 'Sin asignar',
    createdBy: 'Creado por',
    dateRange: 'Fecha',
    noDate: 'Sin fecha',
    status: 'Estado',
    calendarSync: 'Sincronizar con Calendario',
    calendarSynced: 'Sincronizado con Calendario TeQF',
    calendarUnlink: 'Desvincular',
    calendarUnlinked: 'Vinculado al Calendario TeQF.',
    calendarSyncDone: 'Evento del calendario actualizado.',
    viewInCalendar: 'Ver en Calendario',
    quoteFiles: 'Archivos de Cotización',
    noQuoteFiles: 'Sin archivos de cotización aún.',
    uploadQuote: 'Subir PDF',
    version: 'v',
    uploadedBy: 'por',
    deleteFile: 'Eliminar',
    addFunction: '+ Agregar Función',
    noFunctions: 'Sin funciones aún. Agrega la primera.',
    functionDate: 'Fecha',
    functionVenue: 'Sede',
    functionOrder: 'Orden',
    fnDelete: 'Eliminar',
    fnDeleteConfirm: (n: string) => `¿Eliminar la función "${n}"?`,
    fnDeleted: 'Función eliminada.',
    noVersions: 'Sin versiones guardadas aún.',
    restore: 'Restaurar',
    restoreConfirm: (n: number) => `¿Restaurar a la versión ${n}?`,
    restored: 'Versión restaurada.',
    viewVersion: 'Ver',
    versionRestored: 'RESTAURADO',
    deleted: 'Boda eliminada.',
    deleteError: 'Error al eliminar la boda.',
    synced: 'Sincronizado con Calendario TeQF.',
    unlinkDone: 'Desvinculado del calendario.',
    functionTypes: {
      haldi: 'Haldi', sangeet: 'Sangeet', ceremony: 'Ceremonia',
      reception: 'Recepción', custom: 'Personalizado',
    } as Record<string, string>,
    duration: (n: number) => n === 1 ? '1 día' : `${n} días`,
  },
} as const;
type Tr = typeof TR[keyof typeof TR];
type LangKey = 'en' | 'es';

const STATUS_STYLES: Record<WeddingStatus, React.CSSProperties> = {
  draft:      { background: '#f3f4f6', color: '#6b7280' },
  in_review:  { background: '#fef3c7', color: '#92400e' },
  quoted:     { background: '#dbeafe', color: '#1e40af' },
  approved:   { background: '#d1fae5', color: '#065f46' },
  completed:  { background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' },
};

function StatusBadge({ status, t }: { status: WeddingStatus; t: Tr }) {
  return (
    <span className="text-xs px-2.5 py-1 rounded-full font-medium"
      style={{ ...STATUS_STYLES[status], fontFamily: 'var(--font-body)' }}>
      {t[`status_${status}` as keyof Tr] as string}
    </span>
  );
}

function formatDateRange(start: string | null, end: string | null, lang: LangKey): string {
  if (!start) return '';
  const locale = lang === 'es' ? 'es-MX' : 'en-US';
  const s = new Date(start + 'T00:00:00');
  if (!end || start === end) return s.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const e = new Date(end + 'T00:00:00');
  return `${s.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function dayCount(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WeddingDetailPage() {
  const { isSuperAdmin, canCreateProjects, canManageCashControl, plannerUser, adminUser, isLoading: authLoading, logout } = usePlannerAuth();
  const { lang } = useLangContext();
  const t = TR[lang as LangKey] ?? TR.en;
  const params = useParams();
  const router = useRouter();
  const weddingId = params.id as string;

  const canEdit   = isSuperAdmin || canCreateProjects;
  const canTeqf   = isSuperAdmin || canManageCashControl;
  const canView   = canEdit || canTeqf;

  const userId   = plannerUser?.id   ?? adminUser?.id   ?? '';
  const userName = plannerUser
    ? `${plannerUser.name ?? ''} ${plannerUser.lastName ?? ''}`.trim()
    : adminUser?.name ?? '';

  const [wedding, setWedding]     = useState<Wedding | null>(null);
  const [functions, setFunctions] = useState<WeddingFunction[]>([]);
  const [versions, setVersions]   = useState<WeddingVersion[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'functions' | 'versions'>('info');

  // Modal states
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionLabel, setVersionLabel]         = useState('');
  const [versionDesc, setVersionDesc]           = useState('');
  const [versionSaving, setVersionSaving]       = useState(false);
  const [showStatusMenu, setShowStatusMenu]     = useState(false);
  const [showDeleteModal, setShowDeleteModal]   = useState(false);
  const [deleting, setDeleting]                 = useState(false);
  const [syncing, setSyncing]                   = useState(false);

  useEffect(() => {
    if (authLoading || !canView) return;
    Promise.all([
      getWedding(weddingId),
      getFunctions(weddingId),
    ]).then(([wRes, fRes]) => {
      if (wRes.success) setWedding(wRes.data!);
      if (fRes.success) setFunctions(fRes.data!);
    }).finally(() => setLoading(false));
  }, [authLoading, canView, weddingId]);

  useEffect(() => {
    if (activeTab === 'versions' && versions.length === 0 && !loading) {
      getVersions(weddingId).then(res => { if (res.success) setVersions(res.data!); });
    }
  }, [activeTab, weddingId, loading, versions.length]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  if (!canView) return <AccessDenied />;
  if (!wedding) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
      <p style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>Wedding not found.</p>
    </div>
  );

  const STATUSES: WeddingStatus[] = ['draft', 'in_review', 'quoted', 'approved', 'completed'];

  async function handleStatusChange(s: WeddingStatus) {
    setShowStatusMenu(false);
    const res = await updateWeddingStatus(weddingId, s);
    if (res.success) setWedding(w => w ? { ...w, status: s } : w);
    else toast.error(res.error ?? 'Failed to update status.');
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await deleteWedding(weddingId);
    if (res.success) {
      toast.success(t.deleted);
      router.push('/planner/weddings');
    } else {
      toast.error(res.error ?? t.deleteError);
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  async function handleSaveVersion() {
    if (!versionDesc.trim()) { toast.error(t.versionDescRequired); return; }
    setVersionSaving(true);
    const res = await saveAsNewVersion(weddingId, {
      versionLabel: versionLabel.trim(),
      changeDescription: versionDesc.trim(),
      savedBy: userId,
      savedByName: userName,
    });
    setVersionSaving(false);
    if (res.success) {
      toast.success(t.versionSaved);
      setWedding(w => w ? { ...w, currentVersionNumber: res.versionNumber! } : w);
      setVersions([]);
      setShowVersionModal(false);
      setVersionLabel('');
      setVersionDesc('');
    } else {
      toast.error(res.error ?? 'Failed to save version.');
    }
  }

  async function handleCalendarSync() {
    setSyncing(true);
    const res = await syncWithTeqfCalendar(weddingId);
    setSyncing(false);
    if (res.success) {
      toast.success(t.calendarSyncDone);
      setWedding(w => w ? { ...w, teqfCalendarEventId: res.calendarEventId! } : w);
    } else {
      toast.error(res.error ?? 'Sync failed.');
    }
  }

  async function handleCalendarUnlink() {
    const res = await unlinkFromCalendar(weddingId);
    if (res.success) {
      toast.success(t.unlinkDone);
      setWedding(w => w ? { ...w, teqfCalendarEventId: null } : w);
    } else {
      toast.error(res.error ?? 'Unlink failed.');
    }
  }

  async function handleDeleteFunction(fn: WeddingFunction) {
    if (!confirm(t.fnDeleteConfirm(fn.functionName || fn.functionType))) return;
    const res = await deleteFunction(weddingId, fn.id);
    if (res.success) {
      toast.success(t.fnDeleted);
      setFunctions(prev => prev.filter(f => f.id !== fn.id));
    } else {
      toast.error(res.error ?? 'Failed to delete function.');
    }
  }

  async function handleRestoreVersion(v: WeddingVersion) {
    if (!confirm(t.restoreConfirm(v.versionNumber))) return;
    const res = await restoreVersion(weddingId, v.id, { restoredBy: userId, restoredByName: userName });
    if (res.success) {
      toast.success(t.restored);
      // Reload wedding + functions
      const [wRes, fRes] = await Promise.all([getWedding(weddingId), getFunctions(weddingId)]);
      if (wRes.success) setWedding(wRes.data!);
      if (fRes.success) setFunctions(fRes.data!);
      setVersions([]);
    } else {
      toast.error(res.error ?? 'Restore failed.');
    }
  }

  async function handleRemoveQuoteFile(file: QuoteFile) {
    const res = await removeQuoteFile(weddingId, file.id);
    if (res.success) {
      if (res.storagePath) await deleteFromStorage(res.storagePath);
      setWedding(w => w ? { ...w, quoteFiles: w.quoteFiles.filter(f => f.id !== file.id) } : w);
      toast.success(lang === 'es' ? 'Archivo eliminado.' : 'File removed.');
    } else {
      toast.error(res.error ?? 'Failed to remove file.');
    }
  }

  // ── Tab content ─────────────────────────────────────────────────────────────

  function InfoTab() {
    const multi = wedding!.startDate && wedding!.endDate && wedding!.startDate !== wedding!.endDate;
    const days = multi ? dayCount(wedding!.startDate!, wedding!.endDate!) : 1;

    return (
      <div className="space-y-4">
        {/* Wedding info card */}
        <div className="rounded-2xl p-5" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
          <div className="space-y-3">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t.status}</span>
              <div className="relative">
                <button onClick={() => setShowStatusMenu(s => !s)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-opacity hover:opacity-80"
                  style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                  <StatusBadge status={wedding!.status} t={t} />
                  <ChevronDown className="size-3" />
                </button>
                {showStatusMenu && (
                  <div className="absolute right-0 top-full mt-1 z-20 rounded-xl py-1 min-w-[140px]"
                    style={{ background: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: '1px solid var(--tqf-beige-border)' }}>
                    {STATUSES.map(s => (
                      <button key={s} onClick={() => handleStatusChange(s)}
                        className="w-full text-left px-3 py-2 text-xs transition-colors hover:opacity-80"
                        style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)', background: s === wedding!.status ? 'var(--tqf-cipria-light)' : 'transparent' }}>
                        {t[`status_${s}` as keyof Tr] as string}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2">
              <MapPin className="size-4 flex-shrink-0" style={{ color: 'var(--tqf-bordeaux)' }} />
              <span className="text-sm" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                {wedding!.primaryLocation || <span style={{ opacity: 0.4 }}>—</span>}
              </span>
            </div>

            {/* Date range */}
            <div className="flex items-start gap-2">
              <CalendarDays className="size-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--tqf-bordeaux)' }} />
              <div>
                <span className="text-sm capitalize" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                  {wedding!.startDate ? formatDateRange(wedding!.startDate, wedding!.endDate, lang as LangKey) : t.noDate}
                </span>
                {multi && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                    {t.duration(days)}
                  </span>
                )}
              </div>
            </div>

            {/* TeQF planner */}
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', minWidth: '80px' }}>{t.assignedTeqf}</span>
              <span className="text-sm" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                {wedding!.assignedTeqfUserName || t.noTeqf}
              </span>
            </div>

            {/* Created by */}
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', minWidth: '80px' }}>{t.createdBy}</span>
              <span className="text-sm" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                {wedding!.createdByName}
              </span>
            </div>
          </div>
        </div>

        {/* TeQF Calendar sync */}
        {(canEdit || isSuperAdmin) && (
          <div className="rounded-2xl p-4"
            style={wedding!.teqfCalendarEventId
              ? { background: '#f0fdf4', border: '1px solid #86efac' }
              : { background: '#fafafa', border: '1px solid var(--tqf-beige-border)' }}>
            {wedding!.teqfCalendarEventId ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="size-4" style={{ color: '#16a34a' }} />
                  <span className="text-sm font-medium" style={{ color: '#15803d', fontFamily: 'var(--font-body)' }}>
                    {t.calendarSynced}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Link href="/planner/calendar"
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                    style={{ background: '#16a34a', color: 'white', fontFamily: 'var(--font-body)', textDecoration: 'none' }}>
                    <ExternalLink className="size-3" />{t.viewInCalendar}
                  </Link>
                  <button onClick={handleCalendarSync} disabled={syncing}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                    style={{ background: 'white', color: '#15803d', border: '1px solid #86efac', fontFamily: 'var(--font-body)' }}>
                    {syncing ? <Loader2 className="size-3 animate-spin" /> : null}
                    {t.calendarSync}
                  </button>
                  <button onClick={handleCalendarUnlink}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
                    style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', background: 'white', fontFamily: 'var(--font-body)' }}>
                    <Link2Off className="size-3" />{t.calendarUnlink}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Link2Off className="size-4" style={{ color: 'var(--tqf-muted)' }} />
                  <span className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                    {lang === 'es' ? 'No sincronizado con el Calendario TeQF' : 'Not synced with TeQF Calendar'}
                  </span>
                </div>
                <button onClick={handleCalendarSync} disabled={syncing}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                  style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
                  {syncing ? <Loader2 className="size-3 animate-spin" /> : <Link2 className="size-3" />}
                  {t.calendarSync}
                </button>
              </>
            )}
          </div>
        )}

        {/* Quote files */}
        <div className="rounded-2xl p-5" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              {t.quoteFiles}
            </h3>
            {canTeqf && (
              <label className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-opacity hover:opacity-80"
                style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
                <Plus className="size-3" />{t.uploadQuote}
                <input type="file" accept="application/pdf" className="hidden"
                  onChange={e => handleQuoteUpload(e.target.files?.[0])} />
              </label>
            )}
          </div>
          {wedding!.quoteFiles.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t.noQuoteFiles}</p>
          ) : (
            <div className="space-y-2">
              {wedding!.quoteFiles.map(f => (
                <div key={f.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: '#fafafa', border: '1px solid var(--tqf-beige-border)' }}>
                  <FileText className="size-4 flex-shrink-0" style={{ color: 'var(--tqf-bordeaux)' }} />
                  <div className="flex-1 min-w-0">
                    <a href={f.url} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-medium truncate block hover:underline"
                      style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', textDecoration: 'none' }}>
                      {f.fileName}
                    </a>
                    <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                      {t.version}{f.version} · {t.uploadedBy} {f.uploadedByName}
                    </p>
                  </div>
                  {canTeqf && (
                    <button onClick={() => handleRemoveQuoteFile(f)}
                      className="text-xs px-2 py-1 rounded-lg transition-opacity hover:opacity-80"
                      style={{ color: '#991b1b', background: '#fef2f2', fontFamily: 'var(--font-body)' }}>
                      {t.deleteFile}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Danger zone */}
        {isSuperAdmin && (
          <div className="rounded-2xl p-4" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            <button onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ color: '#991b1b', background: '#fee2e2', fontFamily: 'var(--font-body)' }}>
              <Trash2 className="size-4" />{t.deleteWedding}
            </button>
          </div>
        )}
      </div>
    );
  }

  async function handleQuoteUpload(file?: File) {
    if (!file) return;
    if (!file.type.includes('pdf')) { toast.error('Only PDF files allowed.'); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error('File too large (max 20 MB).'); return; }
    try {
      const { uploadToStorage } = await import('@/lib/storage-upload');
      const { addQuoteFile } = await import('@/actions/weddings/weddings');
      const { v4: uuidv4 } = await import('uuid');
      const result = await uploadToStorage(file, `weddings/${weddingId}/quotes`, { maxSizeBytes: 20 * 1024 * 1024, allowedMimeTypes: ['application/pdf'] });
      const id = uuidv4();
      const res = await addQuoteFile(weddingId, {
        id, ...result,
        version: (wedding!.currentVersionNumber ?? 0) + 1,
        uploadedBy: userId, uploadedByName: userName,
      });
      if (res.success) {
        const updated = await getWedding(weddingId);
        if (updated.success) setWedding(updated.data!);
        toast.success(lang === 'es' ? 'Archivo subido.' : 'File uploaded.');
      } else {
        toast.error(res.error ?? 'Upload failed.');
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Upload failed.');
    }
  }

  function FunctionsTab() {
    const sorted = [...functions].sort((a, b) => {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      return a.order - b.order;
    });

    return (
      <div className="space-y-2">
        {canEdit && (
          <Link href={`/planner/weddings/${weddingId}/functions/new`}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl transition-opacity hover:opacity-80 w-full justify-center mb-3"
            style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)', textDecoration: 'none' }}>
            <Plus className="size-4" />{t.addFunction}
          </Link>
        )}
        {sorted.length === 0 ? (
          <div className="rounded-2xl py-14 px-8 text-center" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t.noFunctions}</p>
          </div>
        ) : (
          sorted.map(fn => {
            const fnDate = fn.date ? new Date(fn.date + 'T00:00:00').toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—';
            const fnTypeName = t.functionTypes[fn.functionType] ?? fn.functionType;
            return (
              <div key={fn.id} className="rounded-2xl p-4" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                        {fnTypeName}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                        #{fn.order}
                      </span>
                    </div>
                    <h3 className="text-base" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
                      {fn.functionName || fnTypeName}
                    </h3>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                      {fn.date && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                          <CalendarDays className="size-3" />{fnDate}
                        </span>
                      )}
                      {fn.eventStartTime && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                          <Clock className="size-3" />{fn.eventStartTime}{fn.eventEndTime ? ` – ${fn.eventEndTime}` : ''}
                        </span>
                      )}
                      {fn.venue && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                          <MapPin className="size-3" />{fn.venue}
                        </span>
                      )}
                    </div>
                    {fn.colorPalette.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {fn.colorPalette.map((c, i) => (
                          <div key={i} className="size-5 rounded-full border border-white"
                            style={{ background: c, boxShadow: '0 0 0 1px rgba(0,0,0,0.1)' }} title={c} />
                        ))}
                      </div>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Link href={`/planner/weddings/${weddingId}/functions/${fn.id}/edit`}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                        style={{ color: 'var(--tqf-bordeaux)', border: '1px solid var(--tqf-cipria)', background: 'var(--tqf-cipria-light)', fontFamily: 'var(--font-body)', textDecoration: 'none' }}>
                        <Edit2 className="size-3" />{t.editWedding}
                      </Link>
                      <button onClick={() => handleDeleteFunction(fn)}
                        className="size-7 flex items-center justify-center rounded-lg transition-opacity hover:opacity-80"
                        style={{ color: '#991b1b', border: '1px solid #fecaca', background: '#fef2f2' }}>
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  function VersionsTab() {
    const [loadingVersions, setLoadingVersions] = useState(false);
    useEffect(() => {
      if (versions.length === 0) {
        setLoadingVersions(true);
        getVersions(weddingId).then(res => {
          if (res.success) setVersions(res.data!);
        }).finally(() => setLoadingVersions(false));
      }
    }, []);

    if (loadingVersions) return <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} /></div>;
    if (versions.length === 0) return (
      <div className="rounded-2xl py-12 px-8 text-center" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
        <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t.noVersions}</p>
      </div>
    );
    return (
      <div className="space-y-2">
        {versions.map(v => (
          <div key={v.id} className="rounded-2xl p-4" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-medium" style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                    {t.version}{v.versionNumber}
                  </span>
                  {v.versionLabel && (
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                      {v.versionLabel}
                    </span>
                  )}
                  {v.isRestore && (
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: '#fef3c7', color: '#92400e', fontFamily: 'var(--font-body)' }}>
                      {t.versionRestored}
                    </span>
                  )}
                </div>
                <p className="text-sm" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                  {v.changeDescription}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  {v.savedByName} · {v.savedAt ? new Date(v.savedAt).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                </p>
              </div>
              {canEdit && (
                <div className="flex gap-2 flex-shrink-0">
                  <Link href={`/planner/weddings/${weddingId}/versions/${v.id}`}
                    className="text-xs px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                    style={{ color: 'var(--tqf-bordeaux)', border: '1px solid var(--tqf-cipria)', background: 'var(--tqf-cipria-light)', fontFamily: 'var(--font-body)', textDecoration: 'none' }}>
                    {t.viewVersion}
                  </Link>
                  <button onClick={() => handleRestoreVersion(v)}
                    className="text-xs px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                    style={{ color: '#1e40af', border: '1px solid #bfdbfe', background: '#dbeafe', fontFamily: 'var(--font-body)' }}>
                    {t.restore}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      {/* Header */}
      <header className="border-b px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}>
        <Link href="/planner/weddings" className="flex items-center gap-2 transition-opacity hover:opacity-75 flex-shrink-0">
          <Image src="/logo.png" alt="" width={28} height={28} className="object-contain"
            style={{ filter: 'invert(9%) sepia(80%) saturate(900%) hue-rotate(308deg) brightness(145%)' }} />
          <span className="hidden sm:block" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontSize: '0.9rem', fontWeight: 300 }}>Weddings</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSelector />
          {canEdit && (
            <>
              <button onClick={() => setShowVersionModal(true)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg transition-opacity hover:opacity-80"
                style={{ color: 'var(--tqf-bordeaux)', border: '1px solid var(--tqf-cipria)', background: 'var(--tqf-cipria-light)', fontFamily: 'var(--font-body)' }}>
                <History className="size-3.5" />
                <span className="hidden sm:inline">{t.saveVersion}</span>
              </button>
              <Link href={`/planner/weddings/${weddingId}/edit`}
                className="flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg transition-opacity hover:opacity-80"
                style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)', textDecoration: 'none' }}>
                <Edit2 className="size-3.5" />
                <span className="hidden sm:inline">{t.editWedding}</span>
              </Link>
            </>
          )}
          <button onClick={logout}
            className="flex items-center gap-1.5 text-sm px-2.5 py-2 rounded-lg hover:opacity-80"
            style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)' }}>
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <Link href="/planner/weddings" className="flex items-center gap-1.5 text-sm mb-4 transition-opacity hover:opacity-70"
          style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', textDecoration: 'none' }}>
          <ArrowLeft className="size-4" />{t.backToList}
        </Link>

        {/* Title */}
        <div className="flex items-start gap-3 mb-5">
          <div className="size-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
            <Heart className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 300 }}>
              {wedding.weddingName}
            </h1>
            <div className="mt-1">
              <StatusBadge status={wedding.status} t={t} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 mb-5 p-1 rounded-xl" style={{ background: 'var(--tqf-beige-border)' }}>
          {(['info', 'functions', 'versions'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="flex-1 text-sm py-2 rounded-lg transition-all"
              style={activeTab === tab
                ? { background: 'white', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', fontWeight: 500 }
                : { background: 'transparent', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {t[`tab_${tab}` as keyof Tr] as string}
            </button>
          ))}
        </div>

        {activeTab === 'info'      && <InfoTab />}
        {activeTab === 'functions' && <FunctionsTab />}
        {activeTab === 'versions'  && <VersionsTab />}
      </main>

      {/* Save Version Modal */}
      {showVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setShowVersionModal(false)}>
          <div className="rounded-2xl p-6 w-full max-w-sm"
            style={{ background: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
                {t.saveVersion}
              </h3>
              <button onClick={() => setShowVersionModal(false)}>
                <X className="size-4" style={{ color: 'var(--tqf-muted)' }} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t.versionLabel}</label>
                <input type="text" value={versionLabel} onChange={e => setVersionLabel(e.target.value)}
                  placeholder={`v${(wedding.currentVersionNumber ?? 0) + 1}`}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--tqf-beige-border)', borderRadius: '0.5rem', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--tqf-dark)', background: 'white', outline: 'none' }} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t.versionDesc}</label>
                <textarea value={versionDesc} onChange={e => setVersionDesc(e.target.value)} rows={3}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--tqf-beige-border)', borderRadius: '0.5rem', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--tqf-dark)', background: 'white', outline: 'none', resize: 'vertical' }} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSaveVersion} disabled={versionSaving}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
                {versionSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {versionSaving ? t.versionSaving : t.versionSave}
              </button>
              <button onClick={() => setShowVersionModal(false)}
                className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
                style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setShowDeleteModal(false)}>
          <div className="rounded-2xl p-6 w-full max-w-sm"
            style={{ background: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div className="size-12 rounded-xl flex items-center justify-center mb-4"
              style={{ background: '#fef2f2', color: '#991b1b' }}>
              <Trash2 className="size-5" />
            </div>
            <h3 className="text-lg mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              {t.deleteWedding}
            </h3>
            <p className="text-sm mb-5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {t.deleteConfirm(wedding.weddingName)}
            </p>
            <div className="flex gap-2">
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: '#991b1b', color: 'white', fontFamily: 'var(--font-body)' }}>
                {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                {lang === 'es' ? 'Sí, eliminar' : 'Yes, delete'}
              </button>
              <button onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
                style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
