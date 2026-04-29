'use server';

import { firestore } from '@/firebase/server';
import { requireRole } from '@/lib/utils';
import { revalidatePath } from 'next/cache';

export const deleteProduct = async (id: string, userId: string) => {
  const { error, message } = await requireRole(userId, ['admin', 'manager']);

  if (error) {
    return { error, message };
  }

  try {
    await firestore.collection('products').doc(id).delete();
    revalidatePath('/admin-dashboard/products');
  } catch (error) {
    console.log(error);
    return { error: true, message: 'Some thing went wrong' };
  }
};

export const deleteProductUserSide = async (id: string) => {
  try {
    await firestore.collection('products-user').doc(id).delete();
    revalidatePath('/user-dashboard/products');
  } catch (error) {
    console.log(error);
    return { error: true, message: 'Some thing went wrong' };
  }
};
