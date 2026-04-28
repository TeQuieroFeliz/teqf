'use client';

import { PlannerAuthContextProvider, usePlannerAuth } from '@/context/PlannerAuthContext';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

function PlannerGuard({ children }: { children: React.ReactNode }) {
  const { plannerUser, mustChangePassword, isLoading } = usePlannerAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const isLoginPage          = pathname === '/planner/login';
    const isRegisterPage       = pathname === '/planner/register';
    const isChangePasswordPage = pathname === '/planner/change-password';

    if (!plannerUser && !isLoginPage && !isRegisterPage) {
      router.replace('/planner/login');
      return;
    }

    if (plannerUser && (isLoginPage || isRegisterPage)) {
      router.replace(mustChangePassword ? '/planner/change-password' : '/planner');
      return;
    }

    // Planner autenticata ma deve cambiare password: blocca tutto tranne change-password
    if (plannerUser && mustChangePassword && !isChangePasswordPage) {
      router.replace('/planner/change-password');
      return;
    }

    // Se ha già cambiato la password, non può tornare su change-password
    if (plannerUser && !mustChangePassword && isChangePasswordPage) {
      router.replace('/planner');
    }
  }, [plannerUser, mustChangePassword, isLoading, pathname, router]);

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
