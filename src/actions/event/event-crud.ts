'use server';

import { firestore } from '@/firebase/server';
import { eventSchema } from '@/lib/schemas/EventSchema';
import { EventsType } from '@/lib/types';
import { revalidatePath } from 'next/cache';

const eventsRef = firestore.collection('events');

export async function getEvents(userId: string) {
  const snapshot = await eventsRef.where('userId', '==', userId).get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    title: doc.data().title as string,
    userId: doc.data().userId as string,
  })) as EventsType[];
}

export async function getEventsClient(userId: string) {
  const snapshot = await eventsRef.where('userId', '!=', userId).get();

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

export async function addEvent(formData: FormData, userId: string) {
  const data = eventSchema.parse({ title: formData.get('title') });

  await eventsRef.add({
    title: data.title,
    userId,
    createdAt: new Date(),
  });

  revalidatePath('/user-dashboard');
}

export async function editEvent(id: string, formData: any) {
  const data = eventSchema.parse({ title: formData.get('title') });

  await eventsRef.doc(id).update({
    title: data.title,
  });

  revalidatePath('/user-dashboard');
}

export async function editEventt(id: string, formData: any) {
  await eventsRef.doc(id).update({
    title: formData.title,
  });

  revalidatePath('/user-dashboard');
}

export async function deleteEvent(id: string, userId: string) {
  await eventsRef.doc(id).delete();

  revalidatePath('/user-dashboard');
}
