'use client';

import { getAllPlannerEvents, deletePlannerEvent, updatePlannerEventStatus } from '@/actions/planner/planner-event-crud';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { PlannerEvent } from '@/lib/planner-types';
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Loader2,
  Search,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft:     { label: 'Bozza',     bg: '#f3f4f6', text: '#6b7280' },
  active:    { label: 'Attivo',    bg: '#f0fdf4', text: '#166534' },
  submitted: { label: 'Inviato',   bg: '#fef9ee', text: '#b45309' },
};

export default function AdminEventsPage() {
  const { adminUser } = useAdminAuth();
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'active' | 'submitted'>('all');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getAllPlannerEvents().then(evs => {
      setEvents(evs);
      setLoading(false);
    });
  }, []);

  const filtered = events.filter(ev => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (ev.eventCode ?? '').toLowerCase().includes(q) ||
      (ev.clientName ?? '').toLowerCase().includes(q) ||
      (ev.plannerName ?? '').toLowerCase().includes(q) ||
      (ev.city ?? '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || ev.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  async function handleDelete(ev: PlannerEvent) {
    if (!confirm(`Eliminare l'evento "${ev.eventCode || ev.eventName}"?`)) return;
    startTransition(async () => {
      const res = await deletePlannerEvent(ev.id);
      if (res.success) {
        setEvents(prev => prev.filter(e => e.id !== ev.id));
        toast.success('Evento eliminato.');
      } else {
        toast.error('Errore durante l\'eliminazione.');
      }
    });
  }

  async function handleStatusChange(ev: PlannerEvent, status: 'draft' | 'active' | 'submitted') {
    startTransition(async () => {
      const res = await updatePlannerEventStatus(ev.id, status);
      if (res.success) {
        setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, status } : e));
        toast.success('Stato aggiornato.');
      } else {
        toast.error('Errore aggiornamento stato.');
      }
    });
  }

  const isSuperAdmin = adminUser?.role === 'superadmin';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      {/* Header */}
      <header
        className="border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex items-center justify-center size-9 rounded-lg"
            style={{ border: '1px solid var(--tqf-beige-border)' }}
          >
            <ArrowLeft className="size-4" style={{ color: 'var(--tqf-muted)' }} />
          </Link>
          <div>
            <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Pannello Admin
            </p>
            <h1 className="text-xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontWeight: 300 }}>
              Eventi Planner
            </h1>
          </div>
        </div>
        <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
          {filtered.length} {filtered.length === 1 ? 'evento' : 'eventi'}
        </p>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: 'var(--tqf-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca per codice, cliente, planner..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{
                border: '1px solid var(--tqf-beige-border)',
                background: 'white',
                fontFamily: 'var(--font-body)',
                color: 'var(--tqf-dark)',
              }}
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'active', 'submitted', 'draft'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="px-3 py-2 rounded-xl text-xs transition-all"
                style={{
                  fontFamily: 'var(--font-body)',
                  background: statusFilter === s ? 'var(--tqf-bordeaux)' : 'white',
                  color: statusFilter === s ? 'white' : 'var(--tqf-muted)',
                  border: '1px solid var(--tqf-beige-border)',
                }}
              >
                {s === 'all' ? 'Tutti' : STATUS_CONFIG[s]?.label ?? s}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
          >
            <Calendar className="size-10 mx-auto mb-3" style={{ color: 'var(--tqf-cipria)' }} />
            <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Nessun evento trovato.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(ev => {
              const cfg = STATUS_CONFIG[ev.status] ?? STATUS_CONFIG.draft;
              return (
                <div
                  key={ev.id}
                  className="rounded-2xl p-5"
                  style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className="font-medium"
                          style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontSize: '1rem', fontWeight: 400 }}
                        >
                          {ev.eventCode || ev.eventName || 'Evento senza nome'}
                        </p>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: cfg.bg, color: cfg.text, fontFamily: 'var(--font-body)' }}
                        >
                          {cfg.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {ev.clientName && (
                          <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            Cliente: {ev.clientName}
                          </p>
                        )}
                        {ev.plannerName && (
                          <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            Planner: {ev.plannerName}
                          </p>
                        )}
                        {ev.city && (
                          <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            {ev.city}
                          </p>
                        )}
                        {ev.days?.length > 0 && (
                          <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            {ev.days.length} {ev.days.length === 1 ? 'giorno' : 'giorni'}
                          </p>
                        )}
                      </div>

                      {/* Status change (superadmin only) */}
                      {isSuperAdmin && (
                        <div className="flex gap-1.5 mt-3">
                          {(['draft', 'active', 'submitted'] as const).map(s => (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(ev, s)}
                              disabled={ev.status === s || isPending}
                              className="text-xs px-2.5 py-1 rounded-full transition-all disabled:opacity-40"
                              style={{
                                fontFamily: 'var(--font-body)',
                                background: ev.status === s ? STATUS_CONFIG[s].bg : '#f9fafb',
                                color: ev.status === s ? STATUS_CONFIG[s].text : '#9ca3af',
                                border: `1px solid ${ev.status === s ? STATUS_CONFIG[s].text + '40' : '#e5e7eb'}`,
                              }}
                            >
                              {STATUS_CONFIG[s].label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isSuperAdmin && (
                        <button
                          onClick={() => handleDelete(ev)}
                          disabled={isPending}
                          className="flex items-center justify-center size-8 rounded-lg"
                          style={{ border: '1px solid #fca5a5', color: '#991b1b' }}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                      <Link
                        href={`/admin/events/${ev.id}`}
                        className="flex items-center justify-center size-8 rounded-lg transition-opacity hover:opacity-70"
                        style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-bordeaux)' }}
                      >
                        <ChevronRight className="size-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
