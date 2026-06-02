'use client';

import { PlannerAuthContextProvider, usePlannerAuth } from '@/context/PlannerAuthContext';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { plannerUser, isSuperAdmin, mustChangePassword, isLoading } = usePlannerAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const hasAccess = !!plannerUser || isSuperAdmin;
    if (!hasAccess) { router.replace('/planner/login'); return; }
    if (plannerUser && mustChangePassword) { router.replace('/planner/change-password'); return; }
    if (isSuperAdmin) { router.replace('/planner'); }
  }, [plannerUser, isSuperAdmin, mustChangePassword, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  return <>{children}</>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlannerAuthContextProvider>
      <DashboardGuard>{children}</DashboardGuard>
    </PlannerAuthContextProvider>
  );
}
