'use client';

import { PlannerAuthContextProvider, usePlannerAuth } from '@/context/PlannerAuthContext';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

function PlannerGuard({ children }: { children: React.ReactNode }) {
  const { plannerUser, isSuperAdmin, mustChangePassword, isLoading } = usePlannerAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const PUBLIC_ROUTES        = ['/planner/login', '/planner/register'];
    const isPublicRoute        = PUBLIC_ROUTES.includes(pathname);
    const isChangePasswordPage = pathname === '/planner/change-password';

    const hasAccess = !!plannerUser || isSuperAdmin;

    if (!hasAccess && !isPublicRoute) {
      router.replace('/planner/login');
      return;
    }

    if (hasAccess && isPublicRoute) {
      router.replace(mustChangePassword ? '/planner/change-password' : '/planner');
      return;
    }

    if (plannerUser && mustChangePassword && !isChangePasswordPage) {
      router.replace('/planner/change-password');
      return;
    }

    if (plannerUser && !mustChangePassword && isChangePasswordPage) {
      router.replace('/planner');
    }
  }, [plannerUser, isSuperAdmin, mustChangePassword, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  return <>{children}</>;
}

export default function PlannerLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlannerAuthContextProvider>
      <PlannerGuard>{children}</PlannerGuard>
    </PlannerAuthContextProvider>
  );
}
