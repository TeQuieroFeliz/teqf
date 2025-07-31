'use server';

import { firestore } from '@/firebase/server';
import { ProductType } from '@/lib/schemas/ProductSchema';

export const getProducts = async () => {
  const res = await firestore
    .collection('products')
    .orderBy('createdAt', 'desc')
    .get();
  const data = await Promise.all(
    res.docs.map(async (doc) => {
      const categoryData = await firestore
        .collection('categories')
        .doc(doc.data().category)
        .get();

      return {
        id: doc.id,
        name: doc.data().name,
        image: doc.data().image,
        categoryId: doc.data().category,
        categoryName: categoryData.exists
          ? categoryData.data()?.title
          : 'unknown',
        colors: doc.data().colors,
        note: doc.data()?.note,
        size: doc.data()?.size,
        type: doc.data()?.type,
      };
    })
  );

  return data as ProductType[];
};
