'use client';

import { useGetSubEvents } from '@/actions/sub-event/sub-event-rc/getSubEventRc';
import ExportToPdfComp from '@/components/shared/ExportToPdfComp';
import { ProductType } from '@/lib/schemas/ProductSchema';
import { EventsType } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import SubEventDetailPage from './SubEventDetailPage';
import { SubEventForm } from './SubEventForm';
import { useEffect, useMemo, useState } from 'react';
import { SubEventDBWithId } from '@/lib/schemas/SubEventSchema';
import { useAuthContext } from '@/context/AuthContext';

type Props = {
  event: EventsType;
  products: ProductType[];
};

export default function SubEventsComp({ event, products }: Props) {
  const { subEvents, subEventsLoading } = useGetSubEvents(event.id);
  const { currentUser } = useAuthContext();
  const [subEventsArray, setSubEventsArray] = useState<SubEventDBWithId[]>([]);
  useEffect(() => {
    if (subEvents.length) {
      setSubEventsArray(subEvents);
    }
  }, [subEvents]);

  const filteredProducts = useMemo(() => {
    return products
      ?.map((product: any) => {
        if (!product?.userId) {
          return product;
        } else {
          return product.userId === currentUser?.id ? product : null;
        }
      })
      .filter(Boolean);
  }, [currentUser?.id, products]);

  const handleOnDeleteWithFilter = (subEventId: string) => {
    setSubEventsArray((prev) => prev.filter((val) => val.id !== subEventId));
  };

  return (
    <div>
      <ExportToPdfComp event={event} subEvents={subEventsArray} />

      {subEventsLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !!subEventsArray?.length ? (
        <div className="space-y-5 divide-y-4 divide-slate-500">
          {subEventsArray.map((subEvent) => (
            <SubEventDetailPage
              key={subEvent.id}
              subEvent={subEvent}
              products={filteredProducts}
              handleOnDeleteWithFilter={handleOnDeleteWithFilter}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground py-4">No sub-events yet.</p>
      )}

      <div id="subevent-form-container">
        <SubEventForm products={filteredProducts} />
      </div>
    </div>
  );
}
