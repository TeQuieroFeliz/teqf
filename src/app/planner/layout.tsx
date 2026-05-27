'use client';

import { PlannerAuthContextProvider, usePlannerAuth } from '@/context/PlannerAuthContext';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

function PlannerGuard({ children }: { children: React.ReactNode }) {
  const { plannerUser, adminUser, isSuperAdmin, mustChangePassword, isLoading } = usePlannerAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const isLoginPage          = pathname === '/planner/login';
    const isRegisterPage       = pathname === '/planner/register';
    const isChangePasswordPage = pathname === '/planner/change-password';

    const hasAccess = !!plannerUser || isSuperAdmin;

    if (!hasAccess && !isLoginPage && !isRegisterPage) {
      router.replace('/planner/login');
      return;
    }

    if (hasAccess && (isLoginPage || isRegisterPage)) {
      router.replace(mustChangePassword ? '/planner/change-password' : '/planner');
      return;
    }

    // Team-only admins (not superadmin, not planner) have no business in /planner
    if (!plannerUser && adminUser && !isSuperAdmin && !isLoginPage && !isRegisterPage) {
      router.replace('/area-planner');
      return;
    }

    if (plannerUser && mustChangePassword && !isChangePasswordPage) {
      router.replace('/planner/change-password');
      return;
    }

    if (plannerUser && !mustChangePassword && isChangePasswordPage) {
      router.replace('/planner');
    }
  }, [plannerUser, adminUser, isSuperAdmin, mustChangePassword, isLoading, pathname, router]);

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
