'use client';

import { editProductUserSide } from '@/actions/product/editProduct';
import ProductForm from '@/components/admin/product/ProductForm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuthContext } from '@/context/AuthContext';
import { multipleImageUpload } from '@/lib/imageUpload';
import { ProductSchemaType, ProductType } from '@/lib/schemas/ProductSchema';
import { useState } from 'react';
import { toast } from 'sonner';

function EditProductUserSideDialog({
  defaultValues,
}: {
  defaultValues: ProductType;
}) {
  const [open, setOpen] = useState(false);
  const { currentUser } = useAuthContext();

  const handleSubmit = async (formData: ProductSchemaType) => {
    try {
      if (!currentUser) {
        toast.error('User not found');
        return;
      }
      const imageUrl = await multipleImageUpload(
        formData.images as File[],
        currentUser
      );
      if (!imageUrl) {
        toast.error('Image not found');
        return;
      }

      const res = await editProductUserSide(
        { ...formData, images: imageUrl },
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
              category: defaultValues?.categoryId,
              images: defaultValues.images,
              colors: defaultValues?.colors,
              type: defaultValues?.type,
              size: defaultValues?.size,
              note: defaultValues?.note,
              location: defaultValues?.location,
              description: defaultValues?.description,
              estPrice: defaultValues?.estPrice?.toString(),
              quantity: defaultValues?.quantity?.toString(),
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EditProductUserSideDialog;
