'use server';

import { firestore } from '@/firebase/server';
import {
  productSchemaForServer,
  ProductSchemaType,
  ProductUserSideType,
} from '@/lib/schemas/ProductSchema';
import { revalidatePath } from 'next/cache';

export const editProduct = async (
  formData: ProductSchemaType,
  productId: string
) => {
  const validation = productSchemaForServer.safeParse(formData);

  if (!validation.success) {
    console.log(validation.error);
    return { error: true, message: 'Validations failed' };
  }

  try {
    await firestore
      .collection('products')
      .doc(productId)
      .update({ ...formData });
    revalidatePath('/admin-dashboard/products');
  } catch (error: any) {
    console.log(error);
    return {
      error: true,
      message: error.message || 'Something went wrong while editing product',
    };
  }
};

export const editProductUserSide = async (
  formData: ProductSchemaType,
  productId: string
) => {
  const validation = productSchemaForServer.safeParse(formData);

  if (!validation.success) {
    console.log(validation.error);
    return { error: true, message: 'Validations failed' };
  }

  try {
    await firestore
      .collection('products-user')
      .doc(productId)
      .update({ ...formData });
    revalidatePath('/user-dashboard/products');
  } catch (error: any) {
    console.log(error);
    return {
      error: true,
      message: error.message || 'Something went wrong while editing product',
    };
  }
};

export const editProductToAddToInventory = async (
  productId: string,
  formData: ProductUserSideType
) => {
  try {
    await firestore
      .collection('products-user')
      .doc(productId)
      .update({ addedByAdmin: true });

    const {
      createdAt,
      addedByAdmin,
      id,
      categoryId,
      categoryName,
      userId,
      ...rest
    } = formData;

    await firestore
      .collection('products')
      .add({ ...rest, category: categoryId, createdAt: new Date() });

    revalidatePath('/admin-dashboard/products');
    revalidatePath('/admin-dashboard/users-products');
  } catch (error: any) {
    console.log(error);
    return {
      error: true,
      message: error.message || 'Something went wrong while editing product',
    };
  }
};
