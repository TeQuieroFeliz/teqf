'use client';

import PlannerEventEditor from '@/components/planner/PlannerEventEditor';
import { getPlannerEvent } from '@/actions/planner/planner-event-crud';
import { PlannerEvent } from '@/lib/planner-types';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function EditPlannerEventPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [event, setEvent] = useState<PlannerEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlannerEvent(id).then((e) => {
      if (!e) { router.replace('/planner'); return; }
      setEvent(e);
      setLoading(false);
    });
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  if (!event) return null;

  return <PlannerEventEditor eventId={id} isNew={false} initialEvent={event} />;
}
