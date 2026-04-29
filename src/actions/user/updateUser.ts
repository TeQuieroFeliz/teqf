'use server';

import { firestore } from '@/firebase/server';
import { UserType } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export const updateUser = async ({
  userId,
  updatedData,
}: {
  userId: string;
  updatedData: Partial<UserType>;
}) => {
  try {
    await firestore.collection('users').doc(userId).update(updatedData);
    revalidatePath('/admin-dashboard/users');
  } catch (error) {
    console.log(error);
  }
};
