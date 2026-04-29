'use server';

import { firestore } from '@/firebase/server';
import { UserType } from '@/lib/types';

type GetUserResponse =
  | { error: true; message: string; user: null }
  | { error: false; message?: string; user: UserType };

export const getUserById = async (id: string): Promise<GetUserResponse> => {
  if (!id) {
    return { error: true, message: 'User ID not found', user: null };
  }

  if (!firestore) return { error: true, message: 'Database non disponibile', user: null };
  const res = await firestore.collection('users').doc(id).get();
  if (!res.exists) {
    return { error: true, message: 'User not found', user: null };
  }
  const { role, status, createdAt } = res.data() as UserType;
  const user = {
    id: res.id,
    ...res.data(),
    role: role?.toLowerCase() ?? 'client',
    status: status
      ? status
      : role === 'admin' || role === 'manager'
        ? 'approved'
        : 'pending',
    createdAt: createdAt?.toDate?.().toISOString(),
  } as UserType;
  return { error: false, user };
};
