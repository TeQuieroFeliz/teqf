'use client';

import { createSignupRequest } from '@/actions/planner/planner-requests';
import { CheckCircle2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function SignUpPage() {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [done, setDone]         = useState(false);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 0.875rem',
    borderRadius: '0.625rem',
    border: '1px solid var(--tqf-beige-border)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.875rem',
    color: 'var(--tqf-dark)',
    background: 'white',
    outline: 'none',
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim())  { setError('Il nome è obbligatorio.'); return; }
    if (!email.trim()) { setError("L'email è obbligatoria."); return; }
    if (!phone.trim()) { setError('Il numero di telefono è obbligatorio.'); return; }

    setSubmitting(true);
    const result = await createSignupRequest(name.trim(), email.trim().toLowerCase(), phone.trim());
    if (!result.success) {
      setError(result.error ?? 'Errore durante la registrazione.');
    } else {
      setDone(true);
    }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--tqf-beige)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-2">
          <Link href="/">
            <Image
              src="/logo.png"
              alt="Te Quiero Feliz"
              width={56}
              height={56}
              className="object-contain"
              style={{ filter: 'invert(9%) sepia(80%) saturate(900%) hue-rotate(308deg) brightness(145%)' }}
            />
          </Link>
          <div className="text-center">
            <p style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontSize: '1.4rem', fontWeight: 300, lineHeight: 1.1 }}>
              Te Quiero Feliz
            </p>
            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-muted)', fontSize: '0.65rem', letterSpacing: '0.18em', marginTop: '4px' }}>
              AREA PLANNER
            </p>
          </div>
        </div>

        {done ? (
          <div className="rounded-2xl p-7 text-center" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="size-12" style={{ color: '#15803d' }} />
            </div>
            <h2 className="text-xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 300 }}>
              Richiesta inviata!
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              La tua richiesta è stata ricevuta. Riceverai un&apos;email non appena il tuo account verrà approvato.
            </p>
            <Link
              href="/planner/login"
              className="mt-6 inline-block text-sm transition-opacity hover:opacity-70"
              style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}
            >
              Torna al login
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl p-7" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <h1 className="text-xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 300 }}>
              Richiedi accesso
            </h1>
            <p className="text-xs mb-6" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Invia una richiesta di accesso. Sarà l&apos;amministratore ad approvarla.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  Nome e cognome *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  placeholder="Maria García"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="nome@example.com"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  Telefono *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="+52 55 1234 5678"
                  style={inputStyle}
                />
              </div>

              {error && (
                <p className="text-xs py-2.5 px-3 rounded-lg" style={{ background: '#fef2f2', color: '#991b1b', fontFamily: 'var(--font-body)', border: '1px solid #fecaca' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-opacity hover:opacity-80 disabled:opacity-50 mt-2"
                style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Invia richiesta
              </button>
            </form>
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 mt-5">
          <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            Hai già un account?
          </p>
          <Link
            href="/planner/login"
            className="text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}
          >
            Accedi
          </Link>
        </div>
      </div>
    </div>
  );
}
