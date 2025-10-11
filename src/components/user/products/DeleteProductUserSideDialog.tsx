import { deleteProductUserSide } from '@/actions/product/deleteProduct';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuthContext } from '@/context/AuthContext';
import React, { useState, useTransition } from 'react';
import { toast } from 'sonner';

function DeleteProductUserSideDialog({ productId }: { productId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const auth = useAuthContext();
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle className="text-lg font-semibold">
          Delete Product
        </DialogTitle>
        <p>Are you sure you want to delete this product?</p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={isPending}
            variant="destructive"
            onClick={() => {
              startTransition(async () => {
                const userId = auth.currentUser?.id;
                if (!userId) {
                  toast.error('User ID not found');
                  return;
                }
                await deleteProductUserSide(productId);
                setIsOpen(false);
              });
            }}
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DeleteProductUserSideDialog;
