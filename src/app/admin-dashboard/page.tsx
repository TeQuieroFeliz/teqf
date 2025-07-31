import { deleteEvent, editEvent, getEvents } from '@/actions/event/event-crud';
import AddEventDialog from '@/components/user/event/AddEventDialog';
import EventTable from '@/components/user/event/EventTable';
import { cookies } from 'next/headers';

export default async function AdminDashboard() {
  const cookiesStore = await cookies();
  const token = cookiesStore.get('firebaseAuthToken')?.value;
  if (!token) {
    return;
  }
  const events = await getEvents(token);

  return (
    <div className="space-y-6">
      <AddEventDialog />
      <EventTable
        events={events}
        onEdit={editEvent as any}
        onDelete={deleteEvent as any}
      />
    </div>
  );
}
