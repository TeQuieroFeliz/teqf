import { getProductsUserSide } from '@/actions/product/getProducts';
import AddProductUserSideDialog from '@/components/user/products/AddProductUserSideDialog';
import { ProductTableUserPanel } from '@/components/user/products/ProductTableUserPanel';

export const dynamic = 'force-dynamic';

async function ProductsPage() {
  const products = await getProductsUserSide();
  return (
    <div>
      <AddProductUserSideDialog />
      <ProductTableUserPanel products={products} />
    </div>
  );
}

export default ProductsPage;
