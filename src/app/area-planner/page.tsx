'use client';

import { useCashControlAuth } from '@/context/CashControlAuthContext';
import { auth } from '@/firebase/client';
import { isCashControlAdmin } from '@/lib/cash-control/permissions';
import { BadgeDollarSign, LogOut } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AreaPlannerPage() {
  const { cashControlRole, email, displayName } = useCashControlAuth();
  const isAdmin = isCashControlAdmin(cashControlRole);
  const router = useRouter();

  async function handleLogout() {
    await auth.signOut();
    router.replace('/login');
  }

  const firstWord = displayName ? displayName.split(' ')[0] : null;
  const initials = displayName
    ? displayName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : (email?.[0]?.toUpperCase() ?? '?');

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      {/* Header */}
      <header
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}
      >
        <Link href="/planner" className="flex items-center gap-3 transition-opacity hover:opacity-75">
          <Image
            src="/logo.png"
            alt="Te Quiero Feliz"
            width={36}
            height={36}
            className="object-contain"
            style={{
              filter:
                'invert(9%) sepia(80%) saturate(900%) hue-rotate(308deg) brightness(145%)',
            }}
          />
          <div>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--tqf-bordeaux)',
                fontSize: '1.1rem',
                fontWeight: 300,
                lineHeight: 1.2,
              }}
            >
              Te Quiero Feliz
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                color: 'var(--tqf-muted)',
                fontSize: '0.6rem',
                letterSpacing: '0.18em',
              }}
            >
              ÁREA INTERNA
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div
            className="size-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
            style={{
              background: 'var(--tqf-cipria)',
              color: 'var(--tqf-bordeaux)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {initials}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{
              color: 'var(--tqf-muted)',
              border: '1px solid var(--tqf-beige-border)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-lg mx-auto px-6 py-10">
        <h1
          className="text-3xl mb-1"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--tqf-dark)',
            fontWeight: 300,
          }}
        >
          {firstWord ? `Bienvenida, ${firstWord}` : 'Bienvenida'}
        </h1>
        <p
          className="text-sm mb-8"
          style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
        >
          Área interna · {isAdmin ? 'Administrador' : 'Equipo'}
        </p>

        {/* Cash Control card */}
        <Link
          href={
            isAdmin
              ? '/area-planner/cash-control/admin'
              : '/area-planner/cash-control'
          }
          className="block rounded-2xl p-6 transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'var(--tqf-bordeaux)', color: 'white' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div
              className="size-11 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              <BadgeDollarSign className="size-5" />
            </div>
            <span
              className="text-xs px-2.5 py-1 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.2)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {isAdmin ? 'Admin' : 'Equipo'}
            </span>
          </div>
          <h2
            className="text-2xl mb-1"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 300 }}
          >
            Cash Control
          </h2>
          <p
            className="text-sm"
            style={{ opacity: 0.8, fontFamily: 'var(--font-body)' }}
          >
            {isAdmin
              ? 'Gestiona eventos, usuarios y balances'
              : 'Registra dinero recibido y gastos del evento'}
          </p>
        </Link>
      </main>
    </div>
  );
}
