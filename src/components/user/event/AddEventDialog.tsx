'use client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuthContext } from '@/context/AuthContext';
import { useState } from 'react';
import { toast } from 'sonner';
import EventForm from './EventForm';
import { addEvent } from '@/actions/event/event-crud';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

function AddEventDialog() {
  const queryClient = useQueryClient();
  const auth = useAuthContext();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <div className="flex justify-between items-center">
      <h1 className="text-2xl font-bold">Events</h1>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Add Event</Button>
        </DialogTrigger>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle className="text-lg font-semibold">Add Event</DialogTitle>
          <EventForm
            onSubmitAction={async (formData: any) => {
              const userId = auth.currentUser?.id;
              if (!userId) {
                toast.error('User ID not found');
                return;
              }
              await addEvent(formData, userId);
              // await queryClient.invalidateQueries({
              //   queryKey: ['events', auth.currentUser?.id],
              // });
              // router.refresh();
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

export default AddEventDialog;
