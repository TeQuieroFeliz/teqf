'use server';

import { firestore } from '@/firebase/server';

type Res = {
  id: string;
  role: 'ADMIN' | 'CLIENT';
};

type GetUserResponse =
  | { error: true; message: string; user: null }
  | { error: false; message?: string; user: Res };

export const getUser = async (id: string): Promise<GetUserResponse> => {
  if (!id) {
    return { error: true, message: 'User ID not found', user: null };
  }

  const res = await firestore.collection('users').doc(id).get();
  if (!res.exists) {
    return { error: true, message: 'User not found', user: null };
  }
  const user = { id: res.id, role: res.data()!.role } as Res;
  return { error: false, user };
};
