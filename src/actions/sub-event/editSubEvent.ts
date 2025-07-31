'use server';

import { auth, firestore } from '@/firebase/server';
import { SubEventDb, SubEventFormSchema } from '@/lib/schemas/SubEventSchema';
import { revalidatePath } from 'next/cache';

type Parameters = {
  formData: SubEventDb;
  token: string;
  id: string;
};

export const editSubEvent = async ({ formData, token, id }: Parameters) => {
  const verifiedToken = auth.verifyIdToken(token);
  if (!verifiedToken) {
    return { error: true, message: 'Unauthorized' };
  }

  const validations = SubEventFormSchema.safeParse(formData);
  if (!validations.success) {
    return { error: true, message: 'Validations failed' };
  }

  try {
    await firestore.collection('sub-events').doc(id).update(formData);
    revalidatePath(`/user-dashboard/event/${formData.eventId}`);
    return { error: false, message: 'Sub Event Edited' };
  } catch (error: any) {
    return {
      error: true,
      message: error.message || 'Something went wrong while editing sub event',
    };
  }
};
