// 'use server';

// import { firestore } from '@/firebase/server';
// import { revalidatePath } from 'next/cache';

// export const deleteSubEvent = async (
//   id: string,
//   role: string,
//   eventId: any
// ) => {
//   try {
//     const redirectRole =
//       role === 'admin' || role === 'manager' ? 'admin' : 'user';
//     await firestore.collection('sub-events').doc(id).delete();

//     revalidatePath(`/${redirectRole}-dashboard/events/${eventId}`);
//   } catch (error: any) {
//     console.log(error);
//     return {
//       error: true,
//       message: error.message || 'Something went wrong while deleting subevent',
//     };
//   }
// };
import { db } from '@/firebase/client';
import { deleteDoc, doc } from 'firebase/firestore';

export const deleteSubEvent = async (
  id: string,
  role: string, // These arguments are unused but kept for type consistency
  eventId: any
) => {
  try {
    const docRef = doc(db, 'sub-events', id);
    console.log({ docId: docRef.id, id });
    await deleteDoc(docRef);
  } catch (error: any) {
    console.error('Firebase delete error:', error);
    // ✅ CORRECTED: Throw the error so React Query's `onError` can catch it.
    throw new Error(
      error.message || 'Something went wrong while deleting sub-event'
    );
  }
};
