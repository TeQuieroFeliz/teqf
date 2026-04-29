'use client';
import { auth, db } from '@/firebase/client';
import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';

const SUPERADMIN_EMAIL = 'admin@tequierofeliz.com';

export default function AdminSeedPage() {
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await signInWithEmailAndPassword(auth, SUPERADMIN_EMAIL, password);

      const existing = await getDocs(
        query(
          collection(db, 'admins'),
          where('email', '==', SUPERADMIN_EMAIL),
          limit(1)
        )
      );

      if (!existing.empty) {
        setMessage('Superadmin già esistente.');
        setStatus('success');
        return;
      }

      await addDoc(collection(db, 'admins'), {
        email: SUPERADMIN_EMAIL,
        role: 'superadmin',
        permissions: {
          blog: 'admin',
          portfolio: 'admin',
          catalog: 'admin',
          events: 'admin',
          users: 'admin',
          planners: 'admin',
        },
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        active: true,
      });

      setMessage('Superadmin creato con successo! Vai a /admin/login per accedere.');
      setStatus('success');
    } catch (err: any) {
      setMessage(err?.message ?? 'Errore durante la creazione.');
      setStatus('error');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--tqf-beige)' }}
    >
      <div className="w-full max-w-sm">
        <div
          className="rounded-2xl p-8 shadow-sm"
          style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
        >
          <h1
            className="text-2xl mb-2"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontWeight: 300 }}
          >
            Inizializzazione Admin
          </h1>
          <p
            className="text-xs mb-6"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
          >
            Inserisci la password di <strong>{SUPERADMIN_EMAIL}</strong> per creare il documento superadmin in Firestore.
            <br />
            <span className="text-red-500">Elimina questa pagina dopo l&apos;uso.</span>
          </p>

          {status === 'success' ? (
            <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">{message}</p>
          ) : (
            <form onSubmit={handleSeed} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Password di admin@tequierofeliz.com"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
                style={{
                  background: 'var(--tqf-beige)',
                  border: '1px solid var(--tqf-beige-border)',
                  fontFamily: 'var(--font-body)',
                }}
              />
              {status === 'error' && (
                <p className="text-xs text-red-600">{message}</p>
              )}
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-60"
                style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
              >
                {status === 'loading' ? 'Creazione...' : 'Crea Superadmin'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
