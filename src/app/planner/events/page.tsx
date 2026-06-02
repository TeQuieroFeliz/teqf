'use client';

import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { db } from '@/firebase/client';
import { CITIES, PlannerEvent } from '@/lib/planner-types';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Loader2,
  MapPin,
  Search,
  User,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string): string {
  if (!d) return '—';
  return new Date(d + 'T12:00').toLocaleDateString('it-IT', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function cityLabel(val: string): string {
  return CITIES.find(c => c.value === val)?.label ?? val;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventsListPage() {
  const { isSuperAdmin, canManageCashControl, isLoading: authLoading } = usePlannerAuth();
  const [events,  setEvents]  = useState<PlannerEvent[]>([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);

  const canView = isSuperAdmin || canManageCashControl;

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'plannerEvents'), orderBy('createdAt', 'desc')),
      snap => {
        setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as PlannerEvent)));
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  if (!canView) {
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

  const q = search.toLowerCase();
  const filtered = search
    ? events.filter(e =>
        e.eventCode?.toLowerCase().includes(q) ||
        e.clientName?.toLowerCase().includes(q) ||
        e.plannerName?.toLowerCase().includes(q) ||
        e.days?.[0]?.venue?.toLowerCase().includes(q) ||
        cityLabel(e.city ?? '').toLowerCase().includes(q)
      )
    : events;

  return (
    <div className="min-h-screen pb-10" style={{ background: 'var(--tqf-beige)' }}>

      {/* Sticky header */}
      <header className="sticky top-0 z-10 px-4 pt-4 pb-3"
        style={{ background: 'white', borderBottom: '1px solid var(--tqf-beige-border)' }}>

        <div className="flex items-center gap-3 mb-3">
          <Link href="/planner" className="flex-shrink-0" style={{ color: 'var(--tqf-muted)' }}>
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400, fontSize: '1.25rem', lineHeight: 1.2 }}>
              Eventi
            </h1>
            <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Visualizza eventi e gestisci orario e cash control
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
            {events.length}
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: 'var(--tqf-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per codice, cliente, sede o organizzatore…"
            style={{
              width: '100%', padding: '0.6rem 2.25rem 0.6rem 2.25rem',
              borderRadius: '0.75rem', border: '1px solid var(--tqf-beige-border)',
              fontFamily: 'var(--font-body)', fontSize: '0.875rem',
              color: 'var(--tqf-dark)', background: 'var(--tqf-beige)', outline: 'none',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="size-4" style={{ color: 'var(--tqf-muted)' }} />
            </button>
          )}
        </div>
      </header>

      {/* Search result count */}
      {search && (
        <div className="px-4 pt-3">
          <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            {filtered.length} {filtered.length === 1 ? 'risultato' : 'risultati'} per &ldquo;{search}&rdquo;
          </p>
        </div>
      )}

      {/* Event cards */}
      <div className="px-4 pt-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl p-10 text-center"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <div className="mx-auto mb-4 size-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
              <Calendar className="size-6" />
            </div>
            <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {search ? 'Nessun evento trovato.' : 'Nessun evento ancora.'}
            </p>
          </div>
        ) : (
          filtered.map(evt => {
            const firstDay     = evt.days?.[0];
            const dayCount     = evt.days?.length ?? 0;
            const furnitureCount = (evt.days?.flatMap(d => d.selectedFurniture ?? []) ?? evt.selectedFurniture ?? [])
              .reduce((s, i) => s + i.quantity, 0);
            const flowerCount  = (evt.days?.flatMap(d => d.selectedFlowers ?? []) ?? evt.selectedFlowers ?? [])
              .reduce((s, i) => s + i.quantity, 0);

            return (
              <Link key={evt.id}
                href={`/planner/events/${evt.id}/view`}
                className="block rounded-2xl p-4 transition-all hover:shadow-sm active:scale-[0.99]"
                style={{ background: 'white', border: '1px solid var(--tqf-beige-border)', textDecoration: 'none' }}>

                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Title + status */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-semibold truncate"
                        style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                        {evt.eventCode || evt.eventName || '(senza nome)'}
                      </p>
                      <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={evt.status === 'submitted'
                          ? { background: '#fef9ee', color: '#b45309', fontFamily: 'var(--font-body)' }
                          : { background: '#f3f4f6', color: '#6b7280', fontFamily: 'var(--font-body)' }}>
                        {evt.status === 'submitted' ? 'Inviato' : 'Bozza'}
                      </span>
                    </div>

                    {/* Client */}
                    {evt.clientName && (
                      <p className="text-xs mb-2" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                        {evt.clientName}
                      </p>
                    )}

                    {/* Meta row */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {firstDay?.date && (
                        <span className="flex items-center gap-1 text-xs"
                          style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                          <Calendar className="size-3" />
                          {dayCount > 1 ? `${dayCount} giorni` : fmtDate(firstDay.date)}
                        </span>
                      )}
                      {(firstDay?.venue || evt.city) && (
                        <span className="flex items-center gap-1 text-xs"
                          style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                          <MapPin className="size-3 flex-shrink-0" />
                          {firstDay?.venue ?? cityLabel(evt.city ?? '')}
                        </span>
                      )}
                      {evt.plannerName && (
                        <span className="flex items-center gap-1 text-xs"
                          style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                          <User className="size-3" />
                          {evt.plannerName}
                        </span>
                      )}
                    </div>

                    {/* Items badges */}
                    {(furnitureCount > 0 || flowerCount > 0) && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {furnitureCount > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: '#f3f4f6', color: '#374151', fontFamily: 'var(--font-body)' }}>
                            🛋 {furnitureCount} mobili
                          </span>
                        )}
                        {flowerCount > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: '#f3f4f6', color: '#374151', fontFamily: 'var(--font-body)' }}>
                            🌸 {flowerCount} fiori
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <ChevronRight className="size-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--tqf-muted)' }} />
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
