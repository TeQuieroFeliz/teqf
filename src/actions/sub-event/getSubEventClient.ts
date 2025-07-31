'use server';

import { auth, firestore } from '@/firebase/server';
import { SubEventDBWithId } from '@/lib/schemas/SubEventSchema';

export const getSubEventsClient = async (id: string) => {
  const res = await firestore
    .collection('sub-events')
    .where('eventId', '==', id)
    .get();

  const data = res.docs.map((doc) => {
    const jsDate = doc.data().date.toDate().toISOString();

    return { id: doc.id, ...doc.data(), date: jsDate } as SubEventDBWithId;
  });
  return data;
};
