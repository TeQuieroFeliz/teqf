'use client';

import { getPlannerEvent } from '@/actions/planner/planner-event-crud';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import AccessDenied from '@/components/planner/AccessDenied';
import { useI18n } from '@/hooks/useI18n';
import { LanguageSelector } from '@/components/LanguageSelector';
import { CITIES, EventDay, PlannerEvent } from '@/lib/planner-types';
import {
  ArrowLeft,
  Calendar,
  Download,
  ExternalLink,
  FileText,
  Flower2,
  ImagePlus,
  Loader2,
  MapPin,
  Sofa,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

async function downloadPdf(event: PlannerEvent, errMsg: string) {
  const res = await fetch('/api/planner-event-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event }),
  });
  if (!res.ok) { toast.error(errMsg); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TQF_${(event.eventCode || event.eventName || 'event').replace(/\s+/g, '_')}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDate(iso: string, locale: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(locale, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function AdminPlannerEventPage() {
  const { adminUser } = usePlannerAuth();
  const { t, lang } = useI18n();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [event, setEvent] = useState<PlannerEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  const locale = lang === 'es' ? 'es-MX' : 'en-US';

  useEffect(() => {
    getPlannerEvent(id).then((e) => {
      if (!e) { router.replace('/planner/planners'); return; }
      setEvent(e);
      setLoading(false);
    });
  }, [id, router]);

  if (!adminUser) return <AccessDenied />;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  if (!event) return null;

  const cityLabel = (val: string) => CITIES.find((c) => c.value === val)?.label ?? val;

  const allFurniture = event.days?.flatMap(d => d.selectedFurniture ?? []) ?? [];
  const allFlowers   = event.days?.flatMap(d => d.selectedFlowers ?? []) ?? [];
  const furnitureTotal = allFurniture.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const flowersTotal   = allFlowers.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const grandTotal = furnitureTotal + flowersTotal;

  const section = (title: string, icon: React.ReactNode, children: React.ReactNode) => (
    <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg" style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
          {icon}
        </div>
        <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  );

  const field = (label: string, value: string | undefined) =>
    value ? (
      <div>
        <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{label}</p>
        <p className="text-sm" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>{value}</p>
      </div>
    ) : null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      <header
        className="border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}
      >
        <div className="flex items-center gap-4">
          <Link
            href="/planner/planners"
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
          >
            <ArrowLeft className="size-4" />
            Planner
          </Link>
          <div className="h-4 w-px" style={{ background: 'var(--tqf-beige-border)' }} />
          <h1 className="text-xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
            {event.eventCode || event.eventName || 'Event'}
          </h1>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={event.status === 'submitted'
              ? { background: '#fef9ee', color: '#b45309', fontFamily: 'var(--font-body)' }
              : { background: '#f3f4f6', color: '#6b7280', fontFamily: 'var(--font-body)' }}
          >
            {event.status === 'submitted' ? t('submitted') : t('draft')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSelector />
          <button
            onClick={async () => { setPdfLoading(true); await downloadPdf(event!, t('plannerEvt_pdfError')); setPdfLoading(false); }}
            disabled={pdfLoading}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
          >
            {pdfLoading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {t('plannerEvt_downloadPdf')}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-5" id="print-area">
        {section(t('plannerEvt_eventDetails'), <Calendar className="size-4" />, (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {field(t('plannerEvt_eventCode'), event.eventCode)}
            {field(t('plannerEvt_client'), event.clientName)}
            {field(t('plannerEvt_city'), event.city ? cityLabel(event.city) : undefined)}
            {field(t('plannerEvt_days'), event.days?.length
              ? `${event.days.length} ${event.days.length === 1 ? t('plannerEvt_day') : t('plannerEvt_daysWord')}`
              : undefined)}
          </div>
        ))}

        {event.days && event.days.length > 0 && section(
          t('plannerEvt_daysVenue', { n: String(event.days.length) }),
          <MapPin className="size-4" />,
          <div className="space-y-6">
            {event.days.map((day: EventDay, idx: number) => (
              <div key={day.id} className="border rounded-xl p-4 space-y-4" style={{ borderColor: 'var(--tqf-beige-border)' }}>
                <div className="flex items-center gap-2">
                  <span
                    className="size-6 flex items-center justify-center rounded-full text-xs font-semibold flex-shrink-0"
                    style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                    {formatDate(day.date, locale)}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {field(t('plannerEvt_description'), day.eventName)}
                  {field(t('plannerEvt_venue'), day.venue)}
                  {day.venueAddress && (
                    <div>
                      <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t('plannerEvt_address')}</p>
                      <div className="flex items-start gap-1">
                        <p className="text-sm flex-1" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>{day.venueAddress}</p>
                        {day.venueMapUrl && (
                          <a href={day.venueMapUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--tqf-bordeaux)' }}>
                            <ExternalLink className="size-3.5 mt-0.5 flex-shrink-0" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  {field(t('plannerEvt_notes'), day.notes)}
                </div>
                {(day.setupTime || day.eventStartTime || day.breakdownTime || day.supplierAccessTime) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t" style={{ borderColor: 'var(--tqf-beige-border)' }}>
                    {field(t('plannerEvt_setup'), day.setupTime)}
                    {field(t('plannerEvt_eventStart'), day.eventStartTime)}
                    {field(t('plannerEvt_breakdown'), day.breakdownTime)}
                    {field(t('plannerEvt_supplierAccess'), day.supplierAccessTime)}
                  </div>
                )}
                {(day.supplierRegulationUrl || day.layoutUrls?.length > 0) && (
                  <div className="pt-3 border-t space-y-1.5" style={{ borderColor: 'var(--tqf-beige-border)' }}>
                    <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t('plannerEvt_documents')}</p>
                    {day.supplierRegulationUrl && (
                      <a
                        href={day.supplierRegulationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
                        style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}
                      >
                        <FileText className="size-3.5" />
                        {t('plannerEvt_supplierReg')}
                      </a>
                    )}
                    {day.layoutUrls?.map((url: string, i: number) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
                        style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}
                      >
                        <FileText className="size-3.5" />
                        Layout {day.layoutUrls.length > 1 ? i + 1 : ''}
                      </a>
                    ))}
                  </div>
                )}
                {day.customItems && day.customItems.length > 0 && (
                  <div className="pt-3 border-t" style={{ borderColor: 'var(--tqf-beige-border)' }}>
                    <div className="flex items-center gap-1.5 mb-3">
                      <ImagePlus className="size-3.5" style={{ color: 'var(--tqf-muted)' }} />
                      <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                        {t('plannerEvt_customItems', { n: String(day.customItems.length) })}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {day.customItems.map((item) => (
                        <div key={item.id} className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--tqf-beige-border)' }}>
                          {(item.imageUrls ?? []).length > 0 ? (
                            <div className="flex gap-1.5 p-1.5 flex-wrap">
                              {item.imageUrls.map((url, i) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img key={i} src={url} alt="" className="rounded object-cover" style={{ width: '80px', height: '64px' }} />
                              ))}
                            </div>
                          ) : (
                            <div className="w-full h-16 flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
                              <ImagePlus className="size-5" style={{ color: 'var(--tqf-muted)' }} />
                            </div>
                          )}
                          {item.note && (
                            <p className="px-3 py-2 text-xs leading-relaxed border-t" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)', borderColor: 'var(--tqf-beige-border)' }}>
                              {item.note}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {section(t('plannerEvt_plannerSection'), <User className="size-4" />, (
          <div className="grid grid-cols-2 gap-4">
            {field(t('plannerEvt_name'), event.plannerName)}
            {field(t('plannerEvt_email'), event.plannerEmail)}
          </div>
        ))}

        {allFurniture.length > 0 && section(t('plannerEvt_furniture', { n: String(allFurniture.length) }), <Sofa className="size-4" />, (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 pb-2 border-b" style={{ borderColor: 'var(--tqf-beige-border)' }}>
              <p className="col-span-6 text-xs uppercase tracking-wider" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t('plannerEvt_item')}</p>
              <p className="col-span-2 text-xs uppercase tracking-wider text-center" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t('plannerEvt_cat')}</p>
              <p className="col-span-2 text-xs uppercase tracking-wider text-center" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t('plannerEvt_qty')}</p>
              <p className="col-span-2 text-xs uppercase tracking-wider text-right" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t('plannerEvt_total')}</p>
            </div>
            {allFurniture.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 py-2 border-b last:border-0" style={{ borderColor: 'var(--tqf-beige-border)' }}>
                <p className="col-span-6 text-sm" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>{item.itemName}</p>
                <p className="col-span-2 text-sm text-center" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{item.category}</p>
                <p className="col-span-2 text-sm text-center" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>{item.quantity}</p>
                <p className="col-span-2 text-sm text-right font-medium" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                  ${(item.price * item.quantity).toLocaleString('es-MX')}
                </p>
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                {t('plannerEvt_subtotal')} ${furnitureTotal.toLocaleString('es-MX')} MXN
              </p>
            </div>
          </div>
        ))}

        {allFlowers.length > 0 && section(t('plannerEvt_flowers', { n: String(allFlowers.length) }), <Flower2 className="size-4" />, (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 pb-2 border-b" style={{ borderColor: 'var(--tqf-beige-border)' }}>
              <p className="col-span-6 text-xs uppercase tracking-wider" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t('plannerEvt_item')}</p>
              <p className="col-span-2 text-xs uppercase tracking-wider text-center" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t('plannerEvt_cat')}</p>
              <p className="col-span-2 text-xs uppercase tracking-wider text-center" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t('plannerEvt_qty')}</p>
              <p className="col-span-2 text-xs uppercase tracking-wider text-right" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t('plannerEvt_total')}</p>
            </div>
            {allFlowers.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 py-2 border-b last:border-0" style={{ borderColor: 'var(--tqf-beige-border)' }}>
                <p className="col-span-6 text-sm" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>{item.itemName}</p>
                <p className="col-span-2 text-sm text-center" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{item.category}</p>
                <p className="col-span-2 text-sm text-center" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>{item.quantity}</p>
                <p className="col-span-2 text-sm text-right font-medium" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                  ${(item.price * item.quantity).toLocaleString('es-MX')}
                </p>
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                {t('plannerEvt_subtotal')} ${flowersTotal.toLocaleString('es-MX')} MXN
              </p>
            </div>
          </div>
        ))}

        {grandTotal > 0 && (
          <div className="rounded-2xl p-5 flex justify-between items-center" style={{ background: 'var(--tqf-bordeaux)' }}>
            <span className="text-base" style={{ color: 'var(--tqf-cipria-light)', fontFamily: 'var(--font-display)' }}>
              {t('plannerEvt_grandTotal')}
            </span>
            <span className="text-xl font-semibold" style={{ color: 'white', fontFamily: 'var(--font-display)' }}>
              ${grandTotal.toLocaleString('es-MX')} MXN
            </span>
          </div>
        )}

        {event.notes && section(t('plannerEvt_notes'), <FileText className="size-4" />, (
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
            {event.notes}
          </p>
        ))}
      </main>
    </div>
  );
}
