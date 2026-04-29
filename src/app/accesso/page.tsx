'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const rawFrom = params.get('from') ?? '/';
  const BLOCKED = ['/login', '/register', '/forgot-password', '/accesso'];
  const from = BLOCKED.some(p => rawFrom.startsWith(p)) ? '/' : rawFrom;

  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/site-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (res.ok) {
      router.push(from);
      router.refresh();
    } else {
      setError('Password errata. Riprova.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
      <input
        type="password"
        placeholder="Password"
        value={password}
        autoFocus
        onChange={e => setPassword(e.target.value)}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          borderRadius: '0.75rem',
          border: error ? '1px solid #c53030' : '1px solid var(--tqf-beige-border)',
          fontFamily: 'var(--font-body)',
          fontSize: '0.9375rem',
          color: 'var(--tqf-dark)',
          background: 'white',
          outline: 'none',
          letterSpacing: '0.1em',
        }}
      />
      {error && (
        <p style={{ color: '#c53030', fontSize: '0.8125rem', fontFamily: 'var(--font-body)', marginTop: '-0.5rem' }}>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading || !password}
        className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
        style={{
          background: 'var(--tqf-bordeaux)',
          color: 'white',
          fontFamily: 'var(--font-body)',
          letterSpacing: '0.08em',
          border: 'none',
          cursor: loading || !password ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : 'Accedi'}
      </button>
    </form>
  );
}

export default function AccessoPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--tqf-beige)', fontFamily: 'var(--font-body)' }}
    >
      <div
        className="w-full max-w-sm flex flex-col items-center gap-8 rounded-3xl p-10"
        style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/logo.png"
            alt="Te Quiero Feliz"
            width={64}
            height={64}
            className="object-contain"
            style={{ filter: 'invert(11%) sepia(57%) saturate(1200%) hue-rotate(314deg) brightness(80%) contrast(95%)' }}
            priority
          />
          <div className="text-center">
            <p style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontSize: '1.35rem', fontWeight: 600, letterSpacing: '0.02em', lineHeight: 1.1 }}>
              Te Quiero Feliz
            </p>
            <p style={{ color: 'var(--tqf-muted)', fontSize: '0.55rem', letterSpacing: '0.16em', marginTop: '4px', textTransform: 'uppercase' }}>
              Luxury Floral & Event Design
            </p>
          </div>
        </div>

        <div className="w-full h-px" style={{ background: 'var(--tqf-beige-border)' }} />

        <div className="text-center">
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontSize: '1.25rem', fontWeight: 300 }}>
            Accesso riservato
          </h1>
          <p style={{ color: 'var(--tqf-muted)', fontSize: '0.8125rem', marginTop: '4px' }}>
            Inserisci la password per continuare
          </p>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
