import { ProductType } from '@/lib/schemas/ProductSchema';
import { SubEventForm } from './SubEventForm';
import { SubEventDBWithId } from '@/lib/schemas/SubEventSchema';

type Props = {
  products: ProductType[];
  subEvent: SubEventDBWithId;
  handleOnDeleteWithFilter: (subEventId: string) => void;
};
function SubEventDetailPage({
  products,
  subEvent,
  handleOnDeleteWithFilter,
}: Props) {
  return (
    <div className="pb-5">
      <SubEventForm
        products={products}
        subEvent={subEvent}
        handleOnDeleteWithFilter={handleOnDeleteWithFilter}
      />
    </div>
  );
}

export default SubEventDetailPage;
