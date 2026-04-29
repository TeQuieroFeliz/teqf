import { deleteEvent, editEvent } from '@/actions/event/event-crud';
import AddEventDialog from '@/components/user/event/AddEventDialog';
import EventTable from '@/components/user/event/EventTable';

export default async function AdminDashboard() {
  return (
    <div className="space-y-6">
      <AddEventDialog />
      <EventTable onEdit={editEvent as any} onDelete={deleteEvent as any} />
    </div>
  );
}
