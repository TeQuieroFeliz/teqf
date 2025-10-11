'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import AuthorizationProvider from './AuthorizationProvider';

function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();
  return (
    <AuthorizationProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AuthorizationProvider>
  );
}

export default Providers;
