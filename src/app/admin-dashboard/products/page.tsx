import { getProducts } from '@/actions/product/getProducts';
import AddProductDialog from '@/components/admin/product/AddProductDialog';
import { ProductTable } from '@/components/admin/product/ProductTable';
import React from 'react';

export const dynamic = 'force-dynamic';

async function ProductsPage() {
  const products = await getProducts();
  return (
    <div>
      <AddProductDialog />
      <ProductTable products={products} />
    </div>
  );
}

export default ProductsPage;
