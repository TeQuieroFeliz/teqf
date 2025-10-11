'use client';

import { getUserById } from '@/actions/auth/get-user';
import { getEvents } from '@/actions/event/event-crud';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useAuthContext } from '@/context/AuthContext';
import { db } from '@/firebase/client';
import { EventsType } from '@/lib/types';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';

export default function EventTable({
  onEdit,
  onDelete,
}: {
  // events: { id: string; title: string; userId: string }[];
  onEdit: (id: string, data: FormData, userId: string) => Promise<void>;
  onDelete: (id: string, userId: string) => Promise<void>;
}) {
  const pathname = usePathname();
  const { currentUser } = useAuthContext();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [events, setEvents] = useState<EventsType[]>([]);
  const [isPendingEvents, startTransitionEvents] = useTransition();
  // useEffect(() => {
  //   if (currentUser) {
  //     startTransitionEvents(async () => {
  //       const events = await getEvents(currentUser.id);
  //       setEvents(events);
  //     });
  //   }
  // }, [currentUser]);
  useEffect(() => {
    if (!currentUser?.id) return;

    const q = query(
      collection(db, 'events'),
      where('userId', '==', currentUser.id)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const ev = snap.docs.map((d) => ({
        id: d.id,
        title: d.data().title as string,
        userId: d.data().userId as string,
      })) as EventsType[];

      startTransitionEvents(() => {
        setEvents(ev);
      });
    });

    // cleanup: unsubscribe when effect re-runs or component unmounts
    return () => unsubscribe();
  }, [currentUser?.id]);
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
          {isPendingEvents ? (
            <tr>
              <td colSpan={3} className="p-6 text-center">
                <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
                Loading events...
              </td>
            </tr>
          ) : (
            events.map((event, index) => (
              <tr key={event.id} className="border-t">
                <td className="p-3">{index + 1}</td>
                <td className="p-3">{event.title}</td>
                <td className="p-3 flex items-center justify-start gap-x-2">
                  {/* Actions */}
                  <div className="flex items-center justify-start gap-x-2">
                    {/* View */}
                    <Button asChild size={'sm'}>
                      <Link
                        href={
                          currentUser?.role === 'admin' ||
                          currentUser?.role === 'manager'
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
                    {event.userId === currentUser?.id && (
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
                                  const { user } = await getUserById(
                                    currentUser.id
                                  );
                                  if (!user?.id) {
                                    toast.error('User ID not found');
                                    return;
                                  }
                                  await onDelete(event.id, user.id);
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
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
