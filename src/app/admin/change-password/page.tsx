'use client';

import { clearAdminMustChangePassword } from '@/actions/admin/user-crud';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { auth } from '@/firebase/client';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { Eye, EyeOff, KeyRound, Loader2, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AdminChangePasswordPage() {
  const { adminUser, logout } = useAdminAuth();
  const router = useRouter();

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!adminUser) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPwd.length < 8) {
      setError('La nuova password deve essere di almeno 8 caratteri.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setError('Le password non coincidono.');
      return;
    }

    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('Sessione non valida.');

      const credential = EmailAuthProvider.credential(user.email, currentPwd);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPwd);
      await clearAdminMustChangePassword(adminUser!.id);
      router.replace('/admin');
    } catch (err: any) {
      const code = err?.code as string;
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Password attuale non corretta.');
      } else if (code === 'auth/too-many-requests') {
        setError('Troppi tentativi. Riprova più tardi.');
      } else {
        setError(err.message ?? 'Errore durante il cambio password.');
      }
    } finally {
      setSaving(false);
    }
  }

  const inputBase: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 2.5rem 0.625rem 0.875rem',
    borderRadius: '0.625rem',
    border: '1px solid var(--tqf-beige-border)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.875rem',
    color: 'var(--tqf-dark)',
    background: 'var(--tqf-beige)',
    outline: 'none',
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--tqf-beige)' }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div
            className="mx-auto mb-4 size-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}
          >
            <KeyRound className="size-6" />
          </div>
          <h1
            className="text-3xl"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontWeight: 300 }}
          >
            Te Quiero Feliz
          </h1>
          <p
            className="mt-2 text-sm"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
          >
            Cambia la tua password per continuare
          </p>
        </div>

        <div
          className="rounded-2xl p-8 shadow-sm"
          style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
        >
          <h2
            className="text-lg mb-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}
          >
            Imposta una nuova password
          </h2>
          <p
            className="text-xs mb-6"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
          >
            Per sicurezza, devi cambiare la password temporanea prima di accedere al pannello.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current password */}
            <div className="space-y-1.5">
              <label
                className="text-xs uppercase tracking-widest"
                style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
              >
                Password attuale
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: 'var(--tqf-muted)' }} />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{ ...inputBase, paddingLeft: '2.5rem' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--tqf-bordeaux)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--tqf-beige-border)')}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--tqf-muted)' }}
                >
                  {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div className="space-y-1.5">
              <label
                className="text-xs uppercase tracking-widest"
                style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
              >
                Nuova password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: 'var(--tqf-muted)' }} />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Minimo 8 caratteri"
                  style={{ ...inputBase, paddingLeft: '2.5rem' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--tqf-bordeaux)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--tqf-beige-border)')}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--tqf-muted)' }}
                >
                  {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label
                className="text-xs uppercase tracking-widest"
                style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
              >
                Conferma password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: 'var(--tqf-muted)' }} />
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  required
                  placeholder="Ripeti la nuova password"
                  style={{ ...inputBase, paddingLeft: '2.5rem' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--tqf-bordeaux)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--tqf-beige-border)')}
                />
              </div>
            </div>

            {error && (
              <p
                className="text-xs py-2 px-3 rounded-lg"
                style={{ color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', fontFamily: 'var(--font-body)' }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-lg text-sm font-medium tracking-wide transition-opacity disabled:opacity-60 mt-2"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
            >
              {saving ? <Loader2 className="size-4 animate-spin mx-auto" /> : 'Imposta nuova password'}
            </button>
          </form>
        </div>

        <button
          onClick={logout}
          className="mt-4 w-full text-xs text-center transition-opacity hover:opacity-70"
          style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
        >
          Esci dall&apos;account
        </button>
      </div>
    </div>
  );
}
