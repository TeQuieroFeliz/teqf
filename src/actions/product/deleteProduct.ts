'use server';

import { auth, firestore } from '@/firebase/server';
import { revalidatePath } from 'next/cache';

export const deleteProduct = async (id: string, token: string) => {
  const verifiedToken = await auth.verifyIdToken(token);

  if (verifiedToken.role !== 'ADMIN') {
    return { error: true, message: 'Unauthorized' };
  }

  try {
    await firestore.collection('products').doc(id).delete();
    revalidatePath('/admin-dashboard/products');
  } catch (error) {
    console.log(error);
    return { error: true, message: 'Some thing went wrong' };
  }
};
