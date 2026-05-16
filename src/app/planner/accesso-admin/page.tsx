'use client';

import { getAdminByEmail } from '@/actions/admin/user-crud';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import {
  AdminPermissionLevel,
  AdminUser,
  ALL_PERMISSIONS,
  PERMISSION_LEVEL_LABELS,
  ROLE_LABELS,
} from '@/lib/admin-types';
import { ArrowLeft, ExternalLink, Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const PERMISSION_COLORS: Record<AdminPermissionLevel, { bg: string; text: string }> = {
  none:   { bg: '#f3f4f6', text: '#6b7280' },
  view:   { bg: '#eff6ff', text: '#1d4ed8' },
  editor: { bg: '#fdf2f4', text: '#5C1A28' },
};

export default function PlannerAdminAccessPage() {
  const { plannerUser } = usePlannerAuth();
  const [adminRecord, setAdminRecord] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!plannerUser?.email) return;
    getAdminByEmail(plannerUser.email)
      .then(setAdminRecord)
      .finally(() => setLoading(false));
  }, [plannerUser]);

  if (!plannerUser) return null;

  const hasAccess = !!adminRecord;

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      <header
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}
      >
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-75">
          <Image
            src="/logo.png"
            alt="Te Quiero Feliz"
            width={36}
            height={36}
            className="object-contain"
            style={{ filter: 'invert(9%) sepia(80%) saturate(900%) hue-rotate(308deg) brightness(145%)' }}
          />
          <div>
            <p style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontSize: '1.1rem', fontWeight: 300, lineHeight: 1.2 }}>
              Te Quiero Feliz
            </p>
            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-muted)', fontSize: '0.6rem', letterSpacing: '0.18em' }}>
              AREA PLANNER
            </p>
          </div>
        </Link>
        <Link
          href="/planner"
          className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
        >
          <ArrowLeft className="size-4" />
          Dashboard
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 300 }}>
          Accesso Admin
        </h1>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
          </div>
        ) : !hasAccess ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
          >
            <div
              className="mx-auto mb-4 size-14 rounded-2xl flex items-center justify-center"
              style={{ background: '#f3f4f6', color: '#6b7280' }}
            >
              <ShieldOff className="size-6" />
            </div>
            <h2 className="text-lg mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              Nessun accesso admin
            </h2>
            <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Non hai accesso al pannello di amministrazione. Contatta un super admin se ritieni che si tratti di un errore.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status card */}
            <div
              className="rounded-2xl p-6"
              style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="size-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}
                >
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)' }}>
                    Accesso al pannello admin attivo
                  </p>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}
                  >
                    {ROLE_LABELS[adminRecord.role] ?? adminRecord.role}
                  </span>
                </div>
              </div>

              <Link
                href="/admin"
                target="_blank"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm transition-opacity hover:opacity-80"
                style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
              >
                <ExternalLink className="size-4" />
                Apri pannello admin
              </Link>
            </div>

            {/* Permissions card */}
            <div
              className="rounded-2xl p-6"
              style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
            >
              <h2 className="text-base mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
                I tuoi permessi
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALL_PERMISSIONS.map(({ key, label }) => {
                  const level: AdminPermissionLevel = adminRecord.permissions?.[key] ?? 'none';
                  const colors = PERMISSION_COLORS[level];
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between px-3 py-2 rounded-lg"
                      style={{ border: '1px solid var(--tqf-beige-border)' }}
                    >
                      <span className="text-sm" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                        {label}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: colors.bg, color: colors.text, fontFamily: 'var(--font-body)' }}
                      >
                        {PERMISSION_LEVEL_LABELS[level]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
