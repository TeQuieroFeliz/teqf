'use client';

import { TransactionRow } from '@/lib/cash-control/types';
import { formatCurrency } from '@/lib/cash-control/calculations';
import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface Props {
  transactions: TransactionRow[];
  maxVisible?: number;
  onEdit?: (row: TransactionRow) => void;
  onDelete?: (row: TransactionRow) => void;
}

const METHOD_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
};

function formatDate(date: string | undefined, fallback: Timestamp | null | undefined): string {
  if (date) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
    });
  }
  if (fallback?.toMillis) {
    return new Date(fallback.toMillis()).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
    });
  }
  return '';
}

export function TransactionList({ transactions, maxVisible = 5, onEdit, onDelete }: Props) {
  const visible = transactions.slice(0, maxVisible);

  if (visible.length === 0) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
      >
        <p
          className="text-sm"
          style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
        >
          Sin movimientos aún.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {visible.map(row => {
        const isReceived = row.kind === 'received';
        return (
          <div
            key={row.id}
            className="flex items-start gap-3 rounded-2xl p-4"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
          >
            <div
              className="size-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{
                background: isReceived ? '#f0fdf4' : '#fef2f2',
                color: isReceived ? '#166534' : '#991b1b',
              }}
            >
              {isReceived ? (
                <ArrowDownLeft className="size-4" />
              ) : (
                <ArrowUpRight className="size-4" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p
                  className="text-base font-semibold"
                  style={{
                    color: isReceived ? '#166534' : '#991b1b',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {isReceived ? '+' : '-'}${formatCurrency(row.amount)}
                </p>
                <p
                  className="text-xs flex-shrink-0"
                  style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
                >
                  {formatDate(row.date, row.createdAt)}
                </p>
              </div>

              <div className="flex items-center flex-wrap gap-1.5 mt-1">
                {/* Method */}
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: 'var(--tqf-beige)',
                    color: 'var(--tqf-muted)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {METHOD_LABEL[row.method] ?? row.method}
                </span>

                {/* Tags */}
                {row.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: 'var(--tqf-cipria-light)',
                      color: 'var(--tqf-bordeaux)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {tag}
                  </span>
                ))}

                {/* Sin respaldo badge */}
                {row.isWithoutSupport && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: '#fffbeb',
                      color: '#92400e',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    Sin respaldo
                  </span>
                )}
              </div>

              {/* Note */}
              {row.note && (
                <p
                  className="text-xs mt-1 truncate"
                  style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
                >
                  {row.note}
                </p>
              )}
            </div>

            {(onEdit || onDelete) && (
              <div className="flex flex-col gap-1.5 flex-shrink-0 mt-0.5">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(row)}
                    className="size-8 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70 active:scale-95"
                    style={{
                      color: 'var(--tqf-bordeaux)',
                      background: 'var(--tqf-cipria-light)',
                      border: '1px solid var(--tqf-beige-border)',
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(row)}
                    className="size-8 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70 active:scale-95"
                    style={{
                      color: '#991b1b',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
