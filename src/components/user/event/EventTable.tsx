'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState, useTransition } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { toast } from 'sonner';
import EventForm from './EventForm';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default function EventTable({
  events,
  onEdit,
  onDelete,
}: {
  events: { id: string; title: string; userId: string }[];
  onEdit: (id: string, data: FormData, token: string) => Promise<void>;
  onDelete: (id: string, token: string) => Promise<void>;
}) {
  const pathname = usePathname();
  const auth = useAuthContext();
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(
    null
  );
  const [deleting, setDeleting] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <ScrollArea className="border rounded-md w-[300px] sm:w-[350px] md:w-full">
      <table className="w-full text-left">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="p-3">S.No</th>
            <th className="p-3">Name</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event, index) => (
            <tr key={event.id} className="border-t">
              <td className="p-3">{index + 1}</td>
              <td className="p-3">{event.title}</td>
              <td className="p-3 flex items-center justify-start gap-x-2">
                {/* Edit */}
                <div className="flex items-center justify-start gap-x-2">
                  {/* View */}
                  <Button asChild size={'sm'}>
                    <Link
                      href={
                        auth.customClaims?.role === 'ADMIN'
                          ? `/admin-dashboard/${
                              pathname.includes('client-event')
                                ? 'client-event'
                                : 'events'
                            }/${event.id}`
                          : `/user-dashboard/${
                              pathname.includes('client-event')
                                ? 'client-event'
                                : 'events'
                            }/${event.id}`
                      }
                    >
                      View
                    </Link>
                  </Button>
                  {event.userId === auth.currentUser?.uid && (
                    <Dialog
                      open={deleting === event.id}
                      onOpenChange={(open) =>
                        setDeleting(open ? event.id : null)
                      }
                    >
                      <DialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          Delete
                        </Button>
                      </DialogTrigger>
                      <DialogContent aria-describedby={undefined}>
                        <DialogTitle className="text-lg font-semibold">
                          Delete Event
                        </DialogTitle>
                        <p>Are you sure you want to delete this event?</p>
                        <div className="flex justify-end gap-2 mt-4">
                          <Button
                            variant="ghost"
                            onClick={() => setDeleting(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            disabled={isPending}
                            variant="destructive"
                            onClick={() => {
                              startTransition(async () => {
                                const token =
                                  await auth.currentUser?.getIdToken();
                                if (!token) {
                                  toast.error('Token not found');
                                  return;
                                }
                                await onDelete(event.id, token);
                                setDeleting(null);
                              });
                            }}
                          >
                            {isPending ? 'Deleting...' : 'Delete'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                {/* Delete */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
