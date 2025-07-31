'use server';

import { auth, firestore } from '@/firebase/server';
import { revalidatePath } from 'next/cache';

export const deleteSubEvent = async (id: string, token: string) => {
  const verifiedToken = await auth.verifyIdToken(token);
  if (!verifiedToken) {
    return { error: true, message: 'Unauthorized' };
  }

  try {
    await firestore.collection('sub-events').doc(id).delete();
    revalidatePath(`/user-dashboard/event/${id}`);
  } catch (error: any) {
    console.log(error);
    return {
      error: true,
      message: error.message || 'Something went wrong while deleting subevent',
    };
  }
};
