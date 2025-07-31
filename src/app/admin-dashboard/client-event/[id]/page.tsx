import { getSingleEvent } from '@/actions/event/event-crud';
import { getProducts } from '@/actions/product/getProducts';
import { getSubEventsClient } from '@/actions/sub-event/getSubEventClient';
import ExportToPdfComp from '@/components/shared/ExportToPdfComp';
import SubEventDetailPage from '@/components/user/sub-event/SubEventDetailPage';
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
  const subEvents = await getSubEventsClient(id);
  if (!event) {
    return <p>Event not found</p>;
  }
  return (
    <div>
      <div className="mb-5">
        <ExportToPdfComp event={event} subEvents={subEvents} />
        <fieldset disabled className="disabled:opacity-90">
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
        </fieldset>
      </div>
    </div>
  );
}

export default EventDetailPage;
