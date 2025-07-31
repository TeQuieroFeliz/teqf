'use server';

import { firestore } from '@/firebase/server';
import {
  productSchemaForServer,
  ProductSchemaType,
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
