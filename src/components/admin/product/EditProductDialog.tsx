'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useState } from 'react';
import ProductForm from './ProductForm';
import { ProductSchemaType, ProductType } from '@/lib/schemas/ProductSchema';
import { imageUpload } from '@/lib/imageUpload';
import { useAuthContext } from '@/context/AuthContext';
import { toast } from 'sonner';
import { editProduct } from '@/actions/product/editProduct';
import { DialogTitle } from '@radix-ui/react-dialog';

function EditProductDialog({ defaultValues }: { defaultValues: ProductType }) {
  const [open, setOpen] = useState(false);
  const { currentUser } = useAuthContext();

  const handleSubmit = async (formData: ProductSchemaType) => {
    try {
      if (!currentUser) {
        toast.error('User not found');
        return;
      }
      const imageUrl =
        typeof formData.image === 'object'
          ? await imageUpload(formData.image, currentUser)
          : formData.image;
      if (!imageUrl) {
        toast.error('Image not found');
        return;
      }

      const res = await editProduct(
        { ...formData, image: imageUrl },
        defaultValues.id
      );
      if (res?.error) {
        toast.error(res.message);
        return;
      }
    } catch (error) {
      console.log(error);
    } finally {
      setOpen(false);
    }
  };

  return (
    <div className="flex justify-between items-center">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm">Edit</Button>
        </DialogTrigger>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle className="text-lg font-bold">Edit Product</DialogTitle>
          <ProductForm
            onSubmitAction={handleSubmit}
            defaultValues={{
              name: defaultValues.name,
              category: defaultValues.categoryId,
              image: defaultValues.image,
              colors: defaultValues?.colors,
              type: defaultValues?.type,
              size: defaultValues?.size,
              note: defaultValues?.note,
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EditProductDialog;
