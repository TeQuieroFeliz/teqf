'use server';

import { auth, firestore } from '@/firebase/server';
import { categorySchema } from '@/lib/schemas/CategorySchema';
import { revalidatePath } from 'next/cache';

const categoriesRef = firestore.collection('categories');

export async function getCategories() {
  const snapshot = await categoriesRef.get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    title: doc.data().title as string,
  }));
}

export async function addCategory(formData: FormData, token: string) {
  const verifiedToken = await auth.verifyIdToken(token);

  if (verifiedToken.role !== 'ADMIN') {
    return { error: true, message: 'Unauthorized' };
  }

  const data = categorySchema.parse({ title: formData.get('title') });

  await categoriesRef.add({
    title: data.title,
  });

  revalidatePath('/admin-dashboard/category');
}

export async function editCategory(
  id: string,
  formData: FormData,
  token: string
) {
  const verifiedToken = await auth.verifyIdToken(token);

  if (verifiedToken.role !== 'ADMIN') {
    return { error: true, message: 'Unauthorized' };
  }

  const data = categorySchema.parse({ title: formData.get('title') });

  await categoriesRef.doc(id).update({
    title: data.title,
  });

  revalidatePath('/admin-dashboard/category');
}

export async function deleteCategory(id: string, token: string) {
  const verifiedToken = await auth.verifyIdToken(token);

  if (verifiedToken.role !== 'ADMIN') {
    return { error: true, message: 'Unauthorized' };
  }

  await categoriesRef.doc(id).delete();

  revalidatePath('/admin-dashboard/category');
}
