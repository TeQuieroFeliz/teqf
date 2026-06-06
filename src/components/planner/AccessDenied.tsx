// PART-1: AccessDenied replaces the previous `if (!adminUser) return null` pattern
// that caused a blank white screen when a user lacked permission.

import { Lock } from 'lucide-react';
import Link from 'next/link';

export default function AccessDenied() {
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
          Accesso non consentito
        </h1>
        <p
          className="text-sm mb-6"
          style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
        >
          Non hai i permessi necessari per visualizzare questa sezione.
          Contatta l&apos;amministratore se ritieni che si tratti di un errore.
        </p>
        <Link
          href="/planner"
          className="inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-lg transition-opacity hover:opacity-80"
          style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
        >
          Torna alla dashboard
        </Link>
      </div>
    </div>
  );
}
