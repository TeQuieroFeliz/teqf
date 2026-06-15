'use client';

import { savePlannerEvent } from '@/actions/planner/planner-event-crud';
import { db } from '@/firebase/client';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { PlannerEvent } from '@/lib/planner-types';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  Loader2,
  MapPin,
  Plus,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useI18n } from '@/hooks/useI18n';
import { LanguageSelector } from '@/components/LanguageSelector';

// ── Create event modal ────────────────────────────────────────────────────────

function CreateEventModal({
  onClose,
  onCreated,
  creatorId,
  creatorName,
  creatorEmail,
}: {
  onClose: () => void;
  onCreated: () => void;
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
}) {
  const { t } = useI18n();
  const [nome, setNome]       = useState('');
  const [data, setData]       = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving]   = useState(false);

  const inputSt: React.CSSProperties = {
    width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.625rem',
    border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)',
    fontSize: '0.9rem', color: 'var(--tqf-dark)', background: 'white', outline: 'none',
  };
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '0.6rem', fontFamily: 'var(--font-body)',
    color: 'var(--tqf-muted)', textTransform: 'uppercase',
    letterSpacing: '0.1em', marginBottom: '0.3rem',
  };

  async function handleSave() {
    if (!nome.trim()) { toast.error(t('orarioEvt_nameRequired')); return; }
    setSaving(true);
    const result = await savePlannerEvent({
      plannerId:    creatorId,
      plannerName:  creatorName,
      plannerEmail: creatorEmail,
      eventCode:    nome.trim(),
      clientName:   '',
      city:         '',
      status:       'draft',
      days: data ? [{
        id:                   crypto.randomUUID(),
        date:                 data,
        eventName:            nome.trim(),
        venue:                location.trim(),
        venueAddress:         '',
        venuePlaceId:         '',
        venueMapUrl:          '',
        notes:                '',
        setupTime:            '',
        breakdownTime:        '',
        supplierAccessTime:   '',
        eventStartTime:       '',
        supplierRegulationUrl:'',
        layoutUrls:           [],
        selectedFurniture:    [],
        selectedFlowers:      [],
        customItems:          [],
      }] : [],
    });

    if (result.success) {
      toast.success(t('orarioEvt_created'));
      onCreated();
      onClose();
    } else {
      toast.error(result.error ?? t('orarioEvt_createError'));
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl"
        style={{ background: 'white' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--tqf-beige-border)' }} />
        </div>

        <div className="px-5 pb-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              {t('orarioEvt_createTitle')}
            </h2>
            <button onClick={onClose} style={{ color: 'var(--tqf-muted)' }}><X className="size-5" /></button>
          </div>

          <div>
            <label style={lbl}>{t('orarioEvt_nameLbl')}</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)}
              placeholder="es. Matrimonio García" autoFocus style={inputSt}
              onKeyDown={e => e.key === 'Enter' && handleSave()} />
          </div>

          <div>
            <label style={lbl}>{t('orarioEvt_dateLbl')}</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)} style={inputSt} />
          </div>

          <div>
            <label style={lbl}>{t('orarioEvt_locationLbl')}</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="es. Villa Taverna, CDMX" style={inputSt} />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {t('orarioEvt_createBtn')}
            </button>
            <button onClick={onClose}
              className="px-5 py-3.5 rounded-2xl text-sm"
              style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {t('cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OrarioListPage() {
  const {
    isSuperAdmin, canManageCashControl,
    plannerUser, adminUser,
    isLoading: authLoading,
  } = usePlannerAuth();
  const { t, lang } = useI18n();

  const [events,  setEvents]  = useState<PlannerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const locale = lang === 'es' ? 'es-MX' : 'en-US';
  const canAccess = isSuperAdmin || canManageCashControl;

  // Real-time list of all planner events
  useEffect(() => {
    if (!canAccess && !authLoading) { setLoading(false); return; }
    const unsub = onSnapshot(
      query(collection(db, 'plannerEvents'), orderBy('createdAt', 'desc')),
      snap => {
        setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as PlannerEvent)));
        setLoading(false);
      }
    );
    return () => unsub();
  }, [canAccess, authLoading]);

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
          <p className="text-base mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)' }}>{t('errorUnauthorized')}</p>
          <Link href="/planner" className="text-sm" style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
            <ArrowLeft className="size-4 inline mr-1" />{t('dashboard')}
          </Link>
        </div>
      </div>
    );
  }

  // Identity of the person creating the event
  const creatorId    = adminUser?.id    ?? plannerUser?.id    ?? '';
  const creatorName  = adminUser?.name  ?? plannerUser?.name  ?? 'Admin';
  const creatorEmail = adminUser?.email ?? plannerUser?.email ?? '';

  return (
    <div className="min-h-screen pb-8" style={{ background: 'var(--tqf-beige)' }}>

      {/* Header */}
      <header className="sticky top-0 z-10 px-4 sm:px-6 py-4 flex items-center justify-between"
        style={{ background: 'white', borderBottom: '1px solid var(--tqf-beige-border)' }}>
        <div className="flex items-center gap-4">
          <Link href="/planner"
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            <ArrowLeft className="size-4" /> {t('dashboard')}
          </Link>
          <div className="h-4 w-px" style={{ background: 'var(--tqf-beige-border)' }} />
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg" style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
              <Clock className="size-4" />
            </div>
            <h1 className="text-xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              {t('orarioEvt_title')}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSelector />
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">{t('orarioEvt_createBtn')}</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {events.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <div className="mx-auto mb-4 size-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
              <Users className="size-6" />
            </div>
            <p className="text-base mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              {t('orarioEvt_noEvents')}
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {t('orarioEvt_noEventsDesc')}
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-xl transition-opacity hover:opacity-80"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
            >
              <Plus className="size-4" /> {t('orarioEvt_createFirst')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm mb-4" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {events.length} {events.length === 1 ? t('orarioEvt_hint1') : t('orarioEvt_hintN')}
            </p>
            {events.map(evt => {
              const firstDay = evt.days?.[0];
              const dateLabel = firstDay
                ? new Date(firstDay.date + 'T12:00').toLocaleDateString(locale, {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })
                : null;

              return (
                <Link
                  key={evt.id}
                  href={`/planner/projects/${evt.id}`}
                  className="flex items-center justify-between rounded-2xl px-5 py-4 transition-all hover:shadow-md active:scale-[0.99]"
                  style={{ background: 'white', border: '1px solid var(--tqf-beige-border)', textDecoration: 'none' }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="p-2.5 rounded-xl flex-shrink-0"
                      style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
                      <Clock className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-medium truncate"
                        style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-display)', fontWeight: 400 }}>
                        {evt.eventCode || evt.clientName || t('orarioEvt_unnamed')}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {evt.clientName && evt.eventCode && (
                          <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            {evt.clientName}
                          </span>
                        )}
                        {evt.plannerName && (
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            <Users className="size-3" /> {evt.plannerName}
                          </span>
                        )}
                        {dateLabel && (
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            <Calendar className="size-3" /> {dateLabel}
                          </span>
                        )}
                        {firstDay?.venue && (
                          <span className="flex items-center gap-1 text-xs truncate max-w-[180px]"
                            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            <MapPin className="size-3 flex-shrink-0" /> {firstDay.venue}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span className="text-xs px-2.5 py-1 rounded-lg hidden sm:block"
                      style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                      {t('orarioEvt_schedule')}
                    </span>
                    <ArrowRight className="size-4 sm:hidden" style={{ color: 'var(--tqf-muted)' }} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateEventModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {}}
          creatorId={creatorId}
          creatorName={creatorName}
          creatorEmail={creatorEmail}
        />
      )}
    </div>
  );
}
