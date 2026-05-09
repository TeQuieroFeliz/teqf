'use client';

import { useAdminAuth } from '@/context/AdminAuthContext';
import { useCashControlAuth } from '@/context/CashControlAuthContext';
import { hasCashControlAccess } from '@/lib/cash-control/permissions';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

export function CashControlGuard({ children }: { children: ReactNode }) {
  const { isLoading, firebaseUser, cashControlRole } = useCashControlAuth();
  const { adminUser, isLoading: adminLoading } = useAdminAuth();
  const isSuperAdmin = adminUser?.role === 'superadmin';
  const router = useRouter();

  useEffect(() => {
    if (isLoading || adminLoading) return;
    if (!firebaseUser) {
      router.replace('/login');
    }
  }, [isLoading, adminLoading, firebaseUser, router]);

  if (isLoading || adminLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--tqf-beige)' }}
      >
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  if (!firebaseUser) {
    // Redirecting — render nothing
    return null;
  }

  if (!hasCashControlAccess(cashControlRole) && !isSuperAdmin) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: 'var(--tqf-beige)' }}
      >
        <div
          className="max-w-sm w-full text-center rounded-2xl p-8"
          style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
        >
          <div
            className="mx-auto mb-4 size-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}
          >
            <span className="text-2xl">🔒</span>
          </div>
          <h1
            className="text-xl mb-2"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}
          >
            Acceso denegado
          </h1>
          <p className="text-sm mb-3" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            No tienes acceso a esta área.
          </p>
          <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            Contacta al administrador si crees que esto es un error.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
