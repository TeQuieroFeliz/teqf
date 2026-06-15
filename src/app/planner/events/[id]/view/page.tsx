'use client';

import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { db } from '@/firebase/client';
import { CITIES, PlannerEvent } from '@/lib/planner-types';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Flower2,
  Loader2,
  MapPin,
  Sofa,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { LanguageSelector } from '@/components/LanguageSelector';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string, locale: string): string {
  if (!d) return '—';
  return new Date(d + 'T12:00').toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function cityLabel(val: string): string {
  return CITIES.find(c => c.value === val)?.label ?? val;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const sectionLbl = {
  fontSize: '0.6rem', textTransform: 'uppercase' as const, letterSpacing: '0.1em',
  color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', fontWeight: 600 as const,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventViewPage() {
  const params  = useParams();
  const eventId = params?.id as string;

  const { isSuperAdmin, canManageCashControl, isLoading: authLoading } = usePlannerAuth();
  const { t, lang } = useI18n();
  const [event,   setEvent]   = useState<PlannerEvent | null>(null);
  const [loading, setLoading] = useState(true);

  const locale = lang === 'es' ? 'es-MX' : 'en-US';
  const canView = isSuperAdmin || canManageCashControl;

  useEffect(() => {
    if (!eventId) return;
    const unsub = onSnapshot(doc(db, 'plannerEvents', eventId), snap => {
      setEvent(snap.exists() ? ({ id: snap.id, ...snap.data() } as PlannerEvent) : null);
      setLoading(false);
    });
    return () => unsub();
  }, [eventId]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  if (!canView || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <div className="text-center">
          <p className="text-base mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)' }}>
            {!canView ? t('event_unauthorized') : t('event_notFound')}
          </p>
          <Link href="/planner/events" className="text-sm"
            style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
            {t('event_backToEvents')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10" style={{ background: 'var(--tqf-beige)' }}>

      {/* Sticky header */}
      <header className="sticky top-0 z-10 px-4 pt-3 pb-3"
        style={{ background: 'white', borderBottom: '1px solid var(--tqf-beige-border)' }}>
        <div className="flex items-center gap-3">
          <Link href="/planner/events" className="flex-shrink-0" style={{ color: 'var(--tqf-muted)' }}>
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontWeight: 400 }}>
              {event.eventCode || event.eventName || 'Evento'}
            </p>
            {event.clientName && (
              <p className="text-xs truncate" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {event.clientName}
              </p>
            )}
          </div>
          <LanguageSelector />
          <span className="text-xs px-2.5 py-1 rounded-full flex-shrink-0"
            style={event.status === 'submitted'
              ? { background: '#fef9ee', color: '#b45309', fontFamily: 'var(--font-body)' }
              : { background: '#f3f4f6', color: '#6b7280', fontFamily: 'var(--font-body)' }}>
            {event.status === 'submitted' ? t('submitted') : t('draft')}
          </span>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">

        {/* ── Event info ── */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--tqf-beige-border)' }}>
            <p style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400, fontSize: '0.95rem' }}>
              {t('event_information')}
            </p>
          </div>
          <div className="px-4 py-3 space-y-2.5">
            {event.city && (
              <div className="flex items-center gap-2.5">
                <MapPin className="size-4 flex-shrink-0" style={{ color: 'var(--tqf-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                  {cityLabel(event.city)}
                </span>
              </div>
            )}
            {event.plannerName && (
              <div className="flex items-center gap-2.5">
                <Users className="size-4 flex-shrink-0" style={{ color: 'var(--tqf-muted)' }} />
                <div className="min-w-0">
                  <span className="text-sm" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                    {event.plannerName}
                  </span>
                  {event.plannerEmail && (
                    <span className="text-xs ml-1.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                      {event.plannerEmail}
                    </span>
                  )}
                </div>
              </div>
            )}
            {event.days && event.days.length > 0 && (
              <div className="flex items-center gap-2.5">
                <Calendar className="size-4 flex-shrink-0" style={{ color: 'var(--tqf-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                  {event.days.length} {event.days.length === 1 ? t('event_day') : t('event_days')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Days ── */}
        {event.days && event.days.length > 0 && event.days.map((day, i) => {
          const furniture = day.selectedFurniture ?? [];
          const flowers   = day.selectedFlowers   ?? [];
          const hasItems  = furniture.length > 0 || flowers.length > 0;

          return (
            <div key={day.id || i} className="rounded-2xl overflow-hidden"
              style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>

              {/* Day header */}
              <div className="px-4 py-3 border-b"
                style={{ borderColor: 'var(--tqf-beige-border)', background: 'var(--tqf-beige)' }}>
                <div className="flex items-center gap-2">
                  <Calendar className="size-4" style={{ color: 'var(--tqf-bordeaux)' }} />
                  <p className="text-sm font-medium"
                    style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)' }}>
                    {day.eventName || t('event_dayLabel').replace('{n}', String(i + 1))}
                  </p>
                </div>
                {day.date && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                    {fmtDate(day.date, locale)}
                  </p>
                )}
              </div>

              <div className="px-4 py-3 space-y-3">
                {/* Venue */}
                {day.venue && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="size-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--tqf-muted)' }} />
                    <div>
                      <p className="text-sm" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                        {day.venue}
                      </p>
                      {day.venueAddress && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                          {day.venueAddress}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Times */}
                {(day.setupTime || day.eventStartTime || day.supplierAccessTime) && (
                  <div className="flex items-start gap-2.5">
                    <Clock className="size-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--tqf-muted)' }} />
                    <div className="text-sm space-y-0.5" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                      {day.setupTime && <p>Setup: {day.setupTime}</p>}
                      {day.supplierAccessTime && <p>{t('event_supplierAccess')} {day.supplierAccessTime}</p>}
                      {day.eventStartTime && <p>{t('event_eventStart')} {day.eventStartTime}</p>}
                      {day.breakdownTime && <p>Breakdown: {day.breakdownTime}</p>}
                    </div>
                  </div>
                )}

                {/* Furniture */}
                {furniture.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sofa className="size-3.5" style={{ color: 'var(--tqf-muted)' }} />
                      <p style={sectionLbl}>{t('event_furniture')}</p>
                    </div>
                    <div className="space-y-1.5">
                      {furniture.map((item, j) => (
                        <div key={j} className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                            {item.itemName}
                          </span>
                          <span className="text-sm font-semibold px-2 py-0.5 rounded-lg"
                            style={{ background: '#f3f4f6', color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                            ×{item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Flowers */}
                {flowers.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Flower2 className="size-3.5" style={{ color: 'var(--tqf-muted)' }} />
                      <p style={sectionLbl}>{t('event_flowers')}</p>
                    </div>
                    <div className="space-y-1.5">
                      {flowers.map((item, j) => (
                        <div key={j} className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                            {item.itemName}
                          </span>
                          <span className="text-sm font-semibold px-2 py-0.5 rounded-lg"
                            style={{ background: '#f3f4f6', color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                            ×{item.quantity} {item.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!hasItems && (
                  <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                    {t('event_noItems')}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Notes (legacy single-day) */}
        {(event as any).notes && (
          <div className="rounded-2xl px-4 py-3"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <p style={{ ...sectionLbl, marginBottom: '0.4rem' }}>{t('event_notes')}</p>
            <p className="text-sm" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
              {(event as any).notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
