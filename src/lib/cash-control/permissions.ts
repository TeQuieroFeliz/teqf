import { CashControlRole } from './types';

export function hasCashControlAccess(role: CashControlRole | null): boolean {
  return role === 'admin' || role === 'team';
}

export function isCashControlAdmin(role: CashControlRole | null): boolean {
  return role === 'admin';
}

export function isCashControlTeam(role: CashControlRole | null): boolean {
  return role === 'team';
}
