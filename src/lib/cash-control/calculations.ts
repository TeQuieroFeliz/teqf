import { EventBalance } from './types';

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function calculateBalance(
  totalReceived: number,
  totalSpent: number,
  totalWithoutSupport: number = 0
): EventBalance {
  return {
    totalReceived,
    totalSpent,
    saldo: totalReceived - totalSpent,
    totalWithoutSupport,
  };
}

export function getBalanceMessage(saldo: number): string {
  if (saldo > 0) return `El usuario debe regresar: $${formatCurrency(saldo)}`;
  if (saldo === 0) return 'Cuenta sin saldo pendiente.';
  return `La empresa debe reembolsar al usuario: $${formatCurrency(Math.abs(saldo))}`;
}

export function getBalanceColor(saldo: number): string {
  if (saldo > 0) return '#166534'; // green-800
  if (saldo === 0) return 'var(--tqf-muted)';
  return '#991b1b'; // red-800
}
