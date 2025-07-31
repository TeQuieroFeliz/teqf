'use server';
import { cookies } from 'next/headers';

export const removeToken = async () => {
  const cookieStore = await cookies();
  cookieStore.delete('firebaseAuthToken');
  cookieStore.delete('firebaseAuthRefreshToken');
};
