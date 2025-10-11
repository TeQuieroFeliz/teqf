import { getProductsUserSide } from '@/actions/product/getProducts';
import { ProductTableUserAtAdminSide } from '@/components/admin/product/ProductTableUserAtAdminSide';
import React from 'react';

async function UsersProducts() {
  const products = await getProductsUserSide();
  const filteredProducts = products.filter((product) => !product.addedByAdmin);
  return (
    <div>
      <h1 className="font-bold text-2xl ">Products by Users</h1>
      <ProductTableUserAtAdminSide products={filteredProducts} />
    </div>
  );
}

export default UsersProducts;

export const dynamic = 'force-dynamic';
