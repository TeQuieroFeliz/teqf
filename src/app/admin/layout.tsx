'use client';

import { PlannerAuthContextProvider, usePlannerAuth } from '@/context/PlannerAuthContext';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin, isLoading } = usePlannerAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isSuperAdmin) router.replace('/planner/login');
  }, [isSuperAdmin, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  return <>{children}</>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlannerAuthContextProvider>
      <AdminGuard>{children}</AdminGuard>
    </PlannerAuthContextProvider>
  );
}
