// 'use server';

// import { auth, firestore } from '@/firebase/server';
// import { SubEventDb, SubEventFormSchema } from '@/lib/schemas/SubEventSchema';
// import { requireRole } from '@/lib/utils';
// import { revalidatePath } from 'next/cache';

// export const addSubEvent = async (
//   formData: SubEventDb,
//   userId: string,
//   role: string
// ) => {
//   const redirectRole =
//     role === 'admin' || role === 'manager' ? 'admin' : 'user';
//   const validations = SubEventFormSchema.safeParse(formData);
//   if (!validations.success) {
//     return { error: true, message: 'Validations failed' };
//   }

//   if (!formData.items.length) {
//     return { error: true, message: 'Atleast add one item to create sub event' };
//   }

//   try {
//     await firestore.collection('sub-events').add({ ...formData, userId });
//     revalidatePath(`/${redirectRole}-dashboard/events/${formData.eventId}`);
//     return { error: false, message: 'Sub Event Created' };
//   } catch (error: any) {
//     return {
//       error: true,
//       message: error.message || 'Something went wrong while creating sub event',
//     };
//   }
// };

import { db } from '@/firebase/client';
import { SubEventDb, SubEventFormSchema } from '@/lib/schemas/SubEventSchema';
import { addDoc, collection } from 'firebase/firestore';

export const addSubEvent = async (
  formData: SubEventDb,
  userId: string,
  role: string
) => {
  const redirectRole =
    role === 'admin' || role === 'manager' ? 'admin' : 'user';

  // Validate schema
  const validations = SubEventFormSchema.safeParse(formData);
  if (!validations.success) {
    return { error: true, message: 'Validations failed' };
  }

  if (!formData.items.length) {
    return {
      error: true,
      message: 'At least add one item to create sub event',
    };
  }

  try {
    await addDoc(collection(db, 'sub-events'), {
      ...formData,
      userId,
    });

    // ⚠️ revalidatePath is server-only → remove it
    // Instead, rely on React Query's invalidation after mutation

    return { error: false, message: 'Sub Event Created' };
  } catch (error: any) {
    return {
      error: true,
      message: error.message || 'Something went wrong while creating sub event',
    };
  }
};
