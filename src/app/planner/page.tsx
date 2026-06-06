'use client';

import { deletePlannerEvent, getAllPlannerEvents } from '@/actions/planner/planner-event-crud';
import { db } from '@/firebase/client';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { deriveTeams } from '@/lib/user-permissions';
import { CITIES, PlannerEvent } from '@/lib/planner-types';
import { Lang, LANG_OPTIONS, T } from '@/lib/planner-i18n';
import AccessDenied from '@/components/planner/AccessDenied';
import {
  Bell,
  BookOpen,
  Calendar,
  ClipboardList,
  Clock,
  Edit2,
  Flower2,
  Image as ImageIcon,
  Loader2,
  LogOut,
  MapPin,
  Plus,
  Shield,
  Sofa,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const LANG_KEY = 'tqf-planner-lang';

// ─── Tile definitions ─────────────────────────────────────────────────────────

interface DashboardTile {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  badge?: boolean;
}

const DASHBOARD_TILES: Record<string, DashboardTile> = {
  richieste: {
    key: 'richieste',
    label: 'Richieste',
    description: 'Approva o rifiuta richieste di accesso',
    icon: <Bell className="size-5" />,
    href: '/planner/requests',
    badge: true,
  },
  gestione_utenti: {
    key: 'gestione_utenti',
    label: 'Gestione Utenti',
    description: 'Assegna team e permessi (XB / TeQF)',
    icon: <Users className="size-5" />,
    // BUG-14 note: cross-layout link, da spostare quando esisterà /planner/users
    href: '/admin/users',
  },
  cash_control: {
    key: 'cash_control',
    label: 'Cash Control',
    description: 'Gestisci entrate e uscite per ogni evento',
    icon: <Wallet className="size-5" />,
    href: '/planner/cash-control',
  },
  blog: {
    key: 'blog',
    label: 'Blog',
    description: 'Gestisci articoli e contenuti del blog',
    icon: <BookOpen className="size-5" />,
    href: '/planner/blog',
  },
  portfolio: {
    key: 'portfolio',
    label: 'Portfolio',
    description: 'Gestisci il portfolio fotografico',
    icon: <ImageIcon className="size-5" />,
    href: '/planner/portfolio',
  },
  mobili: {
    key: 'mobili',
    label: 'Mobili',
    description: 'Catalogo sedie, tavoli e allestimenti',
    icon: <Sofa className="size-5" />,
    href: '/planner/furniture',
  },
  fiori: {
    key: 'fiori',
    label: 'Fiori',
    description: 'Catalogo fiori e composizioni floreali',
    icon: <Flower2 className="size-5" />,
    href: '/planner/flowers',
  },
  eventi: {
    key: 'eventi',
    label: 'Eventi',
    description: 'Gestisci gli eventi e le pianificazioni',
    icon: <Calendar className="size-5" />,
    href: '/planner/events',
  },
  orario_lavoro: {
    key: 'orario_lavoro',
    label: 'Orario di Lavoro',
    description: 'Ore, turni e desmontaje per ogni evento',
    icon: <Clock className="size-5" />,
    href: '/planner/orario-di-lavoro',
  },
};

const ADMIN_TILE_KEYS = ['richieste', 'gestione_utenti', 'cash_control', 'blog', 'portfolio', 'mobili', 'fiori', 'eventi', 'orario_lavoro'];
const XB_TILE_KEYS    = ['eventi', 'mobili', 'fiori', 'portfolio'];
const TEQF_TILE_KEYS  = ['cash_control', 'mobili', 'fiori', 'eventi', 'orario_lavoro', 'portfolio'];

// ─── TileGrid ─────────────────────────────────────────────────────────────────

function TileGrid({ tileKeys, pendingCount = 0 }: { tileKeys: string[]; pendingCount?: number }) {
  const tiles = tileKeys.map(k => DASHBOARD_TILES[k]).filter(Boolean);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {tiles.map(tile => (
        <a
          key={tile.key}
          href={tile.href}
          className="group relative block rounded-2xl p-4 transition-all hover:shadow-md active:scale-[0.98]"
          style={{ background: 'white', border: '1px solid var(--tqf-beige-border)', textDecoration: 'none' }}
        >
          {tile.badge && pendingCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 size-5 rounded-full text-xs flex items-center justify-center font-semibold"
              style={{ background: '#d97706', color: 'white', fontFamily: 'var(--font-body)' }}
            >
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
          <div
            className="size-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}
          >
            {tile.icon}
          </div>
          <h3
            className="text-sm mb-0.5"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}
          >
            {tile.label}
          </h3>
          <p
            className="text-xs leading-relaxed hidden sm:block"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
          >
            {tile.description}
          </p>
        </a>
      ))}
    </div>
  );
}

// ─── SuperAdmin dashboard ─────────────────────────────────────────────────────

function SuperAdminDashboard() {
  const { adminUser, logout } = usePlannerAuth();
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    Promise.all([
      getDocs(query(collection(db, 'plannerEvents'), orderBy('createdAt', 'desc'))),
      getDocs(query(collection(db, 'plannerRequests'))),
    ]).then(([eSnap, rSnap]) => {
      setEvents(eSnap.docs.map(d => ({ id: d.id, ...d.data() } as PlannerEvent)));
      setPendingCount(rSnap.docs.filter(d => d.data().status === 'pending').length);
    }).finally(() => setLoading(false));
  }, []);

  // BUG-09 fix: replaced `return null` with AccessDenied.
  if (!adminUser) return <AccessDenied />;

  const cityLabel = (val: string) => CITIES.find((c) => c.value === val)?.label ?? val;

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      {/* Header */}
      <header
        className="border-b px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}
      >
        <Link href="/" className="flex items-center gap-2 sm:gap-3 transition-opacity hover:opacity-75 flex-shrink-0">
          <Image
            src="/logo.png"
            alt="Te Quiero Feliz"
            width={32}
            height={32}
            className="object-contain"
            style={{ filter: 'invert(9%) sepia(80%) saturate(900%) hue-rotate(308deg) brightness(145%)' }}
          />
          <div>
            <p style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontSize: '1rem', fontWeight: 300, lineHeight: 1.2 }}>
              Te Quiero Feliz
            </p>
            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-muted)', fontSize: '0.6rem', letterSpacing: '0.18em' }}>
              PANNELLO DI CONTROLLO
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
              {adminUser.name ?? adminUser.email}
            </p>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}
            >
              Super Admin
            </span>
          </div>
          <div
            className="size-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 sm:hidden"
            style={{ background: 'var(--tqf-cipria)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-display)' }}
          >
            <Shield className="size-4" />
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm px-2.5 py-2 rounded-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)' }}
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Esci</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1
            className="text-3xl"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 300 }}
          >
            Benvenuto
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            Dashboard completa — accesso a tutte le sezioni
          </p>
        </div>

        {/* Pending requests banner */}
        {pendingCount > 0 && (
          <Link
            href="/planner/requests"
            className="flex items-center gap-3 rounded-2xl px-5 py-4 mb-6 transition-opacity hover:opacity-90"
            style={{ background: '#fef9ee', border: '2px solid #fbbf24', textDecoration: 'none' }}
          >
            <Bell className="size-5 flex-shrink-0" style={{ color: '#d97706' }} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium" style={{ color: '#92400e', fontFamily: 'var(--font-body)' }}>
                {pendingCount} {pendingCount === 1 ? 'richiesta di accesso in attesa' : 'richieste di accesso in attesa'}
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: '#d97706', color: 'white', fontFamily: 'var(--font-body)' }}>
              Gestisci →
            </span>
          </Link>
        )}

        {/* Section tiles */}
        <div className="mb-10">
          <h2
            className="text-base mb-4"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400, letterSpacing: '0.05em' }}
          >
            Gestione
          </h2>
          <TileGrid tileKeys={ADMIN_TILE_KEYS} pendingCount={pendingCount} />
        </div>

        {/* All planner events */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-base"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400, letterSpacing: '0.05em' }}
            >
              Tutti gli eventi planner
            </h2>
            <span
              className="text-xs px-2.5 py-1 rounded-full"
              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}
            >
              {loading ? '…' : `${events.length} totali`}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
            </div>
          ) : events.length === 0 ? (
            <div
              className="rounded-2xl p-10 text-center"
              style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
            >
              <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                Nessun evento planner ancora.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((evt) => {
                const furnitureCount = (evt.days?.flatMap((d) => d.selectedFurniture ?? []) ?? evt.selectedFurniture ?? []).reduce((s, i) => s + i.quantity, 0);
                const flowerCount    = (evt.days?.flatMap((d) => d.selectedFlowers ?? [])   ?? evt.selectedFlowers   ?? []).reduce((s, i) => s + i.quantity, 0);
                return (
                  <div
                    key={evt.id}
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
                  >
                    <Link
                      href={`/planner/planners/events/${evt.id}`}
                      className="flex items-center gap-3 min-w-0 flex-1 transition-opacity hover:opacity-80"
                      style={{ textDecoration: 'none' }}
                    >
                      <div
                        className="p-2 rounded-lg flex-shrink-0"
                        style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}
                      >
                        <ClipboardList className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-sm truncate"
                          style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)', fontWeight: 500 }}
                        >
                          {evt.eventCode || evt.eventName || 'Evento senza nome'}
                        </p>
                        <div className="flex flex-wrap gap-x-3 mt-0.5">
                          {evt.plannerName && (
                            <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                              {evt.plannerName}
                            </span>
                          )}
                          {evt.clientName && (
                            <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                              {evt.clientName}
                            </span>
                          )}
                          {evt.city && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                              <MapPin className="size-2.5" />
                              {cityLabel(evt.city)}
                            </span>
                          )}
                          {(furnitureCount > 0 || flowerCount > 0) && (
                            <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                              {furnitureCount > 0 && `${furnitureCount} mobili`}
                              {furnitureCount > 0 && flowerCount > 0 && ' · '}
                              {flowerCount > 0 && `${flowerCount} fiori`}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <Link
                        href={`/planner/projects/${evt.id}`}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-opacity hover:opacity-80"
                        style={{ color: 'var(--tqf-bordeaux)', border: '1px solid var(--tqf-cipria)', background: 'var(--tqf-cipria-light)', fontFamily: 'var(--font-body)' }}
                        title="Nómina & Gastos"
                      >
                        <Users className="size-3" />
                        <span className="hidden sm:inline">Progetto</span>
                      </Link>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={
                          evt.status === 'submitted'
                            ? { background: '#fef9ee', color: '#b45309', fontFamily: 'var(--font-body)' }
                            : { background: '#f3f4f6', color: '#6b7280', fontFamily: 'var(--font-body)' }
                        }
                      >
                        {evt.status === 'submitted' ? 'Inviato' : 'Bozza'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── TeQF User dashboard ──────────────────────────────────────────────────────

function TeQFUserDashboard() {
  const { plannerUser, logout } = usePlannerAuth();
  if (!plannerUser) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      <header
        className="border-b px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}
      >
        <Link href="/" className="flex items-center gap-2 sm:gap-3 transition-opacity hover:opacity-75 flex-shrink-0">
          <Image
            src="/logo.png"
            alt="Te Quiero Feliz"
            width={32}
            height={32}
            className="object-contain"
            style={{ filter: 'invert(9%) sepia(80%) saturate(900%) hue-rotate(308deg) brightness(145%)' }}
          />
          <div className="hidden xs:block">
            <p style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontSize: '1rem', fontWeight: 300, lineHeight: 1.2 }}>
              Te Quiero Feliz
            </p>
            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-muted)', fontSize: '0.6rem', letterSpacing: '0.18em' }}>
              AREA PLANNER
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-sm hidden sm:block" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
            {plannerUser.name}
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm px-2.5 py-2 rounded-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)' }}
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Esci</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-8">
          <h1 className="text-3xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 300 }}>
            Benvenuta, {plannerUser.name}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            TeQF Team
          </p>
        </div>

        <TileGrid tileKeys={TEQF_TILE_KEYS} />
      </main>
    </div>
  );
}

// ─── XB Planner dashboard ─────────────────────────────────────────────────────

function PlannerDashboard() {
  const { plannerUser, logout, canManageCashControl } = usePlannerAuth();
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LANG_KEY) as Lang | null;
      if (stored && ['it', 'en', 'es'].includes(stored)) return stored;
    }
    return 'it';
  });

  const t = T[lang];

  const changeLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem(LANG_KEY, l);
  };

  useEffect(() => {
    if (!plannerUser) return;
    getAllPlannerEvents()
      .then(setEvents)
      .finally(() => setLoading(false));
  }, [plannerUser]);

  if (!plannerUser) return null;

  const cityLabel = (val: string) => CITIES.find((c) => c.value === val)?.label ?? val;

  async function handleDelete(evt: PlannerEvent) {
    if (!confirm(t.deleteEventConfirm(evt.eventCode || evt.eventName || t.eventNameless))) return;
    setDeletingId(evt.id);
    const result = await deletePlannerEvent(evt.id);
    if (result.success) {
      setEvents((prev) => prev.filter((e) => e.id !== evt.id));
      toast.success(t.eventDeleted);
    } else {
      toast.error(result.error ?? t.deleteError);
    }
    setDeletingId(null);
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      {/* Header */}
      <header
        className="border-b px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}
      >
        <Link href="/" className="flex items-center gap-2 sm:gap-3 transition-opacity hover:opacity-75 flex-shrink-0">
          <Image
            src="/logo.png"
            alt="Te Quiero Feliz"
            width={32}
            height={32}
            className="object-contain"
            style={{ filter: 'invert(9%) sepia(80%) saturate(900%) hue-rotate(308deg) brightness(145%)' }}
          />
          <div className="hidden xs:block">
            <p style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontSize: '1rem', fontWeight: 300, lineHeight: 1.2 }}>
              Te Quiero Feliz
            </p>
            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-muted)', fontSize: '0.6rem', letterSpacing: '0.18em' }}>
              AREA PLANNER
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Language switcher */}
          <div className="hidden sm:flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--tqf-beige-border)' }}>
            {LANG_OPTIONS.map((opt, idx) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => changeLang(opt.value)}
                className="text-xs px-2.5 py-1.5 transition-colors"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: lang === opt.value ? 600 : 400,
                  background: lang === opt.value ? 'var(--tqf-bordeaux)' : 'white',
                  color: lang === opt.value ? 'white' : 'var(--tqf-muted)',
                  borderLeft: idx > 0 ? '1px solid var(--tqf-beige-border)' : 'none',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Link
            href="/planner/events/new"
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">{t.newEvent}</span>
          </Link>

          {canManageCashControl && (
            <Link
              href="/planner/cash-control"
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ color: 'var(--tqf-bordeaux)', border: '1px solid var(--tqf-cipria)', background: 'var(--tqf-cipria-light)', fontFamily: 'var(--font-body)' }}
              title="Control de Gastos"
            >
              <Wallet className="size-4" />
              <span className="hidden sm:inline">Gastos</span>
            </Link>
          )}

          {/* Profile pill */}
          <Link
            href="/planner/profile"
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-opacity hover:opacity-75"
            style={{ border: '1px solid var(--tqf-beige-border)', background: 'white' }}
          >
            <div
              className="size-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-medium flex-shrink-0"
              style={{ background: 'var(--tqf-cipria)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-display)' }}
            >
              {plannerUser.avatarUrl ? (
                <Image src={plannerUser.avatarUrl} alt="Avatar" width={28} height={28} className="w-full h-full object-cover" />
              ) : (
                [plannerUser.name?.[0], plannerUser.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?'
              )}
            </div>
            <span className="hidden sm:block text-sm max-w-[100px] truncate" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
              {plannerUser.name}{plannerUser.lastName ? ` ${plannerUser.lastName}` : ''}
            </span>
          </Link>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm px-2.5 py-2 rounded-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)' }}
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">{t.logout}</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* XB section tiles */}
        <div className="mb-8">
          <TileGrid tileKeys={XB_TILE_KEYS} />
        </div>

        <div className="mb-6">
          <h1 className="text-3xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 300 }}>
            Eventi
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            {loading ? '' : t.eventCount(events.length)}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-6 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <div className="mx-auto mb-4 size-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
              <ClipboardList className="size-7" />
            </div>
            <h2 className="text-xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              {t.noEventsYet}
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {t.noEventsHint}
            </p>
            <Link
              href="/planner/events/new"
              className="inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
            >
              <Plus className="size-4" />
              {t.newEvent}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((evt) => {
              const furnitureCount = (evt.days?.flatMap((d) => d.selectedFurniture ?? []) ?? evt.selectedFurniture ?? []).reduce((s, i) => s + i.quantity, 0);
              const flowerCount    = (evt.days?.flatMap((d) => d.selectedFlowers ?? [])   ?? evt.selectedFlowers   ?? []).reduce((s, i) => s + i.quantity, 0);
              return (
                <div
                  key={evt.id}
                  className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
                      <ClipboardList className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base truncate" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
                        {evt.eventCode || evt.eventName || <span style={{ opacity: 0.4 }}>{t.eventNameless}</span>}
                      </h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        {evt.clientName && (
                          <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            {t.clientLabel}: {evt.clientName}
                          </span>
                        )}
                        {evt.days && evt.days.length > 0 ? (
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            <Calendar className="size-3" />
                            {evt.days.length === 1
                              ? new Date(evt.days[0].date + 'T00:00:00').toLocaleDateString(
                                  lang === 'it' ? 'it-IT' : lang === 'es' ? 'es-MX' : 'en-US',
                                  { day: 'numeric', month: 'long', year: 'numeric' }
                                )
                              : t.daysCount(evt.days.length)}
                          </span>
                        ) : evt.eventDate ? (
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            <Calendar className="size-3" />
                            {new Date(evt.eventDate).toLocaleDateString(
                              lang === 'it' ? 'it-IT' : lang === 'es' ? 'es-MX' : 'en-US',
                              { day: 'numeric', month: 'long', year: 'numeric' }
                            )}
                          </span>
                        ) : null}
                        {evt.city && (
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            <MapPin className="size-3" />
                            {cityLabel(evt.city)}
                          </span>
                        )}
                        {(furnitureCount > 0 || flowerCount > 0) && (
                          <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            {furnitureCount > 0 && t.furnitureCount(furnitureCount)}
                            {furnitureCount > 0 && flowerCount > 0 && ' · '}
                            {flowerCount > 0 && t.flowersCount(flowerCount)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={evt.status === 'submitted'
                        ? { background: '#fef9ee', color: '#b45309', fontFamily: 'var(--font-body)' }
                        : { background: '#f3f4f6', color: '#6b7280', fontFamily: 'var(--font-body)' }}
                    >
                      {evt.status === 'submitted' ? t.statusSubmitted : t.statusDraft}
                    </span>
                    <Link
                      href={`/planner/events/${evt.id}`}
                      className="flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-opacity hover:opacity-70"
                      style={{ color: 'var(--tqf-bordeaux)', border: '1px solid var(--tqf-cipria)', background: 'var(--tqf-cipria-light)', fontFamily: 'var(--font-body)' }}
                    >
                      <Edit2 className="size-3" />
                      {t.edit}
                    </Link>
                    <button
                      onClick={() => handleDelete(evt)}
                      disabled={deletingId === evt.id}
                      className="size-8 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70 disabled:opacity-40"
                      style={{ color: '#991b1b', border: '1px solid #fecaca', background: '#fef2f2' }}
                    >
                      {deletingId === evt.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── All-tiles dashboard (XB + TeQF) ─────────────────────────────────────────

function AllTilesDashboard() {
  const { plannerUser, logout } = usePlannerAuth();
  if (!plannerUser) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      <header
        className="border-b px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}
      >
        <Link href="/" className="flex items-center gap-2 sm:gap-3 transition-opacity hover:opacity-75 flex-shrink-0">
          <Image
            src="/logo.png"
            alt="Te Quiero Feliz"
            width={32}
            height={32}
            className="object-contain"
            style={{ filter: 'invert(9%) sepia(80%) saturate(900%) hue-rotate(308deg) brightness(145%)' }}
          />
          <div className="hidden xs:block">
            <p style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontSize: '1rem', fontWeight: 300, lineHeight: 1.2 }}>
              Te Quiero Feliz
            </p>
            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-muted)', fontSize: '0.6rem', letterSpacing: '0.18em' }}>
              AREA PLANNER
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block text-right">
            <p className="text-sm" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
              {plannerUser.name}
            </p>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}
            >
              XB + TeQF
            </span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm px-2.5 py-2 rounded-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)' }}
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Esci</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-8">
          <h1 className="text-3xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 300 }}>
            Benvenuto/a, {plannerUser.name}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            Dashboard completa — XB + TeQF
          </p>
        </div>
        <TileGrid tileKeys={ADMIN_TILE_KEYS} />
      </main>
    </div>
  );
}

// ─── Not-assigned dashboard ───────────────────────────────────────────────────

function NotAssignedDashboard() {
  const { logout } = usePlannerAuth();

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
      <div className="text-center px-6 max-w-sm">
        <div
          className="mx-auto mb-5 size-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}
        >
          <Users className="size-7" />
        </div>
        <p className="text-xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 300 }}>
          Nessun team assegnato
        </p>
        <p className="text-sm mb-6" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
          Contatta l&apos;amministratore per essere assegnata a un team.
        </p>
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-lg transition-opacity hover:opacity-80"
          style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)' }}
        >
          <LogOut className="size-4" />
          Esci
        </button>
      </div>
    </div>
  );
}

// ─── Root page ────────────────────────────────────────────────────────────────

export default function PlannerPage() {
  const { isSuperAdmin, plannerUser, isLoading } = usePlannerAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  if (isSuperAdmin) return <SuperAdminDashboard />;

  if (plannerUser) {
    const teams   = deriveTeams(plannerUser);
    const hasXB   = teams.includes('XB');
    const hasTeQF = teams.includes('TeQF');

    if (hasXB && hasTeQF) return <AllTilesDashboard />;
    if (hasTeQF)          return <TeQFUserDashboard />;
    if (hasXB)            return <PlannerDashboard />;
    return <NotAssignedDashboard />;
  }

  return null;
}
