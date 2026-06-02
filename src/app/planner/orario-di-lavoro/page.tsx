'use client';

import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { db } from '@/firebase/client';
import { PlannerEvent } from '@/lib/planner-types';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  Loader2,
  MapPin,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function OrarioDiLavoroPage() {
  const { isSuperAdmin, canManageCashControl, isLoading: authLoading } = usePlannerAuth();
  const [events,  setEvents]  = useState<PlannerEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const canAccess = isSuperAdmin || canManageCashControl;

  useEffect(() => {
    if (authLoading) return;
    if (!canAccess) { setLoading(false); return; }
    const unsub = onSnapshot(
      query(collection(db, 'plannerEvents'), orderBy('createdAt', 'desc')),
      snap => {
        setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as PlannerEvent)));
        setLoading(false);
      },
      () => setLoading(false)
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
          <p className="text-base mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)' }}>
            Accesso non autorizzato
          </p>
          <Link href="/planner" className="text-sm" style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
            ← Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: 'var(--tqf-beige)' }}>

      {/* Header */}
      <header className="sticky top-0 z-10 px-4 sm:px-6 py-4 flex items-center gap-4"
        style={{ background: 'white', borderBottom: '1px solid var(--tqf-beige-border)' }}>
        <Link href="/planner"
          className="flex items-center gap-1.5 text-sm flex-shrink-0"
          style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
          <ArrowLeft className="size-4" /> Dashboard
        </Link>
        <div className="h-4 w-px flex-shrink-0" style={{ background: 'var(--tqf-beige-border)' }} />
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg flex-shrink-0"
            style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
            <Clock className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              Orario di Lavoro
            </h1>
            <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Registra ore lavorate dei dipendenti
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {events.length === 0 ? (
          <div className="rounded-2xl p-12 text-center"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <div className="mx-auto mb-4 size-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
              <Users className="size-6" />
            </div>
            <p className="text-base mb-1"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              Nessun evento ancora
            </p>
            <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Gli eventi appariranno qui quando saranno creati dal team XB.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm mb-2" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {events.length} {events.length === 1 ? 'evento' : 'eventi'} · seleziona per gestire l&apos;orario del team
            </p>
            {events.map(evt => {
              const firstDay  = evt.days?.[0];
              const dateLabel = firstDay
                ? new Date(firstDay.date + 'T12:00').toLocaleDateString('it-IT', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })
                : null;

              return (
                <Link
                  key={evt.id}
                  href={`/planner/projects/${evt.id}`}
                  className="flex items-center justify-between rounded-2xl px-5 py-4 transition-all hover:shadow-md active:scale-[0.99]"
                  style={{ background: 'white', border: '1px solid var(--tqf-beige-border)', textDecoration: 'none' }}>

                  <div className="flex items-center gap-4 min-w-0">
                    <div className="p-2.5 rounded-xl flex-shrink-0"
                      style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
                      <Clock className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-medium truncate"
                        style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-display)', fontWeight: 400 }}>
                        {evt.eventCode || evt.clientName || 'Evento senza nome'}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {evt.clientName && evt.eventCode && (
                          <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            {evt.clientName}
                          </span>
                        )}
                        {evt.plannerName && (
                          <span className="flex items-center gap-1 text-xs"
                            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            <Users className="size-3" /> {evt.plannerName}
                          </span>
                        )}
                        {dateLabel && (
                          <span className="flex items-center gap-1 text-xs"
                            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
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
                      Orario →
                    </span>
                    <ArrowRight className="size-4 sm:hidden" style={{ color: 'var(--tqf-muted)' }} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
