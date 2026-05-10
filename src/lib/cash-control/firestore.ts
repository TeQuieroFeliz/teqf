import { db } from '@/firebase/client';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  limit,
  addDoc,
  updateDoc,
  serverTimestamp,
  Unsubscribe,
  DocumentData,
  QuerySnapshot,
} from 'firebase/firestore';

function withTimeout<T>(promise: Promise<T>, ms = 12000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('La operación tardó demasiado. Verifica tu conexión.')), ms)
    ),
  ]);
}
import {
  CashControlProfile,
  CashControlEvent,
  CashControlAssignment,
  MoneyReceived,
  Expense,
  CashControlClosure,
  EventBalance,
  TransactionRow,
  PaymentMethod,
} from './types';

// ─── Collection references ────────────────────────────────────────────────────

export const profilesCol    = () => collection(db, 'cashControlProfiles');
export const eventsCol      = () => collection(db, 'cashControlEvents');
export const assignmentsCol = () => collection(db, 'cashControlAssignments');
export const receivedCol    = () => collection(db, 'cashControlMoneyReceived');
export const expensesCol    = () => collection(db, 'cashControlExpenses');
export const closuresCol    = () => collection(db, 'cashControlClosures');
export const auditCol       = () => collection(db, 'cashControlAudit');

// ─── Profiles ─────────────────────────────────────────────────────────────────

export async function getCashControlProfile(uid: string): Promise<CashControlProfile | null> {
  const snap = await getDoc(doc(db, 'cashControlProfiles', uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as CashControlProfile;
}

export async function getTeamProfiles(): Promise<CashControlProfile[]> {
  const snap = await getDocs(query(profilesCol(), where('role', '==', 'team')));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as CashControlProfile));
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function getAllEvents(): Promise<CashControlEvent[]> {
  const snap = await getDocs(eventsCol());
  const events = snap.docs.map(d => ({ id: d.id, ...d.data() } as CashControlEvent));
  return events.sort((a, b) => {
    const aMs = (a.createdAt as any)?.toMillis?.() ?? 0;
    const bMs = (b.createdAt as any)?.toMillis?.() ?? 0;
    return bMs - aMs;
  });
}

export async function getEvent(eventId: string): Promise<CashControlEvent | null> {
  const snap = await getDoc(doc(db, 'cashControlEvents', eventId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as CashControlEvent;
}

export async function createEvent(data: {
  eventCode: string;
  eventName: string;
  eventDate: string;
  location: string;
  createdBy: string;
}): Promise<string> {
  const ref = await addDoc(eventsCol(), {
    ...data,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEventStatus(eventId: string, status: 'active' | 'closed'): Promise<void> {
  await updateDoc(doc(db, 'cashControlEvents', eventId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

// ─── Assignments ──────────────────────────────────────────────────────────────

export async function getAssignedEvents(uid: string): Promise<CashControlEvent[]> {
  const snap = await getDocs(
    query(assignmentsCol(), where('userId', '==', uid))
  );
  const eventIds = snap.docs.map(d => d.data().eventId as string);
  if (eventIds.length === 0) return [];

  const events: CashControlEvent[] = [];
  for (const id of eventIds) {
    const ev = await getEvent(id);
    if (ev) events.push(ev);
  }
  return events;
}

export async function getEventAssignments(eventId: string): Promise<CashControlAssignment[]> {
  const snap = await getDocs(
    query(assignmentsCol(), where('eventId', '==', eventId))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CashControlAssignment));
}

export async function isUserAssignedToEvent(uid: string, eventId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'cashControlAssignments', `${uid}_${eventId}`));
  return snap.exists();
}

export async function assignUserToEvent(uid: string, eventId: string): Promise<void> {
  const ref = doc(db, 'cashControlAssignments', `${uid}_${eventId}`);
  const existing = await getDoc(ref);
  if (existing.exists()) return;
  await setDoc(ref, { userId: uid, eventId, createdAt: serverTimestamp() });
}

export async function removeUserFromEvent(uid: string, eventId: string): Promise<void> {
  await deleteDoc(doc(db, 'cashControlAssignments', `${uid}_${eventId}`));
}

// ─── Money Received ───────────────────────────────────────────────────────────

export async function addMoneyReceived(data: {
  eventId: string;
  userId: string;
  amount: number;
  method: PaymentMethod;
  note: string | null;
  proofImageUrl: string | null;
  date: string;
  createdBy: string;
}): Promise<string> {
  const ref = await withTimeout(addDoc(receivedCol(), {
    ...data,
    createdAt: serverTimestamp(),
  }));
  return ref.id;
}

export async function updateMoneyReceived(
  id: string,
  data: { amount?: number; method?: PaymentMethod; note?: string | null; date?: string }
): Promise<void> {
  await updateDoc(doc(db, 'cashControlMoneyReceived', id), data);
}

export async function deleteMoneyReceived(id: string): Promise<void> {
  await deleteDoc(doc(db, 'cashControlMoneyReceived', id));
}

export function subscribeToMoneyReceived(
  eventId: string,
  userId: string,
  callback: (items: MoneyReceived[]) => void
): Unsubscribe {
  const q = query(
    receivedCol(),
    where('eventId', '==', eventId),
    where('userId', '==', userId),
  );
  return onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as MoneyReceived));
    items.sort((a, b) => ((b.createdAt as any)?.toMillis?.() ?? 0) - ((a.createdAt as any)?.toMillis?.() ?? 0));
    callback(items);
  });
}

export function subscribeToAllMoneyReceived(
  eventId: string,
  callback: (items: MoneyReceived[]) => void
): Unsubscribe {
  const q = query(
    receivedCol(),
    where('eventId', '==', eventId),
  );
  return onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as MoneyReceived));
    items.sort((a, b) => ((b.createdAt as any)?.toMillis?.() ?? 0) - ((a.createdAt as any)?.toMillis?.() ?? 0));
    callback(items);
  });
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function addExpense(data: {
  eventId: string;
  userId: string;
  amount: number;
  method: PaymentMethod;
  tags: string[];
  note: string | null;
  receiptImageUrl: string | null;
  isWithoutSupport: boolean;
  date: string;
  createdBy: string;
}): Promise<string> {
  const ref = await withTimeout(addDoc(expensesCol(), {
    ...data,
    createdAt: serverTimestamp(),
  }));
  return ref.id;
}

export async function updateExpense(
  id: string,
  data: { amount?: number; method?: PaymentMethod; tags?: string[]; note?: string | null; date?: string; isWithoutSupport?: boolean }
): Promise<void> {
  await updateDoc(doc(db, 'cashControlExpenses', id), data);
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, 'cashControlExpenses', id));
}

export function subscribeToExpenses(
  eventId: string,
  userId: string,
  callback: (items: Expense[]) => void
): Unsubscribe {
  const q = query(
    expensesCol(),
    where('eventId', '==', eventId),
    where('userId', '==', userId),
  );
  return onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense));
    items.sort((a, b) => ((b.createdAt as any)?.toMillis?.() ?? 0) - ((a.createdAt as any)?.toMillis?.() ?? 0));
    callback(items);
  });
}

export function subscribeToAllExpenses(
  eventId: string,
  callback: (items: Expense[]) => void
): Unsubscribe {
  const q = query(
    expensesCol(),
    where('eventId', '==', eventId),
  );
  return onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense));
    items.sort((a, b) => ((b.createdAt as any)?.toMillis?.() ?? 0) - ((a.createdAt as any)?.toMillis?.() ?? 0));
    callback(items);
  });
}

// ─── Closures ─────────────────────────────────────────────────────────────────

export async function getClosureForUserEvent(
  userId: string,
  eventId: string
): Promise<CashControlClosure | null> {
  const snap = await getDocs(
    query(
      closuresCol(),
      where('userId', '==', userId),
      where('eventId', '==', eventId)
    )
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as CashControlClosure;
}

export async function getAllClosuresForEvent(eventId: string): Promise<CashControlClosure[]> {
  const snap = await getDocs(
    query(closuresCol(), where('eventId', '==', eventId))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CashControlClosure));
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export async function writeAuditLog(data: {
  eventId: string | null;
  userId: string;
  action: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  await addDoc(auditCol(), { ...data, createdAt: serverTimestamp() });
}

// ─── Closure (live) ───────────────────────────────────────────────────────────

export function subscribeToClosureForUserEvent(
  userId: string,
  eventId: string,
  callback: (closure: CashControlClosure | null) => void
): Unsubscribe {
  const q = query(
    closuresCol(),
    where('userId', '==', userId),
    where('eventId', '==', eventId),
    limit(1)
  );
  return onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
    if (snap.empty) { callback(null); return; }
    callback({ id: snap.docs[0].id, ...snap.docs[0].data() } as CashControlClosure);
  });
}

// ─── Computed balance (live) ──────────────────────────────────────────────────

export function subscribeToEventBalance(
  eventId: string,
  userId: string,
  callback: (balance: EventBalance, transactions: TransactionRow[]) => void
): () => void {
  let received: MoneyReceived[] = [];
  let expenses: Expense[] = [];

  function emit() {
    const totalReceived = received.reduce((s, r) => s + r.amount, 0);
    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
    const totalWithoutSupport = expenses
      .filter(e => e.isWithoutSupport)
      .reduce((s, e) => s + e.amount, 0);

    const balance: EventBalance = {
      totalReceived,
      totalSpent,
      saldo: totalReceived - totalSpent,
      totalWithoutSupport,
    };

    const rows: TransactionRow[] = [
      ...received.map(r => ({
        id: r.id,
        kind: 'received' as const,
        amount: r.amount,
        method: r.method,
        tags: [],
        note: r.note,
        isWithoutSupport: false,
        date: r.date,
        createdAt: r.createdAt,
      })),
      ...expenses.map(e => ({
        id: e.id,
        kind: 'expense' as const,
        amount: e.amount,
        method: e.method,
        tags: e.tags,
        note: e.note,
        isWithoutSupport: e.isWithoutSupport,
        date: e.date,
        createdAt: e.createdAt,
      })),
    ].sort((a, b) => {
      const aMs = a.date
        ? new Date(a.date).getTime()
        : (a.createdAt?.toMillis?.() ?? 0);
      const bMs = b.date
        ? new Date(b.date).getTime()
        : (b.createdAt?.toMillis?.() ?? 0);
      if (bMs !== aMs) return bMs - aMs;
      return (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0);
    });

    callback(balance, rows);
  }

  const unsubR = subscribeToMoneyReceived(eventId, userId, items => {
    received = items;
    emit();
  });

  const unsubE = subscribeToExpenses(eventId, userId, items => {
    expenses = items;
    emit();
  });

  return () => {
    unsubR();
    unsubE();
  };
}
