'use client';

import { usePlannerAuth } from '@/context/PlannerAuthContext';
import AccessDenied from '@/components/planner/AccessDenied';
import { auth } from '@/firebase/client';
import { Loader2, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

type RoleOption = 'admin' | 'team' | 'remove';

const ROLE_OPTIONS: { value: RoleOption; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Crea eventos, asigna usuarios, ve todos los balances' },
  { value: 'team', label: 'Equipo', description: 'Ve eventos asignados, registra dinero y gastos' },
  { value: 'remove', label: 'Eliminar acceso', description: 'Quita el acceso Cash Control al usuario' },
];

export default function CashControlUsersPage() {
  const { adminUser, isLoading } = usePlannerAuth();

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<RoleOption>('team');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  // BUG-09 fix: replaced `return null` with AccessDenied.
  if (!adminUser) return <AccessDenied />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    setResult(null);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No hay sesión activa.');

      const token = await currentUser.getIdToken(true);

      const res = await fetch('/api/cash-control/set-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          role,
          fullName: fullName.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({ ok: false, message: data.error ?? 'Error desconocido.' });
      } else {
        setResult({ ok: true, message: data.message });
        if (role !== 'remove') {
          setEmail('');
          setFullName('');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado.';
      setResult({ ok: false, message: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      {/* Header */}
      <header
        className="border-b px-6 py-4 flex items-center gap-4"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}
      >
        <Link
          href="/planner"
          className="text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}
        >
          ← Admin
        </Link>
        <div className="flex items-center gap-2">
          <Shield className="size-4" style={{ color: 'var(--tqf-bordeaux)' }} />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--tqf-dark)',
              fontSize: '1.1rem',
              fontWeight: 400,
            }}
          >
            Cash Control · Acceso de usuarios
          </span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-10">
        <div className="mb-6">
          <h1
            className="text-3xl mb-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 300 }}
          >
            Gestión de acceso
          </h1>
          <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            Asigna o elimina el acceso Cash Control por email.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-6 space-y-5"
          style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
        >
          {/* Email */}
          <div>
            <label
              className="block text-xs mb-1.5 uppercase tracking-wide"
              style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
            >
              Email del usuario *
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="nombre@ejemplo.com"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{
                border: '1px solid var(--tqf-beige-border)',
                background: 'var(--tqf-beige)',
                fontFamily: 'var(--font-body)',
                color: 'var(--tqf-dark)',
              }}
            />
            <p className="text-xs mt-1.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              El usuario debe tener una cuenta activa en Firebase Auth (login del sitio).
            </p>
          </div>

          {/* Full name (optional) */}
          {role !== 'remove' && (
            <div>
              <label
                className="block text-xs mb-1.5 uppercase tracking-wide"
                style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
              >
                Nombre completo (opcional)
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Nancy López"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{
                  border: '1px solid var(--tqf-beige-border)',
                  background: 'var(--tqf-beige)',
                  fontFamily: 'var(--font-body)',
                  color: 'var(--tqf-dark)',
                }}
              />
            </div>
          )}

          {/* Role */}
          <div>
            <label
              className="block text-xs mb-2 uppercase tracking-wide"
              style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
            >
              Rol
            </label>
            <div className="space-y-2">
              {ROLE_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className="flex items-start gap-3 rounded-xl px-4 py-3 cursor-pointer transition-all"
                  style={{
                    border: `1.5px solid ${role === opt.value ? 'var(--tqf-bordeaux)' : 'var(--tqf-beige-border)'}`,
                    background: role === opt.value ? 'var(--tqf-cipria-light)' : 'var(--tqf-beige)',
                  }}
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.value}
                    checked={role === opt.value}
                    onChange={() => setRole(opt.value)}
                    className="mt-0.5 flex-shrink-0"
                    style={{ accentColor: 'var(--tqf-bordeaux)' }}
                  />
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{
                        fontFamily: 'var(--font-body)',
                        color: role === opt.value ? 'var(--tqf-bordeaux)' : 'var(--tqf-dark)',
                      }}
                    >
                      {opt.label}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
                    >
                      {opt.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Result feedback */}
          {result && (
            <div
              className="flex items-start gap-3 rounded-xl p-4"
              style={{
                background: result.ok ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${result.ok ? '#bbf7d0' : '#fecaca'}`,
              }}
            >
              {result.ok ? (
                <CheckCircle2 className="size-4 flex-shrink-0 mt-0.5" style={{ color: '#166534' }} />
              ) : (
                <AlertCircle className="size-4 flex-shrink-0 mt-0.5" style={{ color: '#991b1b' }} />
              )}
              <p
                className="text-sm"
                style={{
                  color: result.ok ? '#166534' : '#991b1b',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {result.message}
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !email.trim()}
            className="w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : role === 'remove' ? (
              'Eliminar acceso'
            ) : (
              `Asignar rol: ${role === 'admin' ? 'Admin' : 'Equipo'}`
            )}
          </button>
        </form>

        {/* Info box */}
        <div
          className="mt-6 rounded-2xl p-5"
          style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
        >
          <p
            className="text-xs font-medium mb-2 uppercase tracking-wide"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
          >
            Información importante
          </p>
          <ul
            className="text-sm space-y-1.5"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
          >
            <li>• El usuario debe tener cuenta en Firebase (registro normal del sitio).</li>
            <li>• Los cambios de rol usan Firebase custom claims.</li>
            <li>• Después de asignar, el usuario debe cerrar sesión y volver a entrar.</li>
            <li>• El acceso a Cash Control es independiente del rol del sitio.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
