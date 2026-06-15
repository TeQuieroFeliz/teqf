'use client';

import { getPlannerEvent, savePlannerEvent, updatePlannerEventStatus, deletePlannerEvent } from '@/actions/planner/planner-event-crud';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { CITIES, EventDay, PlannerEvent } from '@/lib/planner-types';
import {
  ArrowLeft,
  Calendar,
  Check,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  MapPin,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useI18n } from '@/hooks/useI18n';
import { LanguageSelector } from '@/components/LanguageSelector';

function getStatusConfig(t: (k: string) => string) {
  return {
    draft:     { label: t('draft'),      bg: '#f3f4f6', text: '#6b7280' },
    active:    { label: t('adminEvent_statusActive'),    bg: '#f0fdf4', text: '#166534' },
    submitted: { label: t('submitted'),  bg: '#fef9ee', text: '#b45309' },
  } as Record<string, { label: string; bg: string; text: string }>;
}

async function downloadPdf(event: PlannerEvent, errMsg: string) {
  const res = await fetch('/api/planner-event-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event }),
  });
  if (!res.ok) { toast.error(errMsg); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TQF_${(event.eventCode || event.eventName || 'event').replace(/\s+/g, '_')}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDate(iso: string, locale: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(locale, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function AdminEventDetailPage() {
  const { adminUser } = usePlannerAuth();
  const { t, lang } = useI18n();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [event, setEvent] = useState<PlannerEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Edit metadata
  const [editMode, setEditMode] = useState(false);
  const [editCode, setEditCode] = useState('');
  const [editClient, setEditClient] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isSuperAdmin = adminUser?.role === 'superadmin';
  const locale = lang === 'es' ? 'es-MX' : 'en-US';

  useEffect(() => {
    getPlannerEvent(id).then(e => {
      if (!e) { router.replace('/planner/admin-events'); return; }
      setEvent(e);
      setLoading(false);
    });
  }, [id, router]);

  function openEdit() {
    if (!event) return;
    setEditCode(event.eventCode ?? '');
    setEditClient(event.clientName ?? '');
    setEditCity(event.city ?? '');
    setEditMode(true);
  }

  async function saveEdit() {
    if (!event) return;
    setEditSaving(true);
    const res = await savePlannerEvent({
      ...event,
      eventCode: editCode.trim().toUpperCase(),
      clientName: editClient.trim(),
      city: editCity,
    });
    setEditSaving(false);
    if (res.success) {
      setEvent(prev => prev ? { ...prev, eventCode: editCode.trim().toUpperCase(), clientName: editClient.trim(), city: editCity } : prev);
      setEditMode(false);
      toast.success(t('adminEvent_updated'));
    } else {
      toast.error(t('adminEvent_saveError'));
    }
  }

  async function handleDelete() {
    if (!event) return;
    if (!confirm(t('adminEvent_deleteConfirm').replace('{name}', event.eventCode || event.eventName || ''))) return;
    setIsDeleting(true);
    const res = await deletePlannerEvent(event.id);
    setIsDeleting(false);
    if (res.success) {
      toast.success(t('adminEvent_deleted'));
      router.replace('/planner/admin-events');
    } else {
      toast.error(t('adminEvent_deleteError'));
    }
  }

  async function handleStatusChange(status: 'draft' | 'active' | 'submitted') {
    if (!event) return;
    const res = await updatePlannerEventStatus(event.id, status);
    if (res.success) {
      setEvent(prev => prev ? { ...prev, status } : prev);
      toast.success(t('adminEvent_statusUpdated'));
    } else {
      toast.error(t('adminEvent_statusError'));
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.4rem 0.75rem', borderRadius: '0.5rem',
    border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)',
    fontSize: '0.875rem', color: 'var(--tqf-dark)', background: 'var(--tqf-beige)', outline: 'none',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  if (!event) return null;

  const STATUS_CONFIG = getStatusConfig(t as unknown as (k: string) => string);
  const cfg = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.draft;
  const cityLabel = (val: string) => CITIES.find(c => c.value === val)?.label ?? val;

  const field = (label: string, value: string | undefined) =>
    value ? (
      <div>
        <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{label}</p>
        <p className="text-sm" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>{value}</p>
      </div>
    ) : null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      {/* Header */}
      <header
        className="border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/planner/admin-events"
            className="flex items-center justify-center size-9 rounded-lg flex-shrink-0"
            style={{ border: '1px solid var(--tqf-beige-border)' }}
          >
            <ArrowLeft className="size-4" style={{ color: 'var(--tqf-muted)' }} />
          </Link>
          <div className="min-w-0">
            <p className="text-xs truncate" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {event.plannerName ?? event.plannerEmail}
            </p>
            <h1 className="text-lg truncate" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              {event.eventCode || event.eventName || t('adminEvent_unnamed')}
            </h1>
          </div>
          <span
            className="text-xs px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ background: cfg.bg, color: cfg.text, fontFamily: 'var(--font-body)' }}
          >
            {cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <LanguageSelector />
          <button
            onClick={async () => { setPdfLoading(true); await downloadPdf(event, t('adminEvent_pdfError')); setPdfLoading(false); }}
            disabled={pdfLoading}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
          >
            {pdfLoading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            <span className="hidden sm:inline">{t('adminEvent_downloadPdf')}</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-5">

        {/* Superadmin controls */}
        {isSuperAdmin && (
          <div
            className="rounded-2xl p-5"
            style={{ background: 'white', border: '2px solid var(--tqf-cipria)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                {t('adminEvent_adminSection')}
              </p>
              {!editMode && (
                <button
                  onClick={openEdit}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                  style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
                >
                  <Pencil className="size-3.5" />
                  {t('edit')}
                </button>
              )}
            </div>

            {/* Status buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              {(['draft', 'active', 'submitted'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={event.status === s}
                  className="px-3 py-1.5 rounded-xl text-xs transition-all disabled:cursor-default"
                  style={{
                    fontFamily: 'var(--font-body)',
                    background: event.status === s ? STATUS_CONFIG[s].bg : '#f9fafb',
                    color: event.status === s ? STATUS_CONFIG[s].text : '#9ca3af',
                    border: `1px solid ${event.status === s ? STATUS_CONFIG[s].text + '40' : '#e5e7eb'}`,
                    fontWeight: event.status === s ? 600 : 400,
                  }}
                >
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t" style={{ borderColor: 'var(--tqf-beige-border)' }}>
              <button
                onClick={() => handleStatusChange('submitted')}
                disabled={event.status === 'submitted'}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontFamily: 'var(--font-body)' }}
              >
                <Lock className="size-3.5" />
                {t('adminEvent_close')}
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5', fontFamily: 'var(--font-body)' }}
              >
                {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                {t('adminEvent_delete')}
              </button>
            </div>

            {/* Inline edit form */}
            {editMode && (
              <div className="space-y-3 pt-3 border-t" style={{ borderColor: 'var(--tqf-beige-border)' }}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t('adminEvent_fieldCode')}</label>
                    <input
                      type="text"
                      value={editCode}
                      onChange={e => setEditCode(e.target.value.toUpperCase())}
                      style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '0.04em' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t('adminEvent_fieldClient')}</label>
                    <input
                      type="text"
                      value={editClient}
                      onChange={e => setEditClient(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t('adminEvent_fieldCity')}</label>
                    <input
                      type="text"
                      value={editCity}
                      onChange={e => setEditCity(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    disabled={editSaving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm"
                    style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
                  >
                    {editSaving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    {t('save')}
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm"
                    style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
                  >
                    <X className="size-4" />
                    {t('cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Event details */}
        <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg" style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
              <Calendar className="size-4" />
            </div>
            <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              {t('adminEvent_detailsTitle')}
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {field(t('adminEvent_fieldCode'), event.eventCode)}
            {field(t('adminEvent_fieldClient'), event.clientName)}
            {field(t('adminEvent_fieldCity'), event.city ? cityLabel(event.city) : undefined)}
            {field(t('adminEvent_fieldDays'), event.days?.length ? `${event.days.length}` : undefined)}
            {field(t('adminEvent_fieldPlanner'), event.plannerName)}
            {field(t('adminEvent_fieldEmail'), event.plannerEmail)}
          </div>
        </div>

        {/* Days */}
        {event.days && event.days.length > 0 && (
          <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg" style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
                <MapPin className="size-4" />
              </div>
              <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
                {t('adminEvent_daysTitle')} ({event.days.length})
              </h2>
            </div>
            <div className="space-y-5">
              {event.days.map((day: EventDay, idx: number) => (
                <div key={day.id} className="rounded-xl p-4 space-y-3" style={{ border: '1px solid var(--tqf-beige-border)' }}>
                  <div className="flex items-center gap-2">
                    <span
                      className="size-6 flex items-center justify-center rounded-full text-xs font-semibold flex-shrink-0"
                      style={{ background: 'var(--tqf-bordeaux)', color: 'white' }}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                      {formatDate(day.date, locale)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {field(t('adminEvent_dayDesc'), day.eventName)}
                    {field(t('adminEvent_dayVenue'), day.venue)}
                    {day.venueAddress && (
                      <div>
                        <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t('adminEvent_dayAddress')}</p>
                        <div className="flex items-start gap-1">
                          <p className="text-sm flex-1" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>{day.venueAddress}</p>
                          {day.venueMapUrl && (
                            <a href={day.venueMapUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--tqf-bordeaux)' }}>
                              <ExternalLink className="size-3.5 mt-0.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                    {field(t('adminEvent_dayNotes'), day.notes)}
                  </div>
                  {(day.setupTime || (day as any).eventStartTime || day.breakdownTime || day.supplierAccessTime) && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t" style={{ borderColor: 'var(--tqf-beige-border)' }}>
                      {field(t('adminEvent_setup'), day.setupTime)}
                      {field(t('adminEvent_eventStart'), (day as any).eventStartTime)}
                      {field(t('adminEvent_breakdown'), day.breakdownTime)}
                      {field(t('adminEvent_supplierAccess'), day.supplierAccessTime)}
                    </div>
                  )}
                  {(day.supplierRegulationUrl || day.layoutUrls?.length > 0) && (
                    <div className="pt-3 border-t space-y-1.5" style={{ borderColor: 'var(--tqf-beige-border)' }}>
                      <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t('adminEvent_documents')}</p>
                      {day.supplierRegulationUrl && (
                        <a href={day.supplierRegulationUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm" style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                          <FileText className="size-3.5" />
                          {t('adminEvent_supplierReg')}
                        </a>
                      )}
                      {day.layoutUrls?.map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm" style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                          <FileText className="size-3.5" />
                          Layout {i + 1}
                        </a>
                      ))}
                    </div>
                  )}
                  {(day.selectedFurniture?.length > 0 || day.selectedFlowers?.length > 0) && (
                    <div className="pt-3 border-t grid grid-cols-2 gap-4" style={{ borderColor: 'var(--tqf-beige-border)' }}>
                      {day.selectedFurniture?.length > 0 && (
                        <div>
                          <p className="text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            {t('adminEvent_furniture')} ({day.selectedFurniture.reduce((s, i) => s + i.quantity, 0)} {t('adminEvent_pieces')})
                          </p>
                          <div className="space-y-1">
                            {day.selectedFurniture.map(item => (
                              <div key={item.itemId} className="flex justify-between text-xs" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                                <span>{item.itemName}</span>
                                <span style={{ color: 'var(--tqf-muted)' }}>×{item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {day.selectedFlowers?.length > 0 && (
                        <div>
                          <p className="text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            {t('adminEvent_flowers')}
                          </p>
                          <div className="space-y-1">
                            {day.selectedFlowers.map(item => (
                              <div key={item.itemId} className="flex justify-between text-xs" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                                <span>{item.itemName}</span>
                                <span style={{ color: 'var(--tqf-muted)' }}>×{item.quantity} {item.unit}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
