'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useState } from 'react';
import ProductForm from './ProductForm';
import { ProductSchemaType } from '@/lib/schemas/ProductSchema';
import { imageUpload } from '@/lib/imageUpload';
import { useAuthContext } from '@/context/AuthContext';
import { toast } from 'sonner';
import { addProduct } from '@/actions/product/addProduct';

function AddProductDialog() {
  const [open, setOpen] = useState(false);
  const { currentUser } = useAuthContext();

  const handleSubmit = async (formData: ProductSchemaType) => {
    try {
      if (!currentUser) {
        toast.error('User not found');
        return;
      }
      let imageUrl: string = '';
      try {
        imageUrl = (await imageUpload(formData.image, currentUser)) as string;
      } catch (error) {
        toast.error('Image not uploaded');
        return;
      }

      const res = await addProduct({ ...formData, image: imageUrl });
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
      <h1 className="text-2xl font-bold">Products</h1>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Add Product</Button>
        </DialogTrigger>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle className="text-lg font-bold">Add Product</DialogTitle>
          <ProductForm onSubmitAction={handleSubmit} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AddProductDialog;
