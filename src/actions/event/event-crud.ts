'use server';

import { auth, firestore } from '@/firebase/server';
import { eventSchema } from '@/lib/schemas/EventSchema';
import { revalidatePath } from 'next/cache';

const eventsRef = firestore.collection('events');

export async function getEvents(token: string) {
  const verifiedToken = await auth.verifyIdToken(token);

  const snapshot = await eventsRef
    .where('userId', '==', verifiedToken.uid)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    title: doc.data().title as string,
    userId: doc.data().userId as string,
  }));
}

export async function getEventsClient(token: string) {
  const verifiedToken = await auth.verifyIdToken(token);

  const snapshot = await eventsRef
    .where('userId', '!=', verifiedToken.uid)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    title: doc.data().title as string,
    userId: doc.data().userId as string,
  }));
}

export async function getSingleEvent(id: string) {
  const snapshot = await eventsRef.doc(id).get();
  return !snapshot || snapshot.exists
    ? {
        id: snapshot.id,
        title: snapshot.data()?.title as string,
        userId: snapshot.data()?.userId as string,
      }
    : null;
}

export async function addEvent(formData: FormData, token: string) {
  const verifiedToken = await auth.verifyIdToken(token);

  if (!verifiedToken) {
    return { error: true, message: 'Unauthorized' };
  }

  const data = eventSchema.parse({ title: formData.get('title') });

  await eventsRef.add({
    title: data.title,
    userId: verifiedToken.uid,
    createdAt: new Date(),
  });

  revalidatePath('/user-dashboard');
}

export async function editEvent(id: string, formData: any, token: string) {
  const data = eventSchema.parse({ title: formData.get('title') });

  await eventsRef.doc(id).update({
    title: data.title,
  });

  revalidatePath('/user-dashboard');
}

export async function editEventt(id: string, formData: any, token: string) {
  await eventsRef.doc(id).update({
    title: formData.title,
  });

  revalidatePath('/user-dashboard');
}

export async function deleteEvent(id: string, token: string) {
  const verifiedToken = await auth.verifyIdToken(token);

  if (!verifiedToken) {
    return { error: true, message: 'Unauthorized' };
  }

  await eventsRef.doc(id).delete();

  revalidatePath('/user-dashboard');
}
