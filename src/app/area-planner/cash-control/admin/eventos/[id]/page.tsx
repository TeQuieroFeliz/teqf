'use client';

import { useAdminAuth } from '@/context/AdminAuthContext';
import { useCashControlAuth } from '@/context/CashControlAuthContext';
import { isCashControlAdmin } from '@/lib/cash-control/permissions';
import {
  getEvent,
  getEventAssignments,
  getCashControlProfile,
  getAllClosuresForEvent,
  getAllCashControlProfiles,
  subscribeToAllUsersEventBalance,
} from '@/lib/cash-control/firestore';
import { CashControlEvent, CashControlClosure, CashControlProfile, UserEventSummary } from '@/lib/cash-control/types';
import { formatCurrency } from '@/lib/cash-control/calculations';
import { Loader2, ArrowLeft, UserPlus, ChevronRight, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface UserBalance {
  uid: string;
  profile: CashControlProfile | null;
  closure: CashControlClosure | null;
}

export default function AdminEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { cashControlRole, uid: adminUid, isLoading: authLoading } = useCashControlAuth();
  const { adminUser } = useAdminAuth();
  const isAdmin = isCashControlAdmin(cashControlRole) || adminUser?.role === 'superadmin';
  const router = useRouter();

  const [event, setEvent] = useState<CashControlEvent | null>(null);
  const [userBalances, setUserBalances] = useState<UserBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Live report data
  const [liveSummaries, setLiveSummaries] = useState<UserEventSummary[]>([]);
  const [profileNames, setProfileNames] = useState<Map<string, string>>(new Map());
  const unsubLive = useRef<(() => void) | null>(null);

  // Assign user form
  const [assignEmail, setAssignEmail] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      router.replace('/area-planner/cash-control');
      return;
    }
    loadData();

    // Load profiles for attribution
    getAllCashControlProfiles().then(profiles => {
      setProfileNames(new Map(profiles.map(p => [p.uid, p.fullName || p.email])));
    });

    // Live report subscription
    unsubLive.current = subscribeToAllUsersEventBalance(id, (summaries) => {
      setLiveSummaries(summaries);
    });

    return () => { unsubLive.current?.(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAdmin, id]);

  async function loadData() {
    try {
      const [ev, assignments, closures] = await Promise.all([
        getEvent(id),
        getEventAssignments(id),
        getAllClosuresForEvent(id),
      ]);

      if (!ev) { setNotFound(true); return; }
      setEvent(ev);

      const balances: UserBalance[] = await Promise.all(
        assignments.map(async a => {
          const profile = await getCashControlProfile(a.userId);
          const closure = closures.find(c => c.userId === a.userId) ?? null;
          return { uid: a.userId, profile, closure };
        })
      );
      setUserBalances(balances);
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignUser(e: React.FormEvent) {
    e.preventDefault();
    if (!assignEmail.trim() || !adminUid) return;
    setAssigning(true);
    try {
      const res = await fetch('/api/cash-control/assign-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: assignEmail.trim(), eventId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      toast.success(`Usuario asignado al evento.`);
      setAssignEmail('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al asignar usuario.';
      toast.error(msg);
    } finally {
      setAssigning(false);
    }
  }

  async function handleReopen(userBalance: UserBalance) {
    if (!userBalance.closure) return;
    if (!confirm('¿Reabrir la cuenta de este usuario?')) return;
    try {
      const res = await fetch('/api/cash-control/reopen-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closureId: userBalance.closure.id, reopenedBy: adminUid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      toast.success('Cuenta reabierta.');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al reabrir.';
      toast.error(msg);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: 'var(--tqf-beige)' }}>
        <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
          Evento no encontrado.
        </p>
        <Link href="/area-planner/cash-control/admin" className="mt-4 text-sm" style={{ color: 'var(--tqf-bordeaux)' }}>
          ← Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}
      >
        <Link
          href="/area-planner/cash-control/admin"
          className="flex items-center justify-center size-9 rounded-lg flex-shrink-0"
          style={{ border: '1px solid var(--tqf-beige-border)' }}
        >
          <ArrowLeft className="size-4" style={{ color: 'var(--tqf-muted)' }} />
        </Link>
        <div className="min-w-0">
          <p
            className="font-medium truncate"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontSize: '1rem', fontWeight: 400 }}
          >
            {event.eventCode || event.eventName}
          </p>
          {event.eventDate && (
            <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {event.eventDate}{event.location ? ` · ${event.location}` : ''}
            </p>
          )}
        </div>
        <span
          className="ml-auto text-xs px-2.5 py-1 rounded-full flex-shrink-0"
          style={
            event.status === 'active'
              ? { background: '#f0fdf4', color: '#166534', fontFamily: 'var(--font-body)' }
              : { background: '#f3f4f6', color: '#6b7280', fontFamily: 'var(--font-body)' }
          }
        >
          {event.status === 'active' ? 'Activo' : 'Cerrado'}
        </span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Assign user form */}
        <form
          onSubmit={handleAssignUser}
          className="rounded-2xl p-5"
          style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
        >
          <h2
            className="text-base mb-3"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}
          >
            Asignar usuario al evento
          </h2>
          <div className="flex gap-2">
            <input
              type="email"
              value={assignEmail}
              onChange={e => setAssignEmail(e.target.value)}
              placeholder="Email del usuario"
              className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{
                border: '1px solid var(--tqf-beige-border)',
                background: 'var(--tqf-beige)',
                fontFamily: 'var(--font-body)',
                color: 'var(--tqf-dark)',
              }}
            />
            <button
              type="submit"
              disabled={assigning}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
            >
              {assigning ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="size-4" />
                  Asignar
                </>
              )}
            </button>
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            El usuario debe tener acceso Cash Control asignado desde /admin/cash-control/users
          </p>
        </form>

        {/* Live report */}
        {liveSummaries.length > 0 && (
          <section>
            <p
              className="text-xs uppercase tracking-widest mb-3"
              style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
            >
              Reporte en tiempo real
            </p>

            {/* Per-user cards */}
            <div className="space-y-2 mb-3">
              {liveSummaries.map(s => {
                const name = profileNames.get(s.userId) || s.userId;
                const companyOwes = s.netBalance < 0;
                const userOwes = s.netBalance > 0;
                return (
                  <div
                    key={s.userId}
                    className="rounded-2xl p-4"
                    style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className="font-medium truncate"
                          style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}
                        >
                          {name}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                          Recibido ${formatCurrency(s.totalReceived)} · Gastado ${formatCurrency(s.totalSpent)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {companyOwes ? (
                          <span
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl font-medium"
                            style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontFamily: 'var(--font-body)' }}
                          >
                            <TrendingDown className="size-3" />
                            Empresa debe ${formatCurrency(Math.abs(s.netBalance))}
                          </span>
                        ) : userOwes ? (
                          <span
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl font-medium"
                            style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', fontFamily: 'var(--font-body)' }}
                          >
                            <TrendingUp className="size-3" />
                            Devolver ${formatCurrency(s.netBalance)}
                          </span>
                        ) : (
                          <span
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl"
                            style={{ background: '#f3f4f6', color: '#6b7280', fontFamily: 'var(--font-body)' }}
                          >
                            <Minus className="size-3" />
                            Cuadrado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Event totals */}
            {liveSummaries.length > 1 && (() => {
              const totalReceived = liveSummaries.reduce((s, u) => s + u.totalReceived, 0);
              const totalSpent = liveSummaries.reduce((s, u) => s + u.totalSpent, 0);
              const netTotal = totalReceived - totalSpent;
              return (
                <div
                  className="rounded-2xl p-4 grid grid-cols-3 gap-3"
                  style={{ background: 'var(--tqf-cipria-light)', border: '1px solid var(--tqf-cipria)' }}
                >
                  {[
                    { label: 'Total recibido', value: totalReceived, color: '#166534' },
                    { label: 'Total gastado', value: totalSpent, color: '#991b1b' },
                    { label: 'Saldo neto', value: netTotal, color: netTotal >= 0 ? '#166534' : '#991b1b' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-center">
                      <p className="text-xs mb-0.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                        {label}
                      </p>
                      <p className="text-sm font-semibold" style={{ color, fontFamily: 'var(--font-body)' }}>
                        {value < 0 ? '-' : ''}${formatCurrency(Math.abs(value))}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </section>
        )}

        {/* Users / balances */}
        <section>
          <p
            className="text-xs uppercase tracking-widest mb-3"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
          >
            Usuarios asignados
          </p>

          {userBalances.length === 0 ? (
            <div
              className="rounded-2xl p-6 text-center"
              style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
            >
              <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                Sin usuarios asignados aún.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {userBalances.map(ub => {
                const isClosed = ub.closure && !ub.closure.isReopened;
                return (
                  <div
                    key={ub.uid}
                    className="rounded-2xl p-5"
                    style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p
                          className="font-medium"
                          style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}
                        >
                          {ub.profile?.fullName ?? ub.uid}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                          {ub.profile?.email ?? ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className="text-xs px-2.5 py-1 rounded-full"
                          style={
                            isClosed
                              ? { background: '#fef2f2', color: '#991b1b', fontFamily: 'var(--font-body)' }
                              : { background: '#f0fdf4', color: '#166534', fontFamily: 'var(--font-body)' }
                          }
                        >
                          {isClosed ? 'Cerrada' : 'Activa'}
                        </span>
                        <Link
                          href={`/area-planner/cash-control/admin/eventos/${id}/users/${ub.uid}`}
                          className="flex items-center justify-center size-8 rounded-lg transition-opacity hover:opacity-70"
                          style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-bordeaux)' }}
                        >
                          <ChevronRight className="size-4" />
                        </Link>
                      </div>
                    </div>

                    {ub.closure && (
                      <div className="mt-3 pt-3 grid grid-cols-3 gap-3" style={{ borderTop: '1px solid var(--tqf-beige-border)' }}>
                        {[
                          { label: 'Recibido', value: ub.closure.totalReceived, color: '#166534' },
                          { label: 'Gastado', value: ub.closure.totalSpent, color: '#991b1b' },
                          { label: 'Saldo', value: ub.closure.finalBalance, color: ub.closure.finalBalance >= 0 ? '#166534' : '#991b1b' },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="text-center">
                            <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                              {label}
                            </p>
                            <p
                              className="text-sm font-medium mt-0.5"
                              style={{ color, fontFamily: 'var(--font-body)' }}
                            >
                              ${formatCurrency(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {isClosed && (
                      <button
                        onClick={() => handleReopen(ub)}
                        className="mt-3 w-full py-2 rounded-xl text-sm"
                        style={{
                          border: '1px solid var(--tqf-beige-border)',
                          color: 'var(--tqf-bordeaux)',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        Reabrir cuenta
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
