'use server';

import { firestore } from '@/firebase/server';
import {
  CashControlCategory,
  CashMovement,
  CashPaymentMethod,
} from '@/lib/planner-types';

function movCol(eventId: string) {
  return firestore
    .collection('plannerEvents')
    .doc(eventId)
    .collection('cashControl');
}

function eventRef(eventId: string) {
  return firestore.collection('plannerEvents').doc(eventId);
}

// ── Add movement ──────────────────────────────────────────────────────────────

export async function addCashMovement(
  eventId: string,
  data: {
    amount: number;
    paymentMethod: CashPaymentMethod;
    category: CashControlCategory;
    note?: string;
    registeredBy: string;
    registeredByName: string;
    date: string;
    time: string;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const now = new Date().toISOString();
    // Derive epoch from date+time so ordering is correct
    const timestamp = new Date(`${data.date}T${data.time}:00`).getTime();
    const docRef = await movCol(eventId).add({
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      category: data.category,
      note: data.note ?? '',
      registeredBy: data.registeredBy,
      registeredByName: data.registeredByName,
      date: data.date,
      time: data.time,
      timestamp,
      receiptUrl: '',
      status: 'pending',
      createdAt: now,
    });
    return { success: true, id: docRef.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Update movement (date/time/fields) ────────────────────────────────────────

export async function updateCashMovement(
  eventId: string,
  movementId: string,
  data: Partial<{
    amount: number;
    paymentMethod: CashPaymentMethod;
    category: CashControlCategory;
    note: string;
    date: string;
    time: string;
    receiptUrl: string;
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const updates: Record<string, any> = { ...data };
    if (data.date !== undefined || data.time !== undefined) {
      const snap = await movCol(eventId).doc(movementId).get();
      const existing = snap.data() as any;
      const date = data.date ?? existing.date;
      const time = data.time ?? existing.time;
      updates.timestamp = new Date(`${date}T${time}:00`).getTime();
    }
    await movCol(eventId).doc(movementId).update(updates);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Approve movement (SuperAdmin only) ────────────────────────────────────────

export async function approveCashMovement(
  eventId: string,
  movementId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await movCol(eventId).doc(movementId).update({ status: 'approved' });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Delete movement (SuperAdmin only) ─────────────────────────────────────────

export async function deleteCashMovement(
  eventId: string,
  movementId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await movCol(eventId).doc(movementId).delete();
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Set budget (SuperAdmin only) ──────────────────────────────────────────────

export async function updateEventCashBudget(
  eventId: string,
  budget: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await eventRef(eventId).update({ cashControlBudget: budget });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
