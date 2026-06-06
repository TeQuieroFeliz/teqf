// PART-1: ReadOnlyBanner is shown at the top of pages where canView=true but canEdit=false.

import { Eye } from 'lucide-react';

export default function ReadOnlyBanner() {
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
        Sei in modalità sola lettura — il tuo team non può modificare questa sezione.
      </p>
    </div>
  );
}
