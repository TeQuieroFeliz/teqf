'use client';

import { useI18n } from '@/hooks/useI18n';
import { Eye } from 'lucide-react';

export default function ReadOnlyBanner() {
  const { t } = useI18n();
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 mb-4"
      style={{
        background: 'var(--tqf-cipria-light)',
        borderBottom: '1px solid var(--tqf-cipria)',
        color: 'var(--tqf-bordeaux)',
      }}
    >
      <Eye className="size-4 flex-shrink-0" />
      <p className="text-sm" style={{ fontFamily: 'var(--font-body)' }}>
        {t('readOnlyBanner')}
      </p>
    </div>
  );
}
