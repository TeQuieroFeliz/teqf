import { deleteSubEvent } from '@/actions/sub-event/deleteSubEvent';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuthContext } from '@/context/AuthContext';
import { Trash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

function DeleteSubEventDialog({ subEventId }: { subEventId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const auth = useAuthContext();
  const [isPending, startTransition] = useTransition();

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
            disabled={isPending}
            variant="destructive"
            onClick={() => {
              startTransition(async () => {
                const token = await auth.currentUser?.getIdToken();
                if (!token) {
                  toast.error('Token not found');
                  return;
                }
                await deleteSubEvent(subEventId, token);
                setTimeout(() => {
                  const scrollHeight = document.documentElement.scrollHeight;
                  const scrollToPosition =
                    scrollHeight - window.innerHeight - 350;

                  window.scrollTo({
                    top: Math.max(0, scrollToPosition), // Ensure we don't get negative values
                    behavior: 'smooth',
                  });
                }, 1000);
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

export default DeleteSubEventDialog;
