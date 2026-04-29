'use client';
import { AdminAuthContextProvider, useAdminAuth } from '@/context/AdminAuthContext';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { adminUser, isLoading, mustChangePassword } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const isLoginPage     = pathname === '/admin/login';
    const isSeedPage      = pathname === '/admin/seed';
    const isChangePwdPage = pathname === '/admin/change-password';

    if (!adminUser && !isLoginPage && !isSeedPage) {
      router.replace('/admin/login');
      return;
    }
    if (adminUser && isLoginPage) {
      router.replace(mustChangePassword ? '/admin/change-password' : '/admin');
      return;
    }
    if (adminUser && mustChangePassword && !isChangePwdPage) {
      router.replace('/admin/change-password');
      return;
    }
    if (adminUser && !mustChangePassword && isChangePwdPage) {
      router.replace('/admin');
    }
  }, [adminUser, isLoading, mustChangePassword, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  return <>{children}</>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthContextProvider>
      <AdminGuard>{children}</AdminGuard>
    </AdminAuthContextProvider>
  );
}
