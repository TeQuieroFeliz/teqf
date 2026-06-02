'use client';

// Moved to /admin/users — keeping this redirect for backward compatibility.

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PlannerUsersRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/users'); }, [router]);
  return null;
}
