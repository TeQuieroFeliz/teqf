'use client';

import { useCashControlAuth } from '@/context/CashControlAuthContext';
import { isCashControlAdmin } from '@/lib/cash-control/permissions';
import {
  getEvent,
  isUserAssignedToEvent,
  subscribeToEventBalance,
  subscribeToClosureForUserEvent,
  deleteExpense,
  deleteMoneyReceived,
} from '@/lib/cash-control/firestore';
import {
  CashControlEvent,
  CashControlClosure,
  EventBalance,
  TransactionRow,
} from '@/lib/cash-control/types';
import { SummaryCards } from '@/components/cash-control/SummaryCards';
import { TransactionList } from '@/components/cash-control/TransactionList';
import { ReceivedMoneySheet } from '@/components/cash-control/ReceivedMoneySheet';
import { ExpenseSheet } from '@/components/cash-control/ExpenseSheet';
import { CloseAccountModal } from '@/components/cash-control/CloseAccountModal';
import {
  ArrowLeft,
  Loader2,
  Plus,
  ShoppingCart,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const EMPTY_BALANCE: EventBalance = {
  totalReceived: 0,
  totalSpent: 0,
  saldo: 0,
  totalWithoutSupport: 0,
};

export default function EventoPage() {
  const { id } = useParams<{ id: string }>();
  const { uid, displayName, cashControlRole, isLoading: authLoading } =
    useCashControlAuth();
  const isAdmin = isCashControlAdmin(cashControlRole);
const [event, setEvent] = useState<CashControlEvent | null>(null);
  const [balance, setBalance] = useState<EventBalance>(EMPTY_BALANCE);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [closure, setClosure] = useState<CashControlClosure | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notAssigned, setNotAssigned] = useState(false);

  // Sheet visibility
  const [showReceived, setShowReceived] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showClose, setShowClose] = useState(false);

  // Edit mode
  const [editingExpense, setEditingExpense] = useState<TransactionRow | null>(null);
  const [editingReceived, setEditingReceived] = useState<TransactionRow | null>(null);

  function handleEdit(row: TransactionRow) {
    if (row.kind === 'expense') setEditingExpense(row);
    else setEditingReceived(row);
  }

  async function handleDelete(row: TransactionRow) {
    if (!window.confirm('¿Eliminar esta operación? Esta acción no se puede deshacer.')) return;
    if (row.kind === 'expense') await deleteExpense(row.id);
    else await deleteMoneyReceived(row.id);
  }

  // Keep stable unsubscribe refs
  const unsubBalance = useRef<(() => void) | null>(null);
  const unsubClosure = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (authLoading || !uid) return;

    let mounted = true;

    async function init() {
      try {
      // Admin users can access any event without assignment check
      const [ev, assigned] = await Promise.all([
        getEvent(id),
        isAdmin ? Promise.resolve(true) : isUserAssignedToEvent(uid!, id),
      ]);

      if (!mounted) return;

      if (!ev) { setNotFound(true); setLoading(false); return; }
      if (!assigned) { setNotAssigned(true); setLoading(false); return; }

      setEvent(ev);
      setLoading(false);

      // Live balance (only meaningful for team/own data; admin will see same for now)
      unsubBalance.current = subscribeToEventBalance(
        id,
        uid!,
        (bal, txns) => {
          if (!mounted) return;
          setBalance(bal);
          setTransactions(txns);
        }
      );

      // Live closure
      unsubClosure.current = subscribeToClosureForUserEvent(
        uid!,
        id,
        cl => {
          if (!mounted) return;
          setClosure(cl);
        }
      );
      } catch {
        if (mounted) setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
      unsubBalance.current?.();
      unsubClosure.current?.();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, uid, id]);

  // ── Loading / error states ─────────────────────────────────────────────────

  if (authLoading || loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--tqf-beige)' }}
      >
        <Loader2
          className="size-8 animate-spin"
          style={{ color: 'var(--tqf-bordeaux)' }}
        />
      </div>
    );
  }

  if (notFound) {
    return (
      <ErrorScreen
        message="Evento no encontrado."
        back="/area-planner/cash-control"
      />
    );
  }

  if (notAssigned) {
    return (
      <ErrorScreen
        message="No tienes acceso a este evento."
        back="/area-planner/cash-control"
      />
    );
  }

  if (!event || !uid) return null;

  // ── Derived state ──────────────────────────────────────────────────────────

  const isClosed = !!closure && !closure.isReopened;
  const userName = displayName ?? uid;
  const eventLabel = event.eventCode || event.eventName;
  const backHref = isAdmin
    ? `/area-planner/cash-control/admin/eventos/${id}`
    : '/area-planner/cash-control';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div
        className="min-h-screen pb-28"
        style={{ background: 'var(--tqf-beige)' }}
      >
        {/* ── Sticky header ─────────────────────────────────────────────── */}
        <header
          className="sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3"
          style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}
        >
          <Link
            href={backHref}
            className="flex items-center justify-center size-9 rounded-lg flex-shrink-0 transition-opacity hover:opacity-70"
            style={{ border: '1px solid var(--tqf-beige-border)' }}
          >
            <ArrowLeft className="size-4" style={{ color: 'var(--tqf-muted)' }} />
          </Link>

          <div className="min-w-0 flex-1">
            <p
              className="font-medium truncate"
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--tqf-dark)',
                fontSize: '1rem',
                fontWeight: 400,
              }}
            >
              {eventLabel}
            </p>
            <p
              className="text-xs truncate"
              style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
            >
              {userName}
              {event.eventDate ? ` · ${event.eventDate}` : ''}
            </p>
          </div>

          {isClosed && (
            <span
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full flex-shrink-0"
              style={{
                background: '#fef2f2',
                color: '#991b1b',
                fontFamily: 'var(--font-body)',
              }}
            >
              <Lock className="size-3" />
              Cerrada
            </span>
          )}
        </header>

        {/* ── Main content ──────────────────────────────────────────────── */}
        <main className="max-w-lg mx-auto px-4 py-5 space-y-5">

          {/* Balance cards */}
          <SummaryCards balance={balance} />

          {/* Action buttons — hidden when closed */}
          {!isClosed && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowReceived(true)}
                className="flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-medium transition-all active:scale-[0.97]"
                style={{
                  background: '#166534',
                  color: 'white',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <Plus className="size-4" />
                Recibir dinero
              </button>

              <button
                onClick={() => setShowExpense(true)}
                className="flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-medium transition-all active:scale-[0.97]"
                style={{
                  background: 'var(--tqf-bordeaux)',
                  color: 'white',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <ShoppingCart className="size-4" />
                Gasto
              </button>
            </div>
          )}

          {/* Closed notice */}
          {isClosed && (
            <div
              className="rounded-2xl px-5 py-4 flex items-center gap-3"
              style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
            >
              <Lock className="size-5 flex-shrink-0" style={{ color: '#991b1b' }} />
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: '#991b1b', fontFamily: 'var(--font-body)' }}
                >
                  Cuenta cerrada
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: '#991b1b', opacity: 0.8, fontFamily: 'var(--font-body)' }}
                >
                  Contacta al administrador para reabrirla.
                </p>
              </div>
            </div>
          )}

          {/* Transaction list */}
          <section>
            <p
              className="text-xs uppercase tracking-widest mb-3"
              style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
            >
              Últimos movimientos
            </p>
            <TransactionList
              transactions={transactions}
              maxVisible={5}
              onEdit={!isClosed ? handleEdit : undefined}
              onDelete={!isClosed ? handleDelete : undefined}
            />
          </section>
        </main>
      </div>

      {/* ── Sticky bottom — Cerrar cuenta (only when open) ──────────────── */}
      {!isClosed && (
        <div
          className="fixed bottom-0 left-0 right-0 px-4 z-20"
          style={{
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
            paddingTop: '12px',
            background: 'linear-gradient(to bottom, transparent, var(--tqf-beige) 40%)',
          }}
        >
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => setShowClose(true)}
              className="w-full py-4 rounded-2xl text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-80 active:scale-[0.98]"
              style={{
                border: '1.5px solid var(--tqf-beige-border)',
                color: 'var(--tqf-muted)',
                background: 'white',
                fontFamily: 'var(--font-body)',
              }}
            >
              <Lock className="size-4" />
              Cerrar cuenta
            </button>
          </div>
        </div>
      )}

      {/* ── Sheets ────────────────────────────────────────────────────────── */}
      <ReceivedMoneySheet
        open={showReceived}
        onClose={() => setShowReceived(false)}
        eventId={id}
        userId={uid}
      />

      <ExpenseSheet
        open={showExpense}
        onClose={() => setShowExpense(false)}
        eventId={id}
        userId={uid}
      />

      {/* Edit sheets */}
      {editingExpense && (
        <ExpenseSheet
          key={editingExpense.id}
          open={true}
          initialData={editingExpense}
          onClose={() => setEditingExpense(null)}
          eventId={id}
          userId={uid}
        />
      )}

      {editingReceived && (
        <ReceivedMoneySheet
          key={editingReceived.id}
          open={true}
          initialData={editingReceived}
          onClose={() => setEditingReceived(null)}
          eventId={id}
          userId={uid}
        />
      )}

      <CloseAccountModal
        open={showClose}
        onClose={() => setShowClose(false)}
        onConfirmed={() => {
          // Closure subscription will update `closure` state automatically
        }}
        eventCode={eventLabel}
        userName={userName}
        balance={balance}
        eventId={id}
        userId={uid}
      />
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ErrorScreen({
  message,
  back,
}: {
  message: string;
  back: string;
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--tqf-beige)' }}
    >
      <div
        className="max-w-sm w-full text-center rounded-2xl p-8"
        style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
      >
        <p
          className="text-sm mb-4"
          style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
        >
          {message}
        </p>
        <Link
          href={back}
          className="inline-flex items-center gap-2 text-sm"
          style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}
        >
          <ArrowLeft className="size-4" />
          Volver
        </Link>
      </div>
    </div>
  );
}
