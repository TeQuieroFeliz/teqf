import { getSingleEvent } from '@/actions/event/event-crud';
import {
  getProducts,
  getProductsUserSide,
} from '@/actions/product/getProducts';
import SubEventsComp from '@/components/user/sub-event/SubEventComp';
export const dynamic = 'force-dynamic';
async function EventDetailPage({ params }: any) {
  const { id } = await params;
  const event = await getSingleEvent(id);
  const products = await getProducts();
  const productsByUsers = await getProductsUserSide();
  const productsByUsersNotAddedByAdmin = productsByUsers?.filter(
    (products) => !products.addedByAdmin
  );
  const filteredProducts = [
    ...products,
    ...productsByUsersNotAddedByAdmin,
  ].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt) : null;
    const dateB = b.createdAt ? new Date(b.createdAt) : null;
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;

    return dateB.getTime() - dateA.getTime();
  });

  if (!event) {
    return <p>Event not found</p>;
  }
  return (
    <div>
      <div>
        <SubEventsComp event={event} products={filteredProducts} />
      </div>
    </div>
  );
}

export default EventDetailPage;
