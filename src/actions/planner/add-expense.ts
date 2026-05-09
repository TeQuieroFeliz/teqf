'use server';

import { firestore } from '@/firebase/server';

export async function addExpense(
  eventId: string,
  data: {
    type: 'expense' | 'anticipo';
    amount: number;
    category: string;
    note: string;
    method?: 'efectivo' | 'transferencia';
    createdBy: string;
    createdByName: string;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const col = firestore.collection('plannerEvents').doc(eventId).collection('expenses');
    const docRef = await col.add({ ...data, timestamp: new Date().toISOString() });
    return { success: true, id: docRef.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
