import { CashControlAuthContextProvider } from '@/context/CashControlAuthContext';
import { CashControlGuard } from '@/components/cash-control/CashControlGuard';
import { ReactNode } from 'react';

export default function AreaPlannerLayout({ children }: { children: ReactNode }) {
  return (
    <CashControlAuthContextProvider>
      <CashControlGuard>{children}</CashControlGuard>
    </CashControlAuthContextProvider>
  );
}
