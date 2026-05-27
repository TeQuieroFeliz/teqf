import { Timestamp } from 'firebase/firestore';

export type CashControlRole = 'admin' | 'team';

export type PaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta';

export type EventStatus = 'active' | 'closed';

export interface CashControlProfile {
  uid: string;
  fullName: string;
  email: string;
  role: CashControlRole;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CashControlEventType = 'evento' | 'gastos';

export interface CashControlEvent {
  id: string;
  eventCode: string;
  eventName: string;
  eventDate: string;
  location: string;
  eventType: CashControlEventType;
  status: EventStatus;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CashControlAssignment {
  id: string;
  userId: string;
  eventId: string;
  canWrite?: boolean;
  createdAt: Timestamp;
}

export interface MoneyReceived {
  id: string;
  eventId: string;
  userId: string;
  amount: number;
  method: PaymentMethod;
  note: string | null;
  proofImageUrl: string | null;
  uploadStatus?: 'pending' | 'uploaded' | 'failed' | null;
  date?: string; // YYYY-MM-DD, user-set date of the movement
  createdAt: Timestamp;
  createdBy: string;
}

export interface Expense {
  id: string;
  eventId: string;
  userId: string;
  amount: number;
  method: PaymentMethod;
  tags: string[];
  note: string | null;
  receiptImageUrl: string | null;
  uploadStatus?: 'pending' | 'uploaded' | 'failed' | null;
  isWithoutSupport: boolean;
  date?: string; // YYYY-MM-DD, user-set date of the movement
  createdAt: Timestamp;
  createdBy: string;
}

export interface CashControlClosure {
  id: string;
  eventId: string;
  userId: string;
  closedBy: string;
  totalReceived: number;
  totalSpent: number;
  finalBalance: number;
  totalWithoutSupport: number;
  emailSent: boolean;
  isReopened: boolean;
  closedAt: Timestamp;
  reopenedAt: Timestamp | null;
  reopenedBy: string | null;
}

export interface AuditLog {
  id: string;
  eventId: string | null;
  userId: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: Timestamp;
}

export interface EventBalance {
  totalReceived: number;
  totalSpent: number;
  saldo: number;
  totalWithoutSupport: number;
}

// UI type for a transaction row (either received or expense)
export type TransactionKind = 'received' | 'expense';

export interface TransactionRow {
  id: string;
  kind: TransactionKind;
  amount: number;
  method: PaymentMethod;
  tags: string[];
  note: string | null;
  isWithoutSupport: boolean;
  receiptImageUrl?: string | null;
  proofImageUrl?: string | null;
  uploadStatus?: 'pending' | 'uploaded' | 'failed' | null;
  date?: string; // YYYY-MM-DD
  createdAt: Timestamp;
  userId?: string;
  userName?: string;
}

export interface UserEventSummary {
  userId: string;
  totalReceived: number;
  totalSpent: number;
  /** positive = user received more than spent (must return to company); negative = company owes user */
  netBalance: number;
  transactions: TransactionRow[];
}
