'use client';

import { deletePlannerEvent, getAllPlannerEvents, getPlannerEvents } from '@/actions/planner/planner-event-crud';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { CITIES, PlannerEvent } from '@/lib/planner-types';
import { Lang, LANG_OPTIONS, T } from '@/lib/planner-i18n';
import {
  BookOpen,
  Calendar,
  ClipboardList,
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

// ─── SuperAdmin ───────────────────────────────────────────────────────────────

const ADMIN_SECTIONS = [
  {
    key: 'planners',
    label: 'Planner',
    description: 'Gestisci planner, eventi e richieste di accesso',
    icon: <ClipboardList className="size-5" />,
    href: '/admin/planners',
  },
  {
    key: 'users',
    label: 'Utenti Admin',
    description: 'Ruoli, permessi e gestione accessi',
    icon: <Users className="size-5" />,
    href: '/admin/users',
  },
  {
    key: 'cashControl',
    label: 'Cash Control',
    description: 'Tutti gli eventi, bilanci e chiusure',
    icon: <Wallet className="size-5" />,
    href: '/area-planner/cash-control/admin',
  },
  {
    key: 'blog',
    label: 'Blog',
    description: 'Articoli e contenuti editoriali',
    icon: <BookOpen className="size-5" />,
    href: '/admin/blog',
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    description: 'Galleria progetti realizzati',
    icon: <ImageIcon className="size-5" />,
    href: '/admin/portfolio',
  },
  {
    key: 'furniture',
    label: 'Mobili',
    description: 'Sedie, tavoli e allestimenti',
    icon: <Sofa className="size-5" />,
    href: '/admin/furniture',
  },
  {
    key: 'florals',
    label: 'Fiori',
    description: 'Fiori e composizioni floreali',
    icon: <Flower2 className="size-5" />,
    href: '/admin/flowers',
  },
  {
    key: 'events',
    label: 'Eventi',
    description: 'Gestione eventi e sotto-eventi',
    icon: <Calendar className="size-5" />,
    href: '/admin/events',
  },
];

function SuperAdminDashboard() {
  const { adminUser, logout } = usePlannerAuth();
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllPlannerEvents()
      .then(setEvents)
      .finally(() => setLoading(false));
  }, []);

  if (!adminUser) return null;

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

        {/* Section tiles */}
        <div className="mb-10">
          <h2
            className="text-base mb-4"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400, letterSpacing: '0.05em' }}
          >
            Gestione
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ADMIN_SECTIONS.map((section) => (
              <a
                key={section.key}
                href={section.href}
                className="group block rounded-2xl p-4 transition-all hover:shadow-md active:scale-[0.98]"
                style={{ background: 'white', border: '1px solid var(--tqf-beige-border)', textDecoration: 'none' }}
              >
                <div
                  className="size-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}
                >
                  {section.icon}
                </div>
                <h3
                  className="text-sm mb-0.5"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}
                >
                  {section.label}
                </h3>
                <p
                  className="text-xs leading-relaxed hidden sm:block"
                  style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
                >
                  {section.description}
                </p>
              </a>
            ))}
          </div>
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
                  <Link
                    key={evt.id}
                    href={`/admin/planners/events/${evt.id}`}
                    className="flex items-center justify-between rounded-xl px-4 py-3 transition-opacity hover:opacity-80 active:scale-[0.99]"
                    style={{ background: 'white', border: '1px solid var(--tqf-beige-border)', textDecoration: 'none' }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
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
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 ml-3"
                      style={
                        evt.status === 'submitted'
                          ? { background: '#fef9ee', color: '#b45309', fontFamily: 'var(--font-body)' }
                          : { background: '#f3f4f6', color: '#6b7280', fontFamily: 'var(--font-body)' }
                      }
                    >
                      {evt.status === 'submitted' ? 'Inviato' : 'Bozza'}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Regular planner ──────────────────────────────────────────────────────────

function PlannerDashboard() {
  const { plannerUser, logout } = usePlannerAuth();
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
    getPlannerEvents(plannerUser.id)
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

          {/* Cash control */}
          <Link
            href="/planner/cash-control"
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{ color: 'var(--tqf-bordeaux)', border: '1px solid var(--tqf-cipria)', background: 'var(--tqf-cipria-light)', fontFamily: 'var(--font-body)' }}
            title="Control de Gastos"
          >
            <Wallet className="size-4" />
            <span className="hidden sm:inline">Gastos</span>
          </Link>

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
        <div className="mb-6">
          <h1 className="text-3xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 300 }}>
            {t.yourEvents}
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
  if (plannerUser)  return <PlannerDashboard />;
  return null;
}
