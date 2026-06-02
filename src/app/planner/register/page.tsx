'use client';

import { auth, db } from '@/firebase/client';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PlannerRegisterPage() {
  const router = useRouter();

  const [name, setName]               = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');
  const [showPwd, setShowPwd]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [done, setDone]               = useState(false);
  const [countdown, setCountdown]     = useState(3);

  useEffect(() => {
    if (!done) return;
    if (countdown <= 0) { router.push('/planner/login'); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [done, countdown, router]);

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

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName  = name.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Inserisci un indirizzo email valido.');
      return;
    }
    if (password.length < 8) {
      setError('La password deve avere almeno 8 caratteri.');
      return;
    }
    if (password !== confirm) {
      setError('Le password non coincidono.');
      return;
    }

    setSubmitting(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, trimmedEmail, password);

      await setDoc(doc(db, 'users', user.uid), {
        email:     trimmedEmail,
        name:      trimmedName || '',
        role:      'user',
        team:      [],
        active:    false,
        createdAt: serverTimestamp(),
      });

      setDone(true);
    } catch (err: any) {
      const msg =
        err.code === 'auth/email-already-in-use' ? 'Questa email è già registrata.' :
        err.code === 'auth/invalid-email'         ? 'Email non valida.'              :
        err.code === 'auth/weak-password'         ? 'Password troppo debole.'        :
        err.message ?? 'Errore durante la registrazione. Riprova.';
      setError(msg);
    }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--tqf-beige)' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-2">
          <Image
            src="/logo.png"
            alt="Te Quiero Feliz"
            width={56}
            height={56}
            className="object-contain"
            style={{ filter: 'invert(9%) sepia(80%) saturate(900%) hue-rotate(308deg) brightness(145%)' }}
          />
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
          /* ── Success state ── */
          <div className="rounded-2xl p-7 text-center" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="size-12" style={{ color: '#15803d' }} />
            </div>
            <h2 className="text-xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 300 }}>
              Account creato!
            </h2>
            <p className="text-sm mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Il tuo account è stato creato. Un amministratore lo attiverà a breve.
            </p>
            <p className="text-xs mb-5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', opacity: 0.7 }}>
              Reindirizzamento al login tra {countdown}…
            </p>
            <Link
              href="/planner/login"
              className="inline-block text-sm transition-opacity hover:opacity-70"
              style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}
            >
              Vai al login →
            </Link>
          </div>
        ) : (
          /* ── Registration form ── */
          <div className="rounded-2xl p-7" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <h1 className="text-xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 300 }}>
              Registrati
            </h1>
            <p className="text-xs mb-6" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Crea un account per accedere all&apos;area planner
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Email */}
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
                  autoFocus
                  placeholder="planner@example.com"
                  style={inputStyle}
                />
              </div>

              {/* Name (optional) */}
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  Nome
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="given-name"
                  placeholder="Maria García"
                  style={inputStyle}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  Password * (min. 8 caratteri)
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    style={{ ...inputStyle, paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--tqf-muted)' }}
                  >
                    {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {password.length > 0 && password.length < 8 && (
                  <p className="mt-1 text-xs" style={{ color: '#991b1b', fontFamily: 'var(--font-body)' }}>
                    Ancora {8 - password.length} {8 - password.length === 1 ? 'carattere' : 'caratteri'} necessari
                  </p>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  Conferma password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    style={{ ...inputStyle, paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--tqf-muted)' }}
                  >
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {confirm.length > 0 && (
                  <p className="mt-1 text-xs" style={{ color: password === confirm ? '#15803d' : '#991b1b', fontFamily: 'var(--font-body)' }}>
                    {password === confirm ? '✓ Le password coincidono' : '✗ Le password non coincidono'}
                  </p>
                )}
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
                Registrati
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
