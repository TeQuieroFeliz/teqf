'use server';

import { auth, firestore } from '@/firebase/server';
import { SubEventDb, SubEventFormSchema } from '@/lib/schemas/SubEventSchema';
import { revalidatePath } from 'next/cache';

export const addSubEvent = async (formData: SubEventDb, token: string) => {
  const verifiedToken = await auth.verifyIdToken(token);
  if (!verifiedToken) {
    return { error: true, message: 'Unauthorized' };
  }

  const validations = SubEventFormSchema.safeParse(formData);
  if (!validations.success) {
    return { error: true, message: 'Validations failed' };
  }

  if (!formData.items.length) {
    return { error: true, message: 'Atleast add one item to create sub event' };
  }

  try {
    await firestore
      .collection('sub-events')
      .add({ ...formData, userId: verifiedToken.uid });
    revalidatePath(`/user-dashboard/event/${formData.eventId}`);
    return { error: false, message: 'Sub Event Created' };
  } catch (error: any) {
    return {
      error: true,
      message: error.message || 'Something went wrong while creating sub event',
    };
  }
};
