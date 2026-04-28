'use client';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Email o password non corretti.',
  'auth/user-not-found': 'Nessun account trovato con questa email.',
  'auth/wrong-password': 'Password non corretta.',
  'auth/too-many-requests': 'Troppi tentativi. Riprova più tardi.',
  'auth/user-disabled': 'Account disabilitato.',
};

export default function AdminLoginPage() {
  const { login } = useAdminAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      const code = err?.code as string;
      setError(FIREBASE_ERROR_MESSAGES[code] ?? 'Accesso non autorizzato.');
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--tqf-beige)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-2"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
          >
            Pannello
          </p>
          <h1
            className="text-4xl"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--tqf-bordeaux)',
              fontWeight: 300,
              letterSpacing: '0.05em',
            }}
          >
            Te Quiero Feliz
          </h1>
          <div
            className="mx-auto mt-3 h-px w-16"
            style={{ background: 'var(--tqf-cipria)' }}
          />
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 shadow-sm"
          style={{
            background: 'white',
            border: '1px solid var(--tqf-beige-border)',
          }}
        >
          <h2
            className="text-lg mb-6"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--tqf-dark)',
              fontWeight: 400,
            }}
          >
            Accesso amministratori
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                className="text-xs uppercase tracking-widest"
                style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-4"
                  style={{ color: 'var(--tqf-muted)' }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="admin@tequierofeliz.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: 'var(--tqf-beige)',
                    border: '1px solid var(--tqf-beige-border)',
                    color: 'var(--tqf-dark)',
                    fontFamily: 'var(--font-body)',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--tqf-bordeaux)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--tqf-beige-border)')}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                className="text-xs uppercase tracking-widest"
                style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-4"
                  style={{ color: 'var(--tqf-muted)' }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: 'var(--tqf-beige)',
                    border: '1px solid var(--tqf-beige-border)',
                    color: 'var(--tqf-dark)',
                    fontFamily: 'var(--font-body)',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--tqf-bordeaux)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--tqf-beige-border)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--tqf-muted)' }}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p
                className="text-xs py-2 px-3 rounded-lg"
                style={{
                  color: '#991b1b',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg text-sm font-medium tracking-wide transition-opacity disabled:opacity-60 mt-2"
              style={{
                background: 'var(--tqf-bordeaux)',
                color: 'white',
                fontFamily: 'var(--font-body)',
              }}
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin mx-auto" />
              ) : (
                'Accedi'
              )}
            </button>
          </form>
        </div>

        <p
          className="text-center mt-6 text-xs"
          style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
        >
          Accesso riservato agli amministratori
        </p>
      </div>
    </div>
  );
}
