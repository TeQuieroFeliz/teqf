'use client';

import { getWeddings } from '@/actions/weddings/weddings';
import { useLangContext } from '@/context/LangContext';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import AccessDenied from '@/components/planner/AccessDenied';
import { Wedding, WeddingStatus } from '@/lib/wedding-types';
import {
  ArrowLeft, CalendarDays, Heart, Loader2, LogOut, MapPin, Plus,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// ── Translations ──────────────────────────────────────────────────────────────

const TR = {
  en: {
    title: 'Weddings',
    subtitle: 'XB Team wedding portfolio',
    newWedding: 'New Wedding',
    noWeddings: 'No weddings yet. Create the first one.',
    status_draft: 'Draft',
    status_in_review: 'In Review',
    status_quoted: 'Quoted',
    status_approved: 'Approved',
    status_completed: 'Completed',
    functions: (n: number) => n === 1 ? '1 function' : `${n} functions`,
    noDate: 'No date set',
    backDashboard: '← Dashboard',
    filterAll: 'All',
    searchPlaceholder: 'Search by name or location…',
  },
  es: {
    title: 'Bodas',
    subtitle: 'Portfolio de bodas del Equipo XB',
    newWedding: 'Nueva Boda',
    noWeddings: 'Aún no hay bodas. Crea la primera.',
    status_draft: 'Borrador',
    status_in_review: 'En Revisión',
    status_quoted: 'Cotizado',
    status_approved: 'Aprobado',
    status_completed: 'Completado',
    functions: (n: number) => n === 1 ? '1 función' : `${n} funciones`,
    noDate: 'Sin fecha',
    backDashboard: '← Panel',
    filterAll: 'Todas',
    searchPlaceholder: 'Buscar por nombre o ubicación…',
  },
} as const;
type Tr = typeof TR[keyof typeof TR];
type LangKey = 'en' | 'es';

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<WeddingStatus, React.CSSProperties> = {
  draft:      { background: '#f3f4f6', color: '#6b7280' },
  in_review:  { background: '#fef3c7', color: '#92400e' },
  quoted:     { background: '#dbeafe', color: '#1e40af' },
  approved:   { background: '#d1fae5', color: '#065f46' },
  completed:  { background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' },
};

function StatusBadge({ status, t }: { status: WeddingStatus; t: Tr }) {
  const key = `status_${status}` as keyof Tr;
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ ...STATUS_STYLES[status], fontFamily: 'var(--font-body)' }}>
      {t[key] as string}
    </span>
  );
}

// ── Date range display ────────────────────────────────────────────────────────

function formatDateRange(start: string | null, end: string | null, lang: LangKey): string {
  if (!start) return '';
  const locale = lang === 'es' ? 'es-MX' : 'en-US';
  const s = new Date(start + 'T00:00:00');
  if (!end || start === end) {
    return s.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  const e = new Date(end + 'T00:00:00');
  const sStr = s.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  const eStr = e.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${sStr} – ${eStr}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WeddingsListPage() {
  const { isSuperAdmin, canCreateProjects, canManageCashControl, isLoading: authLoading, logout } = usePlannerAuth();
  const { lang } = useLangContext();
  const t = TR[lang as LangKey] ?? TR.en;

  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState<WeddingStatus | 'all'>('all');

  const canCreate = isSuperAdmin || canCreateProjects;
  const canView   = isSuperAdmin || canCreateProjects || canManageCashControl;

  useEffect(() => {
    if (authLoading || !canView) return;
    getWeddings()
      .then(res => { if (res.success) setWeddings(res.data ?? []); })
      .finally(() => setLoading(false));
  }, [authLoading, canView]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  if (!canView) return <AccessDenied />;

  const filtered = weddings.filter(w => {
    const matchStatus = statusFilter === 'all' || w.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || w.weddingName.toLowerCase().includes(q) || w.primaryLocation.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const statuses: (WeddingStatus | 'all')[] = ['all', 'draft', 'in_review', 'quoted', 'approved', 'completed'];

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      {/* Header */}
      <header className="border-b px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}>
        <Link href="/planner" className="flex items-center gap-2 transition-opacity hover:opacity-75 flex-shrink-0">
          <Image src="/logo.png" alt="Te Quiero Feliz" width={30} height={30} className="object-contain"
            style={{ filter: 'invert(9%) sepia(80%) saturate(900%) hue-rotate(308deg) brightness(145%)' }} />
          <span className="hidden sm:block" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontSize: '0.95rem', fontWeight: 300 }}>
            Te Quiero Feliz
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSelector />
          {canCreate && (
            <Link href="/planner/weddings/new"
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">{t.newWedding}</span>
            </Link>
          )}
          <button onClick={logout}
            className="flex items-center gap-1.5 text-sm px-2.5 py-2 rounded-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)' }}>
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Title */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 300 }}>
              {t.title}
            </h1>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {t.subtitle}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 space-y-3">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
            style={{ border: '1px solid var(--tqf-beige-border)', background: 'white', fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)' }} />
          <div className="flex gap-2 flex-wrap">
            {statuses.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="text-xs px-3 py-1.5 rounded-full transition-all"
                style={statusFilter === s
                  ? { background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }
                  : { background: 'white', color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)' }}>
                {s === 'all' ? t.filterAll : t[`status_${s}` as keyof Tr] as string}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="size-6 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl py-14 px-8 text-center"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <div className="mx-auto mb-4 size-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
              <Heart className="size-7" />
            </div>
            <p className="text-sm mb-5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {t.noWeddings}
            </p>
            {canCreate && (
              <Link href="/planner/weddings/new"
                className="inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
                <Plus className="size-4" />{t.newWedding}
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(w => (
              <Link key={w.id} href={`/planner/weddings/${w.id}`}
                className="flex items-center gap-4 rounded-2xl px-4 py-4 w-full text-left transition-all hover:shadow-md"
                style={{ background: 'white', border: '1px solid var(--tqf-beige-border)', textDecoration: 'none', display: 'flex' }}>
                <div className="size-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
                  <Heart className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate"
                    style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)' }}>
                    {w.weddingName}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                    {w.primaryLocation && (
                      <span className="flex items-center gap-1 text-xs"
                        style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                        <MapPin className="size-3 flex-shrink-0" />{w.primaryLocation}
                      </span>
                    )}
                    {(w.startDate || w.endDate) && (
                      <span className="flex items-center gap-1 text-xs"
                        style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                        <CalendarDays className="size-3 flex-shrink-0" />
                        {formatDateRange(w.startDate, w.endDate, lang as LangKey)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={w.status} t={t} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
