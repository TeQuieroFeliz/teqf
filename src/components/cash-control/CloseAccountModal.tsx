'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { EventBalance } from '@/lib/cash-control/types';
import { formatCurrency, getBalanceMessage } from '@/lib/cash-control/calculations';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { auth } from '@/firebase/client';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirmed: () => void;
  eventCode: string;
  userName: string;
  balance: EventBalance;
  eventId: string;
  userId: string;
}

export function CloseAccountModal({
  open,
  onClose,
  onConfirmed,
  eventCode,
  userName,
  balance,
  eventId,
  userId,
}: Props) {
  const [closing, setClosing] = useState(false);

  async function handleConfirm() {
    setClosing(true);
    try {
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) throw new Error('Sin sesión activa.');

      const res = await fetch('/api/cash-control/close-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId,
          userId,
          closedBy: userId,
          totalReceived: balance.totalReceived,
          totalSpent: balance.totalSpent,
          finalBalance: balance.saldo,
          totalWithoutSupport: balance.totalWithoutSupport,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al cerrar.');

      toast.success('Cuenta cerrada correctamente.');
      onConfirmed();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado.';
      toast.error(msg);
    } finally {
      setClosing(false);
    }
  }

  const { totalReceived, totalSpent, saldo, totalWithoutSupport } = balance;

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl"
        style={{ background: 'var(--tqf-beige)', border: 'none', padding: 0 }}
      >
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--tqf-dark)',
              fontWeight: 400,
              fontSize: '1.4rem',
            }}
          >
            Cerrar cuenta
          </SheetTitle>
        </SheetHeader>

        <div className="px-6 py-4 space-y-4">
          {/* Event + user */}
          <div
            className="rounded-2xl p-4 space-y-1"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              <span style={{ color: 'var(--tqf-dark)', fontWeight: 500 }}>Evento: </span>
              {eventCode}
            </p>
            <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              <span style={{ color: 'var(--tqf-dark)', fontWeight: 500 }}>Usuario: </span>
              {userName}
            </p>
          </div>

          {/* Balance summary */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
          >
            {[
              { label: 'Total recibido', value: totalReceived, color: '#166534' },
              { label: 'Total gastado', value: totalSpent, color: '#991b1b' },
              {
                label: 'Saldo final',
                value: saldo,
                color: saldo >= 0 ? '#166534' : '#991b1b',
                bold: true,
              },
              {
                label: 'Sin respaldo',
                value: totalWithoutSupport,
                color: totalWithoutSupport > 0 ? '#92400e' : 'var(--tqf-muted)',
              },
            ].map(({ label, value, color, bold }, i, arr) => (
              <div
                key={label}
                className="flex items-center justify-between px-4 py-3"
                style={{
                  borderBottom:
                    i < arr.length - 1
                      ? '1px solid var(--tqf-beige-border)'
                      : 'none',
                }}
              >
                <span
                  className="text-sm"
                  style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
                >
                  {label}
                </span>
                <span
                  className="text-sm"
                  style={{
                    color,
                    fontFamily: 'var(--font-body)',
                    fontWeight: bold ? 600 : 400,
                  }}
                >
                  {value < 0 ? '-' : ''}${formatCurrency(Math.abs(value))}
                </span>
              </div>
            ))}
          </div>

          {/* Balance message */}
          <p
            className="text-sm font-medium text-center"
            style={{
              color:
                saldo > 0 ? '#166534' : saldo < 0 ? '#991b1b' : 'var(--tqf-muted)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {getBalanceMessage(saldo)}
          </p>

          {/* Unsupported warning */}
          {totalWithoutSupport > 0 && (
            <div
              className="flex items-start gap-3 rounded-xl p-4"
              style={{ background: '#fffbeb', border: '1px solid #fde68a' }}
            >
              <AlertTriangle
                className="size-4 flex-shrink-0 mt-0.5"
                style={{ color: '#92400e' }}
              />
              <p
                className="text-sm"
                style={{ color: '#92400e', fontFamily: 'var(--font-body)' }}
              >
                Atención: hay ${formatCurrency(totalWithoutSupport)} en gastos sin respaldo.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div
          className="px-6 pb-8 pt-2 space-y-3"
          style={{ background: 'var(--tqf-beige)' }}
        >
          <button
            type="button"
            onClick={handleConfirm}
            disabled={closing}
            className="w-full py-4 rounded-2xl text-base flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 active:scale-[0.98]"
            style={{ background: '#991b1b', color: 'white', fontFamily: 'var(--font-body)' }}
          >
            {closing ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              'Confirmar cierre'
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={closing}
            className="w-full py-4 rounded-2xl text-base transition-opacity disabled:opacity-50"
            style={{
              border: '1.5px solid var(--tqf-beige-border)',
              color: 'var(--tqf-muted)',
              fontFamily: 'var(--font-body)',
              background: 'white',
            }}
          >
            Volver
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
