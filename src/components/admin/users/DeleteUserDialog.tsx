'use client';
import { deleteUser } from '@/actions/user/deleteUser';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuthContext } from '@/context/AuthContext';
import { requireRole } from '@/lib/utils';
import React, { useState, useTransition } from 'react';
import { toast } from 'sonner';

function DeleteUserDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const { currentUser } = useAuthContext();
  const [isPending, startTransition] = useTransition();

  const handleDelete = async () => {
    startTransition(async () => {
      try {
        if (!currentUser?.id) {
          toast.error('User not found');
          return;
        }
        const { error, message } = await requireRole(currentUser.id, ['admin']);

        if (error) {
          toast.error(message);
          return;
        }

        if (!userId) {
          toast.error('UserId not found');
          return;
        }

        await deleteUser(userId);
      } catch (error) {
        console.log(error);
      } finally {
        setOpen(false);
      }
    });
  };

  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm">
            Delete
          </Button>
        </DialogTrigger>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle className="text-lg font-semibold">
            Delete User
          </DialogTitle>
          <p>
            Are you sure you want to delete this user? This action is
            irreversible.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={isPending}
              variant="destructive"
              onClick={handleDelete}
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DeleteUserDialog;
