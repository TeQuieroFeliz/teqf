import {
  deleteCategory,
  editCategory,
  getCategories,
} from '@/actions/category/category-crud';
import AddCategoryDialog from '@/components/admin/category/AddCategoryDialog';
import CategoryTable from '@/components/admin/category/CategoryTable';

export const dynamic = 'force-dynamic';

export default async function CategoryPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <AddCategoryDialog />
      <CategoryTable
        categories={categories}
        onEdit={editCategory as any}
        onDelete={deleteCategory as any}
      />
    </div>
  );
}
