'use server';

import { auth, firestore } from '@/firebase/server';
import { locationSchema } from '@/lib/schemas/LocationSchema';
import { requireRole } from '@/lib/utils';
import { revalidatePath } from 'next/cache';

const locationRef = firestore.collection('cities');

export async function getLocation() {
  const snapshot = await locationRef.get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    city: doc.data().city as string,
    createdAt: doc.data()?.createdAt?.toDate?.()?.toISOString(),
  }));
}

export async function addLocation(formData: { city: string }, userId: string) {
  const { error, message } = await requireRole(userId, ['admin', 'manager']);

  if (error) {
    return { error, message };
  }

  const data = locationSchema.parse(formData);

  await locationRef.add({
    city: data.city,
    createdAt: new Date(),
  });

  revalidatePath('/admin-dashboard/location');
}

export async function editLocation(
  id: string,
  data: { city: string },
  userId: string
) {
  const { error, message } = await requireRole(userId, ['admin', 'manager']);

  if (error) {
    return { error, message };
  }

  const parsed = locationSchema.parse(data);

  await locationRef.doc(id).update({
    city: parsed.city,
  });

  revalidatePath('/admin-dashboard/location');
}

export async function deleteLocation(id: string, userId: string) {
  const { error, message } = await requireRole(userId, ['admin', 'manager']);

  if (error) {
    return { error, message };
  }

  await locationRef.doc(id).delete();

  revalidatePath('/admin-dashboard/location');
}
