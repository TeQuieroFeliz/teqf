'use server';
import { firestore } from '@/firebase/server';
import { UserType } from '@/lib/types';

export const getUserWithoutAdmin = async () => {
  try {
    const res = await firestore
      .collection('users')
      .where('role', '!=', 'admin')
      .orderBy('createdAt', 'desc')
      .get();

    return res.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.toDate?.()?.toISOString(),
    })) as UserType[];
  } catch (error) {
    console.log(error);
    return [];
  }
};
