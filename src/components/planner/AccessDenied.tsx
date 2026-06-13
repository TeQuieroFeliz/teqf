'use client';

import { useI18n } from '@/hooks/useI18n';
import { Lock } from 'lucide-react';
import Link from 'next/link';

export default function AccessDenied() {
  const { t } = useI18n();
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--tqf-beige)' }}
    >
      <div className="text-center px-6 max-w-sm">
        <div
          className="mx-auto mb-5 size-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}
        >
          <Lock className="size-7" />
        </div>
        <h1
          className="text-xl mb-2"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 300 }}
        >
          {t('accessDeniedTitle')}
        </h1>
        <p
          className="text-sm mb-6"
          style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
        >
          {t('accessDeniedDesc')}
        </p>
        <Link
          href="/planner"
          className="inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-lg transition-opacity hover:opacity-80"
          style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
        >
          {t('backToDashboard')}
        </Link>
      </div>
    </div>
  );
}
