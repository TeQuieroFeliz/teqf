// 'use server';

// import { auth, firestore } from '@/firebase/server';
// import { SubEventDb, SubEventFormSchema } from '@/lib/schemas/SubEventSchema';
// import { revalidatePath } from 'next/cache';

// type Parameters = {
//   formData: SubEventDb;
//   id: string;
//   role: string;
// };

// export const editSubEvent = async ({ formData, id, role }: Parameters) => {
//   const redirectRole =
//     role === 'admin' || role === 'manager' ? 'admin' : 'user';
//   const validations = SubEventFormSchema.safeParse(formData);
//   if (!validations.success) {
//     return { error: true, message: 'Validations failed' };
//   }

//   try {
//     await firestore.collection('sub-events').doc(id).update(formData);
//     revalidatePath(`/${redirectRole}-dashboard/events/${formData.eventId}`);
//     return { error: false, message: 'Sub Event Edited' };
//   } catch (error: any) {
//     return {
//       error: true,
//       message: error.message || 'Something went wrong while editing sub event',
//     };
//   }
// };

import { db } from '@/firebase/client';
import { SubEventDb, SubEventFormSchema } from '@/lib/schemas/SubEventSchema';
import { doc, updateDoc } from 'firebase/firestore';

type Parameters = {
  formData: SubEventDb;
  id: string;
  role: string;
};

export const editSubEvent = async ({ formData, id, role }: Parameters) => {
  const validations = SubEventFormSchema.safeParse(formData);
  if (!validations.success) {
    return { error: true, message: 'Validations failed' };
  }

  try {
    const ref = doc(db, 'sub-events', id);
    await updateDoc(ref, formData);

    return { error: false, message: 'Sub Event Edited' };
  } catch (error: any) {
    return {
      error: true,
      message: error.message || 'Something went wrong while editing sub event',
    };
  }
};
