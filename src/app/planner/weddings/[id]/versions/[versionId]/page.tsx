'use client';

import { getVersion } from '@/actions/weddings/versions';
import { LanguageSelector } from '@/components/LanguageSelector';
import AccessDenied from '@/components/planner/AccessDenied';
import { useLangContext } from '@/context/LangContext';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { WeddingVersion } from '@/lib/wedding-types';
import {
  ArrowLeft, CalendarDays, Clock, FileText, Loader2, LogOut, MapPin,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const TR = {
  en: {
    title: (n: number) => `Version ${n}`,
    back: '← Back to Wedding',
    readOnly: 'Read-only snapshot',
    versionLabel: 'Label',
    changeDesc: 'Description',
    savedBy: 'Saved by',
    savedAt: 'Saved on',
    restoredFrom: 'Restored from version',
    weddingSnapshot: 'Wedding Info',
    functionsSnapshot: 'Functions',
    weddingName: 'Name', location: 'Location', status: 'Status',
    assignedTeqf: 'TeQF Planner', createdBy: 'Created by',
    noFunctions: 'No functions in this version.',
    functionTypes: {
      haldi: 'Haldi', sangeet: 'Sangeet', ceremony: 'Ceremony',
      reception: 'Reception', custom: 'Custom',
    } as Record<string, string>,
    isRestore: 'Restore',
  },
  es: {
    title: (n: number) => `Versión ${n}`,
    back: '← Volver a la Boda',
    readOnly: 'Instantánea de solo lectura',
    versionLabel: 'Etiqueta',
    changeDesc: 'Descripción',
    savedBy: 'Guardado por',
    savedAt: 'Guardado el',
    restoredFrom: 'Restaurado desde la versión',
    weddingSnapshot: 'Info de Boda',
    functionsSnapshot: 'Funciones',
    weddingName: 'Nombre', location: 'Ubicación', status: 'Estado',
    assignedTeqf: 'Planificadora TeQF', createdBy: 'Creado por',
    noFunctions: 'Sin funciones en esta versión.',
    functionTypes: {
      haldi: 'Haldi', sangeet: 'Sangeet', ceremony: 'Ceremonia',
      reception: 'Recepción', custom: 'Personalizado',
    } as Record<string, string>,
    isRestore: 'Restauración',
  },
} as const;

type LangKey = 'en' | 'es';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
      <h3 className="text-base mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b last:border-b-0"
      style={{ borderColor: 'var(--tqf-beige-border)' }}>
      <span className="text-xs w-28 flex-shrink-0 pt-0.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{label}</span>
      <span className="text-sm" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>{value || '—'}</span>
    </div>
  );
}

export default function VersionDetailPage() {
  const { isSuperAdmin, canCreateProjects, canManageCashControl, isLoading: authLoading, logout } = usePlannerAuth();
  const { lang } = useLangContext();
  const t = TR[lang as LangKey] ?? TR.en;
  const params = useParams();
  const weddingId  = params.id as string;
  const versionId  = params.versionId as string;

  const canView = isSuperAdmin || canCreateProjects || canManageCashControl;

  const [version, setVersion] = useState<WeddingVersion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !canView) return;
    getVersion(weddingId, versionId).then(res => {
      if (res.success) setVersion(res.data!);
    }).finally(() => setLoading(false));
  }, [authLoading, canView, weddingId, versionId]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  if (!canView) return <AccessDenied />;
  if (!version) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
      <p style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>Version not found.</p>
    </div>
  );

  const locale = lang === 'es' ? 'es-MX' : 'en-US';
  const w = version.weddingSnapshot;
  const fns = version.functionsSnapshot ?? [];

  function formatDate(d: string | null) {
    if (!d) return '—';
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
    } catch { return d; }
  }

  function formatTime(t: string) {
    return t ? new Date('1970-01-01T' + t).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '';
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      <header className="border-b px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}>
        <Link href={`/planner/weddings/${weddingId}`} className="flex items-center gap-2 transition-opacity hover:opacity-75">
          <Image src="/logo.png" alt="" width={28} height={28} className="object-contain"
            style={{ filter: 'invert(9%) sepia(80%) saturate(900%) hue-rotate(308deg) brightness(145%)' }} />
          <span className="hidden sm:block" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontSize: '0.9rem', fontWeight: 300 }}>Weddings</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSelector />
          <button onClick={logout} className="flex items-center gap-1.5 text-sm px-2.5 py-2 rounded-lg hover:opacity-80"
            style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)' }}>
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <Link href={`/planner/weddings/${weddingId}`} className="flex items-center gap-1.5 text-sm mb-4 transition-opacity hover:opacity-70"
          style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', textDecoration: 'none' }}>
          <ArrowLeft className="size-4" />{t.back}
        </Link>

        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 300 }}>
                {t.title(version.versionNumber)}
              </h1>
              {version.versionLabel && (
                <span className="text-xs px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                  {version.versionLabel}
                </span>
              )}
              {version.isRestore && (
                <span className="text-xs px-2.5 py-1 rounded-full"
                  style={{ background: '#fef3c7', color: '#92400e', fontFamily: 'var(--font-body)' }}>
                  {t.isRestore}
                </span>
              )}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {t.readOnly}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Version metadata */}
          <Section title={lang === 'es' ? 'Metadatos' : 'Version Info'}>
            <InfoRow label={t.changeDesc} value={version.changeDescription} />
            <InfoRow label={t.savedBy} value={version.savedByName} />
            <InfoRow label={t.savedAt} value={version.savedAt ? new Date(version.savedAt).toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' } as any) : undefined} />
            {version.isRestore && version.restoredFromVersion != null && (
              <InfoRow label={t.restoredFrom} value={String(version.restoredFromVersion)} />
            )}
          </Section>

          {/* Wedding snapshot */}
          <Section title={t.weddingSnapshot}>
            <InfoRow label={t.weddingName} value={w?.weddingName} />
            <InfoRow label={t.location} value={w?.primaryLocation} />
            <InfoRow label={t.status} value={w?.status} />
            <InfoRow label={t.assignedTeqf} value={w?.assignedTeqfUserName ?? (lang === 'es' ? 'Sin asignar' : 'Not assigned')} />
            <InfoRow label={t.createdBy} value={w?.createdByName} />
          </Section>

          {/* Functions snapshot */}
          <Section title={t.functionsSnapshot}>
            {fns.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t.noFunctions}</p>
            ) : (
              <div className="space-y-3">
                {[...fns].sort((a, b) => {
                  if (a.date < b.date) return -1;
                  if (a.date > b.date) return 1;
                  return a.order - b.order;
                }).map((fn, i) => {
                  const fnDate = fn.date ? new Date(fn.date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' }) : '—';
                  const fnType = t.functionTypes[fn.functionType] ?? fn.functionType;
                  return (
                    <div key={i} className="rounded-xl p-3" style={{ background: '#fafafa', border: '1px solid var(--tqf-beige-border)' }}>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                          {fnType}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>#{fn.order}</span>
                      </div>
                      <p className="text-sm font-medium" style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)' }}>
                        {fn.functionName || fnType}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                        {fn.date && (
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            <CalendarDays className="size-3" />{fnDate}
                          </span>
                        )}
                        {fn.eventStartTime && (
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            <Clock className="size-3" />{fn.eventStartTime}{fn.eventEndTime ? ` – ${fn.eventEndTime}` : ''}
                          </span>
                        )}
                        {fn.venue && (
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                            <MapPin className="size-3" />{fn.venue}
                          </span>
                        )}
                      </div>
                      {fn.colorPalette.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {fn.colorPalette.map((c, ci) => (
                            <div key={ci} className="size-5 rounded-full"
                              style={{ background: c, border: '2px solid white', boxShadow: '0 0 0 1px rgba(0,0,0,0.1)' }} title={c} />
                          ))}
                        </div>
                      )}
                      {fn.generalNotes && (
                        <p className="text-xs mt-2 italic" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                          {fn.generalNotes}
                        </p>
                      )}
                      {fn.moodboardFiles.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {fn.moodboardFiles.map((f, fi) => (
                            <a key={fi} href={f.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg hover:opacity-80"
                              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', textDecoration: 'none' }}>
                              <FileText className="size-3" />{f.fileName}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>
      </main>
    </div>
  );
}
