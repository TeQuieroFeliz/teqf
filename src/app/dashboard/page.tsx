'use client';

import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// /dashboard is the new canonical entry point.
// Routes to the correct experience based on team.
// All functional pages still live under /planner/* until migration is complete.

export default function DashboardPage() {
  const { plannerUser, isLoading } = usePlannerAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !plannerUser) return;
    const team = (plannerUser as any).team ?? '';
    const role = (plannerUser as any).teamRole ?? '';

    if (team === 'TeQF' || role === 'teqf_user' || role === 'both') {
      router.replace('/planner');
    } else if (team === 'XB' || role === 'xb_planner') {
      router.replace('/planner');
    } else {
      router.replace('/planner');
    }
  }, [plannerUser, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
      <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
    </div>
  );
}
