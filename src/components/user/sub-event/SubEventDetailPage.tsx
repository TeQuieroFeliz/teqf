import { ProductType } from '@/lib/schemas/ProductSchema';
import { SubEventForm } from './SubEventForm';
import { SubEventDBWithId } from '@/lib/schemas/SubEventSchema';

type Props = {
  products: ProductType[];
  subEvent: SubEventDBWithId;
};
function SubEventDetailPage({ products, subEvent }: Props) {
  return (
    <div className="pb-5">
      <SubEventForm products={products} subEvent={subEvent} />
    </div>
  );
}

export default SubEventDetailPage;
