'use client';

import { EventBalance } from '@/lib/cash-control/types';
import { formatCurrency } from '@/lib/cash-control/calculations';

interface Props {
  balance: EventBalance;
}

export function SummaryCards({ balance }: Props) {
  const { totalReceived, totalSpent, saldo, totalWithoutSupport } = balance;

  const saldoColor =
    saldo > 0 ? '#166534' : saldo < 0 ? '#991b1b' : 'var(--tqf-muted)';

  const saldoMessage =
    saldo > 0
      ? 'Por regresar a la empresa'
      : saldo < 0
      ? 'La empresa debe reembolsar al usuario'
      : 'Sin saldo pendiente';

  return (
    <div className="space-y-3">
      {/* Recibido + Gastado */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-2xl p-4"
          style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
        >
          <p
            className="text-xs uppercase tracking-wide mb-1.5"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
          >
            Recibido
          </p>
          <p
            className="text-xl font-semibold"
            style={{ color: '#166534', fontFamily: 'var(--font-body)' }}
          >
            ${formatCurrency(totalReceived)}
          </p>
        </div>

        <div
          className="rounded-2xl p-4"
          style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
        >
          <p
            className="text-xs uppercase tracking-wide mb-1.5"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
          >
            Gastado
          </p>
          <p
            className="text-xl font-semibold"
            style={{ color: '#991b1b', fontFamily: 'var(--font-body)' }}
          >
            ${formatCurrency(totalSpent)}
          </p>
        </div>
      </div>

      {/* Saldo */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
      >
        <p
          className="text-xs uppercase tracking-wide mb-1.5"
          style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
        >
          Saldo
        </p>
        <p
          className="text-2xl font-semibold"
          style={{ color: saldoColor, fontFamily: 'var(--font-body)' }}
        >
          {saldo < 0 ? '-' : ''}${formatCurrency(Math.abs(saldo))}
        </p>
        <p
          className="text-xs mt-1"
          style={{ color: saldoColor, fontFamily: 'var(--font-body)', opacity: 0.85 }}
        >
          {saldoMessage}
        </p>
      </div>

      {/* Sin respaldo warning */}
      {totalWithoutSupport > 0 && (
        <div
          className="rounded-2xl px-4 py-3"
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
          }}
        >
          <p
            className="text-xs"
            style={{ color: '#92400e', fontFamily: 'var(--font-body)' }}
          >
            Gastos sin respaldo: ${formatCurrency(totalWithoutSupport)}
          </p>
        </div>
      )}
    </div>
  );
}
