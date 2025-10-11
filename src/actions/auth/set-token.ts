'use server';

import { auth } from '@/firebase/server';
import { getUserById } from './get-user';
import { cookies } from 'next/headers';

export const setToken = async ({
  token,
  refreshToken,
}: {
  token: string;
  refreshToken: string;
}) => {
  try {
    const verifiedToken = await auth.verifyIdToken(token);

    if (!verifiedToken) {
      return;
    }

    const userRecordFromDB = await getUserById(verifiedToken.uid);
    if (!userRecordFromDB.user) {
      console.log({ error: 'User is not found in DB' });
      return;
    }
    await auth.setCustomUserClaims(verifiedToken.uid, {
      role: userRecordFromDB.user.role,
    });
    const cookieStore = await cookies();
    cookieStore.set('firebaseAuthToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });
    cookieStore.set('firebaseAuthRefreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });
  } catch (error) {
    console.log(error);
  }
};
