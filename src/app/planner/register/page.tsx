'use client';
import { useState } from 'react';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db } from '@/firebase/client';
import { CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();
    const displayName  = name.trim() || trimmedEmail.split('@')[0];

    if (!trimmedEmail || !password || !confirmPassword) {
      setError('Compila tutti i campi obbligatori.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Le password non corrispondono.');
      return;
    }
    if (password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri.');
      return;
    }

    setLoading(true);

    try {
      // 1. Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      const user = userCredential.user;

      // 2. Create users/{uid} doc with pending status
      await setDoc(doc(db, 'users', user.uid), {
        email:     trimmedEmail,
        name:      displayName,
        role:      'user',
        team:      [],
        status:    'pending',
        createdAt: new Date(),
      });

      // 3. Create planners/{uid} doc — login check reads status from here
      await setDoc(doc(db, 'planners', user.uid), {
        email:     trimmedEmail,
        name:      displayName,
        team:      [],
        status:    'pending',
        active:    false,
        createdAt: new Date(),
      });

      // 5. Create plannerRequests/{uid} entry for admin review
      await setDoc(doc(db, 'plannerRequests', user.uid), {
        uid:       user.uid,
        email:     trimmedEmail,
        name:      displayName,
        status:    'pending',
        createdAt: new Date(),
      });

      // 6. Notify via email (fire-and-forget — non-blocking)
      fetch('/api/email/registration-pending', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: trimmedEmail, name: displayName }),
      }).catch(console.error);

      // 7. Sign out immediately so user cannot access dashboard
      await signOut(auth);

      // 8. Show pending-approval success screen
      setSuccess(true);
    } catch (err: any) {
      const msg =
        err.code === 'auth/email-already-in-use' ? 'Questa email è già registrata.' :
        err.code === 'auth/invalid-email'         ? 'Indirizzo email non valido.'     :
        err.code === 'auth/weak-password'         ? 'Password troppo debole.'        :
        err.message ?? 'Errore durante la registrazione.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-rose-50 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <CheckCircle2 className="mx-auto mb-4 size-12 text-green-600" />
            <h2 className="text-xl font-medium mb-3">Registrazione completata!</h2>
            <p className="text-gray-600 text-sm mb-2">
              La tua richiesta è in attesa di approvazione da parte dell&apos;amministratore.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Riceverai una email quando il tuo account sarà attivato e potrai accedere alla piattaforma.
            </p>
            <Link
              href="/planner/login"
              className="inline-block text-sm font-medium text-rose-800 hover:underline"
            >
              Torna al login →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-rose-50 p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif mb-2">Te Quiero Feliz</h1>
          <p className="text-gray-600">Crea un account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h2 className="text-xl font-medium mb-1">Registrazione</h2>
          <p className="text-gray-500 text-xs mb-6">
            Dopo la registrazione l&apos;admin approverà il tuo account
          </p>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                placeholder="nome@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-300"
              />
            </div>

            {/* Name (optional) */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="given-name"
                placeholder="Maria García"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-300"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Conferma password *</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-300"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <p className={`mt-1 text-xs ${password === confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                  {password === confirmPassword ? '✓ Le password coincidono' : '✗ Le password non coincidono'}
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-medium bg-rose-800 text-white hover:bg-rose-900 disabled:opacity-50 transition-colors mt-2 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading ? 'Creando account…' : 'Registrati'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          Hai già un account?{' '}
          <Link href="/planner/login" className="text-rose-800 font-medium hover:underline">
            Accedi
          </Link>
        </p>

      </div>
    </div>
  );
}
