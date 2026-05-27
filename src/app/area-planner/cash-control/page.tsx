'use client';

import { useCashControlAuth } from '@/context/CashControlAuthContext';
import { isCashControlAdmin } from '@/lib/cash-control/permissions';
import { getAllEvents } from '@/lib/cash-control/firestore';
import { CashControlEvent } from '@/lib/cash-control/types';
import { CreateEventSheet } from '@/components/cash-control/CreateEventSheet';
import { Loader2, Calendar, ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CashControlIndexPage() {
  const { cashControlRole, uid, isLoading: authLoading } = useCashControlAuth();
  const isAdmin = isCashControlAdmin(cashControlRole);
  const router = useRouter();

  const [events, setEvents] = useState<CashControlEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (isAdmin) {
      router.replace('/area-planner/cash-control/admin');
      return;
    }
    if (!uid) {
      setLoading(false);
      return;
    }

    getAllEvents()
      .then(evs => {
        setEvents(evs.filter(e => e.status === 'active'));
      })
      .finally(() => setLoading(false));
  }, [authLoading, isAdmin, uid, router]);

  if (authLoading || loading || isAdmin) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--tqf-beige)' }}
      >
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <>
        <div
          className="min-h-screen flex flex-col"
          style={{ background: 'var(--tqf-beige)' }}
        >
          <header
            className="border-b px-4 py-3 flex items-center gap-3 flex-shrink-0"
            style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}
          >
            <Link
              href="/area-planner"
              className="flex items-center justify-center size-9 rounded-lg flex-shrink-0"
              style={{ border: '1px solid var(--tqf-beige-border)' }}
            >
              <ArrowLeft className="size-4" style={{ color: 'var(--tqf-muted)' }} />
            </Link>
            <p style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontSize: '1rem', fontWeight: 300 }}>
              Cash Control
            </p>
          </header>
          <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div
            className="max-w-sm w-full text-center rounded-2xl p-8"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
          >
            <div
              className="mx-auto mb-4 size-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}
            >
              <Calendar className="size-7" />
            </div>
            <h2
              className="text-xl mb-2"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}
            >
              Sin eventos asignados
            </h2>
            <p
              className="text-sm mb-6"
              style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
            >
              El administrador aún no te ha asignado ningún evento activo,
              o puedes crear uno propio.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-80 active:scale-[0.98]"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
            >
              <Plus className="size-4" />
              Crear evento
            </button>
          </div>
          </div>
        </div>

        <CreateEventSheet
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={eventId =>
            router.push(`/area-planner/cash-control/evento/${eventId}`)
          }
        />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
        <header
          className="border-b px-4 py-3 flex items-center justify-between"
          style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}
        >
          <div className="flex items-center gap-3">
            <Link
              href="/area-planner"
              className="flex items-center justify-center size-9 rounded-lg flex-shrink-0"
              style={{ border: '1px solid var(--tqf-beige-border)' }}
            >
              <ArrowLeft className="size-4" style={{ color: 'var(--tqf-muted)' }} />
            </Link>
            <p style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontSize: '1rem', fontWeight: 300 }}>
              Cash Control
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl transition-opacity hover:opacity-80"
            style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
          >
            <Plus className="size-4" />
            Nuevo
          </button>
        </header>
        <main className="max-w-lg mx-auto px-6 py-8">
          <div className="mb-5">
            <h1
              className="text-2xl mb-0.5"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 300 }}
            >
              Mis eventos
            </h1>
            <p
              className="text-sm"
              style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
            >
              Selecciona el evento activo
            </p>
          </div>

          <div className="space-y-3">
            {events.map(ev => (
              <Link
                key={ev.id}
                href={`/area-planner/cash-control/evento/${ev.id}`}
                className="flex items-center justify-between rounded-2xl p-5 transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className="font-medium"
                      style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontSize: '1.1rem', fontWeight: 400 }}
                    >
                      {ev.eventCode || ev.eventName}
                    </p>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                      style={
                        ev.eventType === 'gastos'
                          ? { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }
                          : { background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', border: '1px solid var(--tqf-beige-border)' }
                      }
                    >
                      {ev.eventType === 'gastos' ? 'Gastos del mes' : 'Evento'}
                    </span>
                  </div>
                  {ev.eventName && ev.eventName !== ev.eventCode && (
                    <p
                      className="text-sm mt-0.5"
                      style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
                    >
                      {ev.eventName}
                    </p>
                  )}
                  {ev.eventDate && (
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
                    >
                      {new Date(ev.eventDate + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <ArrowRight className="size-5 flex-shrink-0 ml-3" style={{ color: 'var(--tqf-bordeaux)' }} />
              </Link>
            ))}
          </div>
        </main>
      </div>

      <CreateEventSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={eventId =>
          router.push(`/area-planner/cash-control/evento/${eventId}`)
        }
      />
    </>
  );
}
