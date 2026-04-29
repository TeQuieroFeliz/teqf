'use server';

import { auth, firestore } from '@/firebase/server';
import { revalidatePath } from 'next/cache';

export const deleteUser = async (userId: string) => {
  if (!userId) {
    console.log('User Id not found');
    return;
  }
  try {
    await auth.deleteUser(userId);
    await firestore.collection('users').doc(userId).delete();
    revalidatePath('/admin-dashboard/users');
  } catch (error) {
    console.log(error);
  }
};
