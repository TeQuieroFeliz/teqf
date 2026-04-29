'use server';

import { firestore } from '@/firebase/server';
import {
  productSchemaForServer,
  ProductSchemaType,
} from '@/lib/schemas/ProductSchema';
import { revalidatePath } from 'next/cache';

export const addProduct = async (formData: ProductSchemaType) => {
  const validation = productSchemaForServer.safeParse(formData);

  if (!validation.success) {
    console.log(validation.error);
    return { error: true, message: 'Validations failed' };
  }

  try {
    await firestore
      .collection('products')
      .add({ ...formData, createdAt: new Date() });
    revalidatePath('/admin-dashboard/products');
  } catch (error: any) {
    console.log(error);
    return {
      error: true,
      message: error.message || 'Something went wrong while adding product',
    };
  }
};

export const addProductUserSide = async (
  formData: ProductSchemaType,
  userId: string
) => {
  const validation = productSchemaForServer.safeParse(formData);
  if (!userId) {
    return { error: true, message: 'User not found' };
  }
  if (!validation.success) {
    return { error: true, message: 'Validations failed' };
  }

  try {
    await firestore
      .collection('products-user')
      .add({ ...formData, userId, addedByAdmin: false, createdAt: new Date() });
    revalidatePath('/user-dashboard/products');
  } catch (error: any) {
    console.log(error);
    return {
      error: true,
      message: error.message || 'Something went wrong while adding product',
    };
  }
};
