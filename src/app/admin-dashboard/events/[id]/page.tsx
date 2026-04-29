import { getSingleEvent } from '@/actions/event/event-crud';
import { getProducts } from '@/actions/product/getProducts';
import SubEventsComp from '@/components/user/sub-event/SubEventComp';
async function EventDetailPage({ params }: any) {
  const { id } = await params;
  const event = await getSingleEvent(id);
  const products = await getProducts();
  if (!event) {
    return <p>Event not found</p>;
  }
  return (
    <div>
      <SubEventsComp event={event} products={products} />
    </div>
  );
}

export default EventDetailPage;

export const dynamic = 'force-dynamic';
