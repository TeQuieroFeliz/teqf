'use client';

import { getPlannerEvent } from '@/actions/planner/planner-event-crud';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import AccessDenied from '@/components/planner/AccessDenied';
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

async function downloadPdf(event: PlannerEvent) {
  const res = await fetch('/api/planner-event-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event }),
  });
  if (!res.ok) { alert('Errore generazione PDF.'); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TQF_${(event.eventCode || event.eventName || 'evento').replace(/\s+/g, '_')}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function AdminPlannerEventPage() {
  const { adminUser } = usePlannerAuth();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [event, setEvent] = useState<PlannerEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    getPlannerEvent(id).then((e) => {
      if (!e) { router.replace('/planner/planners'); return; }
      setEvent(e);
      setLoading(false);
    });
  }, [id, router]);

  // BUG-09 fix: replaced `return null` with AccessDenied.
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
            {event.eventCode || event.eventName || 'Evento'}
          </h1>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={event.status === 'submitted'
              ? { background: '#fef9ee', color: '#b45309', fontFamily: 'var(--font-body)' }
              : { background: '#f3f4f6', color: '#6b7280', fontFamily: 'var(--font-body)' }}
          >
            {event.status === 'submitted' ? 'Inviato' : 'Bozza'}
          </span>
        </div>
        <button
          onClick={async () => { setPdfLoading(true); await downloadPdf(event!); setPdfLoading(false); }}
          disabled={pdfLoading}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
        >
          {pdfLoading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Scarica PDF
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-5" id="print-area">
        {section('Dettagli Evento', <Calendar className="size-4" />, (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {field('Codice Evento', event.eventCode)}
            {field('Cliente', event.clientName)}
            {field('Città', event.city ? cityLabel(event.city) : undefined)}
            {field('Giorni', event.days?.length ? `${event.days.length} ${event.days.length === 1 ? 'giorno' : 'giorni'}` : undefined)}
          </div>
        ))}

        {event.days && event.days.length > 0 && section(
          `Giorni & Venue (${event.days.length})`,
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
                    {formatDate(day.date)}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {field('Descrizione', day.eventName)}
                  {field('Venue', day.venue)}
                  {day.venueAddress && (
                    <div>
                      <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>Indirizzo</p>
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
                  {field('Note', day.notes)}
                </div>
                {(day.setupTime || day.eventStartTime || day.breakdownTime || day.supplierAccessTime) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t" style={{ borderColor: 'var(--tqf-beige-border)' }}>
                    {field('Montaggio', day.setupTime)}
                    {field('Inizio Evento', day.eventStartTime)}
                    {field('Smontaggio', day.breakdownTime)}
                    {field('Accesso Fornitori', day.supplierAccessTime)}
                  </div>
                )}
                {(day.supplierRegulationUrl || day.layoutUrls?.length > 0) && (
                  <div className="pt-3 border-t space-y-1.5" style={{ borderColor: 'var(--tqf-beige-border)' }}>
                    <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>Documenti</p>
                    {day.supplierRegulationUrl && (
                      <a
                        href={day.supplierRegulationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
                        style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}
                      >
                        <FileText className="size-3.5" />
                        Regolamento Fornitori
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
                        Idee & Elementi ({day.customItems.length})
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

        {section('Planner', <User className="size-4" />, (
          <div className="grid grid-cols-2 gap-4">
            {field('Nome', event.plannerName)}
            {field('Email', event.plannerEmail)}
          </div>
        ))}

        {allFurniture.length > 0 && section(`Mobiliario (${allFurniture.length} articoli)`, <Sofa className="size-4" />, (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 pb-2 border-b" style={{ borderColor: 'var(--tqf-beige-border)' }}>
              <p className="col-span-6 text-xs uppercase tracking-wider" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>Articolo</p>
              <p className="col-span-2 text-xs uppercase tracking-wider text-center" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>Cat.</p>
              <p className="col-span-2 text-xs uppercase tracking-wider text-center" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>Qtà</p>
              <p className="col-span-2 text-xs uppercase tracking-wider text-right" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>Totale</p>
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
                Subtotale: ${furnitureTotal.toLocaleString('es-MX')} MXN
              </p>
            </div>
          </div>
        ))}

        {allFlowers.length > 0 && section(`Fiori (${allFlowers.length} articoli)`, <Flower2 className="size-4" />, (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 pb-2 border-b" style={{ borderColor: 'var(--tqf-beige-border)' }}>
              <p className="col-span-6 text-xs uppercase tracking-wider" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>Articolo</p>
              <p className="col-span-2 text-xs uppercase tracking-wider text-center" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>Cat.</p>
              <p className="col-span-2 text-xs uppercase tracking-wider text-center" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>Qtà</p>
              <p className="col-span-2 text-xs uppercase tracking-wider text-right" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>Totale</p>
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
                Subtotale: ${flowersTotal.toLocaleString('es-MX')} MXN
              </p>
            </div>
          </div>
        ))}

        {grandTotal > 0 && (
          <div className="rounded-2xl p-5 flex justify-between items-center" style={{ background: 'var(--tqf-bordeaux)' }}>
            <span className="text-base" style={{ color: 'var(--tqf-cipria-light)', fontFamily: 'var(--font-display)' }}>
              Totale Stimato
            </span>
            <span className="text-xl font-semibold" style={{ color: 'white', fontFamily: 'var(--font-display)' }}>
              ${grandTotal.toLocaleString('es-MX')} MXN
            </span>
          </div>
        )}

        {event.notes && section('Note', <FileText className="size-4" />, (
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
            {event.notes}
          </p>
        ))}
      </main>
    </div>
  );
}
