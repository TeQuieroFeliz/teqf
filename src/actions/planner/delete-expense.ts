'use server';

import { firestore } from '@/firebase/server';

export async function deleteExpense(
  eventId: string,
  expenseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await firestore
      .collection('plannerEvents')
      .doc(eventId)
      .collection('expenses')
      .doc(expenseId)
      .delete();
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
