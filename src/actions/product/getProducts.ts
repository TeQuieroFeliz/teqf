'use server';

import { firestore } from '@/firebase/server';
import { ProductType, ProductUserSideType } from '@/lib/schemas/ProductSchema';

export const getProducts = async () => {
  const res = await firestore
    .collection('products')
    .orderBy('createdAt', 'desc')
    .get();
  const data = await Promise.all(
    res.docs.map(async (doc) => {
      const categoryData = await firestore
        .collection('categories')
        .doc(doc.data()?.category)
        .get();
      const productData = doc.data();
      return {
        id: doc.id,
        name: productData.name,
        images: Array.isArray(productData.images)
          ? productData.images
          : productData.image
            ? [productData.image]
            : [],
        categoryId: productData?.category,
        location: productData?.location,
        categoryName: categoryData.exists
          ? categoryData.data()?.title
          : 'unknown',
        colors: productData.colors,
        note: productData?.note,
        size: productData?.size,
        type: productData?.type,
        estPrice: productData?.estPrice,
        quantity: productData?.quantity,
        description: productData?.description,
        createdAt: productData?.createdAt?.toDate?.()?.toISOString(),
      };
    })
  );

  return data as ProductType[];
};
export const getProductsUserSide = async () => {
  const res = await firestore
    .collection('products-user')
    .orderBy('createdAt', 'desc')
    .get();
  const data = await Promise.all(
    res.docs.map(async (doc) => {
      const categoryData = await firestore
        .collection('categories')
        .doc(doc.data()?.category)
        .get();
      const productData = doc.data();
      return {
        id: doc.id,
        name: productData.name,
        images: Array.isArray(productData.images)
          ? productData.images
          : productData.image
            ? [productData.image]
            : [],
        categoryId: productData?.category,
        location: productData?.location,
        categoryName: categoryData.exists
          ? categoryData.data()?.title
          : 'unknown',
        colors: productData.colors,
        note: productData?.note,
        size: productData?.size,
        type: productData?.type,
        estPrice: productData?.estPrice,
        quantity: productData?.quantity,
        description: productData?.description,
        createdAt: productData?.createdAt?.toDate?.()?.toISOString(),
        addedByAdmin: productData?.addedByAdmin,
        userId: productData?.userId,
      };
    })
  );

  return data as ProductUserSideType[];
};
