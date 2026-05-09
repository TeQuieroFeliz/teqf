'use client';

import { useAdminAuth } from '@/context/AdminAuthContext';
import { useCashControlAuth } from '@/context/CashControlAuthContext';
import { isCashControlAdmin } from '@/lib/cash-control/permissions';
import {
  getCashControlProfile,
  getEvent,
  subscribeToMoneyReceived,
  subscribeToExpenses,
  subscribeToClosureForUserEvent,
  updateMoneyReceived,
  deleteMoneyReceived,
  updateExpense,
  deleteExpense,
} from '@/lib/cash-control/firestore';
import {
  CashControlEvent,
  CashControlProfile,
  CashControlClosure,
  MoneyReceived,
  Expense,
  PaymentMethod,
} from '@/lib/cash-control/types';
import { formatCurrency } from '@/lib/cash-control/calculations';
import { auth } from '@/firebase/client';
import {
  Loader2,
  ArrowLeft,
  Pencil,
  Trash2,
  X,
  Check,
  Image as ImageIcon,
  RotateCcw,
  Trash,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
};

type EditReceived = {
  id: string;
  amount: string;
  method: PaymentMethod;
  note: string;
  date: string;
};

type EditExpense = {
  id: string;
  amount: string;
  method: PaymentMethod;
  note: string;
  date: string;
  tags: string;
  isWithoutSupport: boolean;
};

export default function AdminUserEventPage() {
  const { id: eventId, uid: targetUid } = useParams<{ id: string; uid: string }>();
  const { cashControlRole, uid: adminUid, isLoading: authLoading } = useCashControlAuth();
  const { adminUser } = useAdminAuth();
  const isAdmin = isCashControlAdmin(cashControlRole) || adminUser?.role === 'superadmin';
  const router = useRouter();

  const [event, setEvent] = useState<CashControlEvent | null>(null);
  const [profile, setProfile] = useState<CashControlProfile | null>(null);
  const [received, setReceived] = useState<MoneyReceived[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [closure, setClosure] = useState<CashControlClosure | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const [editReceived, setEditReceived] = useState<EditReceived | null>(null);
  const [editExpense, setEditExpense] = useState<EditExpense | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingClosure, setDeletingClosure] = useState(false);
  const [reopening, setReopening] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      router.replace('/area-planner/cash-control');
      return;
    }

    Promise.all([getEvent(eventId), getCashControlProfile(targetUid)]).then(([ev, prof]) => {
      setEvent(ev);
      setProfile(prof);
      setLoading(false);
    });

    const unsubR = subscribeToMoneyReceived(eventId, targetUid, setReceived);
    const unsubE = subscribeToExpenses(eventId, targetUid, setExpenses);
    const unsubC = subscribeToClosureForUserEvent(targetUid, eventId, c => setClosure(c));

    return () => {
      unsubR();
      unsubE();
      unsubC();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAdmin, eventId, targetUid]);

  const isClosed = closure !== null && closure !== undefined && !closure.isReopened;

  const totalReceived = received.reduce((s, r) => s + r.amount, 0);
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const balance = totalReceived - totalSpent;

  // ── Edit received ─────────────────────────────────────────────────────────

  function startEditReceived(r: MoneyReceived) {
    setEditExpense(null);
    setEditReceived({
      id: r.id,
      amount: String(r.amount),
      method: r.method,
      note: r.note ?? '',
      date: r.date ?? '',
    });
  }

  async function saveReceived() {
    if (!editReceived) return;
    const amount = parseFloat(editReceived.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Monto inválido.');
      return;
    }
    setSaving(true);
    try {
      await updateMoneyReceived(editReceived.id, {
        amount,
        method: editReceived.method,
        note: editReceived.note.trim() || null,
        date: editReceived.date || undefined,
      });
      toast.success('Movimiento actualizado.');
      setEditReceived(null);
    } catch (e) {
      toast.error('Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteReceived(id: string) {
    if (!confirm('¿Eliminar este ingreso?')) return;
    try {
      await deleteMoneyReceived(id);
      toast.success('Ingreso eliminado.');
    } catch {
      toast.error('Error al eliminar.');
    }
  }

  // ── Edit expense ──────────────────────────────────────────────────────────

  function startEditExpense(e: Expense) {
    setEditReceived(null);
    setEditExpense({
      id: e.id,
      amount: String(e.amount),
      method: e.method,
      note: e.note ?? '',
      date: e.date ?? '',
      tags: e.tags.join(', '),
      isWithoutSupport: e.isWithoutSupport,
    });
  }

  async function saveExpense() {
    if (!editExpense) return;
    const amount = parseFloat(editExpense.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Monto inválido.');
      return;
    }
    setSaving(true);
    try {
      await updateExpense(editExpense.id, {
        amount,
        method: editExpense.method,
        note: editExpense.note.trim() || null,
        date: editExpense.date || undefined,
        tags: editExpense.tags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
        isWithoutSupport: editExpense.isWithoutSupport,
      });
      toast.success('Gasto actualizado.');
      setEditExpense(null);
    } catch {
      toast.error('Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExpense(id: string) {
    if (!confirm('¿Eliminar este gasto?')) return;
    try {
      await deleteExpense(id);
      toast.success('Gasto eliminado.');
    } catch {
      toast.error('Error al eliminar.');
    }
  }

  // ── Closure actions ───────────────────────────────────────────────────────

  async function handleReopen() {
    if (!closure) return;
    if (!confirm('¿Reabrir la cuenta de este usuario?')) return;
    setReopening(true);
    try {
      const token = await auth.currentUser?.getIdToken(true);
      const res = await fetch('/api/cash-control/reopen-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ closureId: closure.id, reopenedBy: adminUid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      toast.success('Cuenta reabierta.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al reabrir.');
    } finally {
      setReopening(false);
    }
  }

  async function handleDeleteClosure() {
    if (!closure) return;
    if (!confirm('¿Eliminar el cierre? La cuenta quedará completamente abierta.')) return;
    setDeletingClosure(true);
    try {
      const token = await auth.currentUser?.getIdToken(true);
      const res = await fetch('/api/cash-control/delete-closure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ closureId: closure.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      toast.success('Cierre eliminado.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar cierre.');
    } finally {
      setDeletingClosure(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (authLoading || loading || closure === undefined) {
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
        className="sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}
      >
        <Link
          href={`/area-planner/cash-control/admin/eventos/${eventId}`}
          className="flex items-center justify-center size-9 rounded-lg flex-shrink-0"
          style={{ border: '1px solid var(--tqf-beige-border)' }}
        >
          <ArrowLeft className="size-4" style={{ color: 'var(--tqf-muted)' }} />
        </Link>
        <div className="min-w-0 flex-1">
          <p
            className="font-medium truncate"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontSize: '1rem', fontWeight: 400 }}
          >
            {profile?.fullName ?? targetUid}
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            {event?.eventCode || event?.eventName}
          </p>
        </div>
        <span
          className="text-xs px-2.5 py-1 rounded-full flex-shrink-0"
          style={
            isClosed
              ? { background: '#fef2f2', color: '#991b1b', fontFamily: 'var(--font-body)' }
              : closure?.isReopened
              ? { background: '#fff7ed', color: '#c2410c', fontFamily: 'var(--font-body)' }
              : { background: '#f0fdf4', color: '#166534', fontFamily: 'var(--font-body)' }
          }
        >
          {isClosed ? 'Cerrada' : closure?.isReopened ? 'Reabierta' : 'Activa'}
        </span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Summary */}
        <div
          className="rounded-2xl p-5 grid grid-cols-3 gap-3"
          style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
        >
          {[
            { label: 'Recibido', value: totalReceived, color: '#166534' },
            { label: 'Gastado', value: totalSpent, color: '#991b1b' },
            { label: 'Saldo', value: balance, color: balance >= 0 ? '#166534' : '#991b1b' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className="text-xs mb-0.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {label}
              </p>
              <p className="text-base font-medium" style={{ color, fontFamily: 'var(--font-body)' }}>
                ${formatCurrency(value)}
              </p>
            </div>
          ))}
        </div>

        {/* Closure actions */}
        {closure && (
          <div
            className="rounded-2xl p-4 space-y-2"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
          >
            <p className="text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Gestionar cierre
            </p>
            <div className="flex gap-2">
              {isClosed && (
                <button
                  onClick={handleReopen}
                  disabled={reopening}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm"
                  style={{
                    border: '1.5px solid var(--tqf-bordeaux)',
                    color: 'var(--tqf-bordeaux)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {reopening ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                  Reabrir cuenta
                </button>
              )}
              <button
                onClick={handleDeleteClosure}
                disabled={deletingClosure}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm"
                style={{
                  border: '1.5px solid #fca5a5',
                  color: '#991b1b',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {deletingClosure ? <Loader2 className="size-4 animate-spin" /> : <Trash className="size-4" />}
                Eliminar cierre
              </button>
            </div>
          </div>
        )}

        {/* Money Received */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Ingresos ({received.length})
            </p>
            <p className="text-sm font-medium" style={{ color: '#166534', fontFamily: 'var(--font-body)' }}>
              +${formatCurrency(totalReceived)}
            </p>
          </div>

          {received.length === 0 ? (
            <EmptyState label="Sin ingresos registrados" />
          ) : (
            <div className="space-y-2">
              {received.map(r => (
                <div
                  key={r.id}
                  className="rounded-2xl p-4"
                  style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
                >
                  {editReceived?.id === r.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            Monto
                          </label>
                          <input
                            type="number"
                            value={editReceived.amount}
                            onChange={e => setEditReceived(v => v && { ...v, amount: e.target.value })}
                            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                            style={{ border: '1px solid var(--tqf-beige-border)', background: 'var(--tqf-beige)', fontFamily: 'var(--font-body)' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            Fecha
                          </label>
                          <input
                            type="date"
                            value={editReceived.date}
                            onChange={e => setEditReceived(v => v && { ...v, date: e.target.value })}
                            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                            style={{ border: '1px solid var(--tqf-beige-border)', background: 'var(--tqf-beige)', fontFamily: 'var(--font-body)' }}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                          Método
                        </label>
                        <select
                          value={editReceived.method}
                          onChange={e => setEditReceived(v => v && { ...v, method: e.target.value as PaymentMethod })}
                          className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                          style={{ border: '1px solid var(--tqf-beige-border)', background: 'var(--tqf-beige)', fontFamily: 'var(--font-body)' }}
                        >
                          {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map(m => (
                            <option key={m} value={m}>{METHOD_LABELS[m]}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                          Nota
                        </label>
                        <input
                          type="text"
                          value={editReceived.note}
                          onChange={e => setEditReceived(v => v && { ...v, note: e.target.value })}
                          placeholder="Opcional"
                          className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                          style={{ border: '1px solid var(--tqf-beige-border)', background: 'var(--tqf-beige)', fontFamily: 'var(--font-body)' }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={saveReceived}
                          disabled={saving}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm"
                          style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
                        >
                          {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditReceived(null)}
                          className="flex items-center justify-center px-3 py-2 rounded-xl"
                          style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)' }}
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-base font-medium"
                            style={{ color: '#166534', fontFamily: 'var(--font-body)' }}
                          >
                            +${formatCurrency(r.amount)}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontFamily: 'var(--font-body)' }}
                          >
                            {METHOD_LABELS[r.method]}
                          </span>
                        </div>
                        {r.date && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            {new Date(r.date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                        {r.note && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            {r.note}
                          </p>
                        )}
                        {r.proofImageUrl && (
                          <a
                            href={r.proofImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs mt-1"
                            style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}
                          >
                            <ImageIcon className="size-3" />
                            Ver comprobante
                          </a>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => startEditReceived(r)}
                          className="flex items-center justify-center size-8 rounded-lg"
                          style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)' }}
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteReceived(r.id)}
                          className="flex items-center justify-center size-8 rounded-lg"
                          style={{ border: '1px solid #fca5a5', color: '#991b1b' }}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Expenses */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Gastos ({expenses.length})
            </p>
            <p className="text-sm font-medium" style={{ color: '#991b1b', fontFamily: 'var(--font-body)' }}>
              -${formatCurrency(totalSpent)}
            </p>
          </div>

          {expenses.length === 0 ? (
            <EmptyState label="Sin gastos registrados" />
          ) : (
            <div className="space-y-2">
              {expenses.map(exp => (
                <div
                  key={exp.id}
                  className="rounded-2xl p-4"
                  style={{ background: 'white', border: `1px solid ${exp.isWithoutSupport ? '#fde68a' : 'var(--tqf-beige-border)'}` }}
                >
                  {editExpense?.id === exp.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            Monto
                          </label>
                          <input
                            type="number"
                            value={editExpense.amount}
                            onChange={e => setEditExpense(v => v && { ...v, amount: e.target.value })}
                            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                            style={{ border: '1px solid var(--tqf-beige-border)', background: 'var(--tqf-beige)', fontFamily: 'var(--font-body)' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            Fecha
                          </label>
                          <input
                            type="date"
                            value={editExpense.date}
                            onChange={e => setEditExpense(v => v && { ...v, date: e.target.value })}
                            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                            style={{ border: '1px solid var(--tqf-beige-border)', background: 'var(--tqf-beige)', fontFamily: 'var(--font-body)' }}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                          Método
                        </label>
                        <select
                          value={editExpense.method}
                          onChange={e => setEditExpense(v => v && { ...v, method: e.target.value as PaymentMethod })}
                          className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                          style={{ border: '1px solid var(--tqf-beige-border)', background: 'var(--tqf-beige)', fontFamily: 'var(--font-body)' }}
                        >
                          {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map(m => (
                            <option key={m} value={m}>{METHOD_LABELS[m]}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                          Nota
                        </label>
                        <input
                          type="text"
                          value={editExpense.note}
                          onChange={e => setEditExpense(v => v && { ...v, note: e.target.value })}
                          placeholder="Opcional"
                          className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                          style={{ border: '1px solid var(--tqf-beige-border)', background: 'var(--tqf-beige)', fontFamily: 'var(--font-body)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                          Etiquetas (separadas por coma)
                        </label>
                        <input
                          type="text"
                          value={editExpense.tags}
                          onChange={e => setEditExpense(v => v && { ...v, tags: e.target.value })}
                          placeholder="Ej: flores, decoración"
                          className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                          style={{ border: '1px solid var(--tqf-beige-border)', background: 'var(--tqf-beige)', fontFamily: 'var(--font-body)' }}
                        />
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editExpense.isWithoutSupport}
                          onChange={e => setEditExpense(v => v && { ...v, isWithoutSupport: e.target.checked })}
                        />
                        <span className="text-sm" style={{ color: '#92400e', fontFamily: 'var(--font-body)' }}>
                          Sin justificativo
                        </span>
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={saveExpense}
                          disabled={saving}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm"
                          style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
                        >
                          {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditExpense(null)}
                          className="flex items-center justify-center px-3 py-2 rounded-xl"
                          style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)' }}
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-base font-medium"
                            style={{ color: '#991b1b', fontFamily: 'var(--font-body)' }}
                          >
                            -${formatCurrency(exp.amount)}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5', fontFamily: 'var(--font-body)' }}
                          >
                            {METHOD_LABELS[exp.method]}
                          </span>
                          {exp.isWithoutSupport && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', fontFamily: 'var(--font-body)' }}
                            >
                              Sin justificativo
                            </span>
                          )}
                        </div>
                        {exp.date && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            {new Date(exp.date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                        {exp.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {exp.tags.map(tag => (
                              <span
                                key={tag}
                                className="text-xs px-1.5 py-0.5 rounded"
                                style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {exp.note && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            {exp.note}
                          </p>
                        )}
                        {exp.receiptImageUrl && (
                          <a
                            href={exp.receiptImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs mt-1"
                            style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}
                          >
                            <ImageIcon className="size-3" />
                            Ver recibo
                          </a>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => startEditExpense(exp)}
                          className="flex items-center justify-center size-8 rounded-lg"
                          style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)' }}
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="flex items-center justify-center size-8 rounded-lg"
                          style={{ border: '1px solid #fca5a5', color: '#991b1b' }}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div
      className="rounded-2xl p-5 text-center"
      style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
    >
      <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
        {label}
      </p>
    </div>
  );
}
