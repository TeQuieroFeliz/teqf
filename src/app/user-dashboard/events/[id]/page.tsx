import { getSingleEvent } from '@/actions/event/event-crud';
import { getProducts } from '@/actions/product/getProducts';
import { getSubEvents } from '@/actions/sub-event/getSubEvents';
import ExportToPdfComp from '@/components/shared/ExportToPdfComp';
import SubEventDetailPage from '@/components/user/sub-event/SubEventDetailPage';
import { SubEventForm } from '@/components/user/sub-event/SubEventForm';
import { cookies } from 'next/headers';

async function EventDetailPage({ params }: any) {
  const cookiesStore = await cookies();
  const token = cookiesStore.get('firebaseAuthToken')?.value;
  if (!token) {
    return;
  }
  const { id } = await params;
  const event = await getSingleEvent(id);
  const products = await getProducts();
  const subEvents = await getSubEvents(id, token);
  if (!event) {
    return <p>Event not found</p>;
  }
  return (
    <div>
      <div className="mb-5">
        <ExportToPdfComp event={event} subEvents={subEvents} />
        {!!subEvents?.length && (
          <div className="space-y-5 divide-y-4 divide-slate-500">
            {subEvents.map((subEvent) => (
              <SubEventDetailPage
                products={products}
                key={subEvent.id}
                subEvent={subEvent}
              />
            ))}
          </div>
        )}
      </div>
      <div>
        <SubEventForm products={products} />
      </div>
    </div>
  );
}

export default EventDetailPage;
