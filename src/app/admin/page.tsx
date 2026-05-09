'use client';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { AdminPermissionLevel } from '@/lib/admin-types';
import {
  BookOpen,
  Calendar,
  ClipboardList,
  Flower2,
  Image as ImageIcon,
  LogOut,
  Sofa,
  Users,
  Wallet,
} from 'lucide-react';

type Section = {
  key: keyof import('@/lib/admin-types').AdminPermissions;
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
};

const SECTIONS: Section[] = [
  {
    key: 'cashControl',
    label: 'Cash Control',
    description: 'Gestisci conti, movimenti e chiusure delle planner',
    icon: <Wallet className="size-5" />,
    href: '/area-planner/cash-control/admin',
  },
  {
    key: 'blog',
    label: 'Blog',
    description: 'Gestisci articoli e contenuti editoriali',
    icon: <BookOpen className="size-5" />,
    href: '/admin/blog',
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    description: 'Galleria progetti e lavori realizzati',
    icon: <ImageIcon className="size-5" />,
    href: '/admin/portfolio',
  },
  {
    key: 'events',
    label: 'Eventi',
    description: 'Gestione eventi e sotto-eventi',
    icon: <Calendar className="size-5" />,
    href: '/admin/events',
  },
  {
    key: 'users',
    label: 'Utenti',
    description: 'Gestione account e accessi',
    icon: <Users className="size-5" />,
    href: '/admin/users',
  },
  {
    key: 'planners',
    label: 'Planner',
    description: 'Wedding planner, collaboratori ed eventi',
    icon: <ClipboardList className="size-5" />,
    href: '/admin/planners',
  },
  {
    key: 'furniture',
    label: 'Catalogo Mobili',
    description: 'Sedie, tavoli, divani e allestimenti',
    icon: <Sofa className="size-5" />,
    href: '/admin/furniture',
  },
  {
    key: 'flowers',
    label: 'Catalogo Fiori',
    description: 'Fiori e composizioni floreali',
    icon: <Flower2 className="size-5" />,
    href: '/admin/flowers',
  },
];

const PERMISSION_LABELS: Record<AdminPermissionLevel, string> = {
  none: 'Nessun accesso',
  read: 'Solo lettura',
  write: 'Lettura e scrittura',
  admin: 'Amministratore',
};

const PERMISSION_COLORS: Record<AdminPermissionLevel, { bg: string; text: string }> = {
  none: { bg: '#f3f4f6', text: '#6b7280' },
  read: { bg: '#eff6ff', text: '#1d4ed8' },
  write: { bg: '#fef9ee', text: '#b45309' },
  admin: { bg: '#fdf2f4', text: '#5C1A28' },
};

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Amministratore',
  editor: 'Editor',
  viewer: 'Visualizzatore',
};

export default function AdminDashboardPage() {
  const { adminUser, logout } = useAdminAuth();

  if (!adminUser) return null;

  const isSuperAdmin = adminUser.role === 'superadmin';
  const accessibleSections = isSuperAdmin
    ? SECTIONS
    : SECTIONS.filter((s) => (adminUser.permissions[s.key] ?? 'none') !== 'none');

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      {/* Header */}
      <header
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{
          background: 'white',
          borderColor: 'var(--tqf-beige-border)',
        }}
      >
        <div>
          <p
            className="text-xs tracking-[0.25em] uppercase"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
          >
            Pannello di controllo
          </p>
          <h1
            className="text-2xl mt-0.5"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--tqf-bordeaux)',
              fontWeight: 300,
            }}
          >
            Te Quiero Feliz
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p
              className="text-sm"
              style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}
            >
              {adminUser.email}
            </p>
            <span
              className="inline-block text-xs px-2 py-0.5 rounded-full mt-0.5"
              style={{
                background: 'var(--tqf-cipria-light)',
                color: 'var(--tqf-bordeaux)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {ROLE_LABELS[adminUser.role] ?? adminUser.role}
            </span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{
              color: 'var(--tqf-muted)',
              border: '1px solid var(--tqf-beige-border)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Esci</span>
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Welcome */}
        <div className="mb-10">
          <h2
            className="text-3xl"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--tqf-dark)',
              fontWeight: 300,
            }}
          >
            Benvenuto
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
          >
            {accessibleSections.length === 0
              ? 'Non hai accesso a nessuna sezione al momento.'
              : `Hai accesso a ${accessibleSections.length} ${accessibleSections.length === 1 ? 'sezione' : 'sezioni'}.`}
          </p>
        </div>

        {/* Sections grid */}
        {accessibleSections.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accessibleSections.map((section) => {
              const level: AdminPermissionLevel = isSuperAdmin ? 'admin' : (adminUser.permissions[section.key] ?? 'none');
              const colors = PERMISSION_COLORS[level];
              return (
                <a
                  key={section.key}
                  href={section.href}
                  className="group block rounded-2xl p-6 transition-shadow hover:shadow-md"
                  style={{
                    background: 'white',
                    border: '1px solid var(--tqf-beige-border)',
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="p-2.5 rounded-xl"
                      style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}
                    >
                      {section.icon}
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: colors.bg, color: colors.text, fontFamily: 'var(--font-body)' }}
                    >
                      {PERMISSION_LABELS[level]}
                    </span>
                  </div>

                  <h3
                    className="text-lg mb-1"
                    style={{
                      fontFamily: 'var(--font-display)',
                      color: 'var(--tqf-dark)',
                      fontWeight: 400,
                    }}
                  >
                    {section.label}
                  </h3>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
                  >
                    {section.description}
                  </p>
                </a>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
