'use client';

import { useDeleteSubEvent } from '@/actions/sub-event/sub-event-rc/deleteSubEventRc';
import { useGetSubEvents } from '@/actions/sub-event/sub-event-rc/getSubEventRc';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuthContext } from '@/context/AuthContext';
import { Trash } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

function DeleteSubEventDialog({
  subEventId,
  handleOnDeleteWithFilter,
}: {
  subEventId: string;
  handleOnDeleteWithFilter?: (subEventId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser } = useAuthContext();
  const params = useParams();
  const eventId = params?.id as string;
  const router = useRouter();

  const { deleteSubEventMutation, deleteSubEventLoading } =
    useDeleteSubEvent(eventId);
  // const { refetchSubevents } = useGetSubEvents(eventId);

  const handleDelete = async () => {
    if (!currentUser) {
      toast.error('User not found');
      return;
    }

    try {
      await deleteSubEventMutation(subEventId);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      handleOnDeleteWithFilter && handleOnDeleteWithFilter(subEventId);
      setIsOpen(false);
      // await refetchSubevents();
      // router.refresh();

      // Optional: Perform scroll animation after success
      setTimeout(() => {
        const scrollHeight = document.documentElement.scrollHeight;
        const scrollToPosition = scrollHeight - window.innerHeight - 350;
        window.scrollTo({
          top: Math.max(0, scrollToPosition),
          behavior: 'smooth',
        });
      }, 500);
    } catch (error) {
      // The `onError` in your hook will show a toast,
      // but you could add other logic here if needed.
      console.error('Failed to delete sub-event:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="icon">
          <Trash size={20} />
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle className="text-lg font-semibold">
          Delete Sub Event
        </DialogTitle>
        <p>Are you sure you want to delete this sub event?</p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={deleteSubEventLoading}
            variant="destructive"
            onClick={async () => {
              await handleDelete();
            }}
          >
            {deleteSubEventLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DeleteSubEventDialog;
