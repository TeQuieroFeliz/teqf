'use client';

import { PlannerAuthContextProvider } from '@/context/PlannerAuthContext';

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return <PlannerAuthContextProvider>{children}</PlannerAuthContextProvider>;
}
