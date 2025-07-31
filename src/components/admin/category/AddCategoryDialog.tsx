'use client';
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import CategoryForm from '@/components/admin/category/CategoryForm';
import { addCategory } from '@/actions/category/category-crud';
import { toast } from 'sonner';
import { useAuthContext } from '@/context/AuthContext';

function AddCategoryDialog() {
  const auth = useAuthContext();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex justify-between items-center">
      <h1 className="text-2xl font-bold">Categories</h1>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Add Category</Button>
        </DialogTrigger>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle className="text-lg font-semibold">
            Add Category
          </DialogTitle>
          <CategoryForm
            onSubmitAction={async (formData: any) => {
              const token = await auth.currentUser?.getIdToken();
              if (!token) {
                toast.error('Token not found');
                return;
              }
              await addCategory(formData, token);
            }}
            closeDialog={() => {
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AddCategoryDialog;
