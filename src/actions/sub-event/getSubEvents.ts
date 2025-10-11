// 'use server';
// import { firestore } from '@/firebase/server';
// import { SubEventDBWithId } from '@/lib/schemas/SubEventSchema';

// export const getSubEvents = async (id: string, userId: string) => {
//   const res = await firestore
//     .collection('sub-events')
//     .where('eventId', '==', id)
//     .where('userId', '==', userId)
//     .get();
//   const data = res.docs.map((doc) => {
//     const jsDate = doc.data().date.toDate().toISOString();

//     return { id: doc.id, ...doc.data(), date: jsDate } as SubEventDBWithId;
//   });
//   return data;
// };

'use client';

import { db } from '@/firebase/client';
import { SubEventDBWithId } from '@/lib/schemas/SubEventSchema';
import { collection, getDocs, query, where } from 'firebase/firestore';
export const getSubEvents = async (id: string, userId: string) => {
  try {
    const q = query(
      collection(db, 'sub-events'),
      where('eventId', '==', id),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);

    const data: SubEventDBWithId[] = snapshot.docs.map((doc) => {
      const raw = doc.data();
      const jsDate = raw.date?.toDate().toISOString();

      return {
        id: doc.id,
        ...raw,
        date: jsDate,
      } as SubEventDBWithId;
    });

    return data;
  } catch (error) {
    console.log(error);
    return [];
  }
};
