import { AdminAuthContextProvider } from '@/context/AdminAuthContext';
import { CashControlAuthContextProvider } from '@/context/CashControlAuthContext';
import { CashControlGuard } from '@/components/cash-control/CashControlGuard';
import Image from 'next/image';
import Link from 'next/link';
import { ReactNode } from 'react';

export default function AreaPlannerLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAuthContextProvider>
    <CashControlAuthContextProvider>
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--tqf-beige)' }}>
        <header
          className="flex items-center px-5 py-3 flex-shrink-0"
          style={{ background: 'white', borderBottom: '1px solid var(--tqf-beige-border)' }}
        >
          <Link href="/planner" className="flex items-center gap-2.5 transition-opacity hover:opacity-70">
            <Image
              src="/logo.png"
              alt="Te Quiero Feliz"
              width={28}
              height={28}
              className="object-contain"
              style={{ filter: 'invert(9%) sepia(80%) saturate(900%) hue-rotate(308deg) brightness(145%)' }}
            />
            <span style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontSize: '1rem', fontWeight: 300, letterSpacing: '0.02em' }}>
              Te Quiero Feliz
            </span>
          </Link>
        </header>
        <div className="flex-1">
          <CashControlGuard>{children}</CashControlGuard>
        </div>
      </div>
    </CashControlAuthContextProvider>
    </AdminAuthContextProvider>
  );
}
