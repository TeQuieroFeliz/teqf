'use server';

import { firestore } from '@/firebase/server';

export type Expense = {
  id: string;
  type: 'expense' | 'anticipo';
  amount: number;
  category: string;
  note: string;
  method?: 'efectivo' | 'transferencia';
  createdBy: string;
  createdByName: string;
  timestamp: string;
};

export async function getExpenses(eventId: string): Promise<Expense[]> {
  const snap = await firestore
    .collection('plannerEvents')
    .doc(eventId)
    .collection('expenses')
    .orderBy('timestamp', 'asc')
    .get();
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Expense, 'id'>) }));
}
