'use client';

import PlannerEventEditor from '@/components/planner/PlannerEventEditor';
import { useState } from 'react';

export default function NewPlannerEventPage() {
  const [eventId] = useState(() => crypto.randomUUID());
  return <PlannerEventEditor eventId={eventId} isNew={true} />;
}
