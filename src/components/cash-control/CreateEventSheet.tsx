'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { auth } from '@/firebase/client';
import { CashControlEventType } from '@/lib/cash-control/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (eventId: string) => void;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function CreateEventSheet({ open, onClose, onCreated }: Props) {
  const [eventType, setEventType] = useState<CashControlEventType>('gastos');
  const [month, setMonth] = useState(currentMonth);
  const [eventCode, setEventCode] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [saving, setSaving] = useState(false);

  function reset() {
    setEventType('gastos');
    setMonth(currentMonth());
    setEventCode('');
    setEventDate('');
  }

  async function handleSave() {
    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) throw new Error('Sin sesión activa.');

      let code: string;
      let name: string;

      if (eventType === 'gastos') {
        const [year, monthNum] = month.split('-');
        const monthName = new Date(+year, +monthNum - 1, 1)
          .toLocaleDateString('es-MX', { month: 'long' });
        const label = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        code = `GASTOS-${year}-${monthNum}`;
        name = `Gastos ${label} ${year}`;
      } else {
        if (!eventCode.trim()) {
          toast.error('El código del evento es obligatorio.');
          setSaving(false);
          return;
        }
        code = eventCode.trim().toUpperCase();
        name = code;
      }

      const res = await fetch('/api/cash-control/create-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ eventCode: code, eventName: name, eventType, eventDate }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al crear la cuenta.');

      toast.success('Cuenta creada.');
      reset();
      onCreated(data.eventId as string);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setSaving(false);
    }
  }

  const isValid = eventType === 'gastos' ? !!month : !!eventCode.trim() && !!eventDate;

  return (
    <Sheet
      open={open}
      onOpenChange={v => {
        if (!v) {
          reset();
          onClose();
        }
      }}
    >
      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-h-[85vh] overflow-y-auto"
        style={{ background: 'var(--tqf-beige)', border: 'none', padding: 0 }}
      >
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--tqf-dark)',
              fontWeight: 400,
              fontSize: '1.4rem',
            }}
          >
            Nueva cuenta
          </SheetTitle>
        </SheetHeader>

        <div className="px-6 py-4 space-y-5">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2">
            {(['gastos', 'evento'] as CashControlEventType[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setEventType(t)}
                className="py-3 rounded-xl text-sm transition-all active:scale-95"
                style={{
                  fontFamily: 'var(--font-body)',
                  border:
                    eventType === t
                      ? '2px solid var(--tqf-bordeaux)'
                      : '1.5px solid var(--tqf-beige-border)',
                  background: eventType === t ? 'var(--tqf-cipria-light)' : 'white',
                  color: eventType === t ? 'var(--tqf-bordeaux)' : 'var(--tqf-dark)',
                  fontWeight: eventType === t ? 600 : 400,
                }}
              >
                {t === 'gastos' ? 'Gastos del mes' : 'Evento'}
              </button>
            ))}
          </div>

          {/* Gastos del mes: only month picker */}
          {eventType === 'gastos' && (
            <div>
              <label
                className="block text-xs uppercase tracking-wide mb-2"
                style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
              >
                Período *
              </label>
              <input
                type="month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="w-full rounded-2xl px-4 py-3 text-base outline-none"
                style={{
                  fontFamily: 'var(--font-body)',
                  color: 'var(--tqf-dark)',
                  background: 'white',
                  border: '1.5px solid var(--tqf-beige-border)',
                }}
              />
            </div>
          )}

          {/* Evento: event code + date */}
          {eventType === 'evento' && (
            <div className="space-y-4">
              <div>
                <label
                  className="block text-xs uppercase tracking-wide mb-2"
                  style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
                >
                  Código del evento *
                </label>
                <input
                  type="text"
                  value={eventCode}
                  onChange={e => setEventCode(e.target.value)}
                  placeholder="Ej: BOD-2026-001"
                  className="w-full rounded-2xl px-4 py-3 text-base outline-none"
                  style={{
                    fontFamily: 'var(--font-body)',
                    color: 'var(--tqf-dark)',
                    background: 'white',
                    border: '1.5px solid var(--tqf-beige-border)',
                  }}
                  autoFocus
                />
                <p
                  className="text-xs mt-2"
                  style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
                >
                  Usa el código del evento asignado previamente.
                </p>
              </div>

              <div>
                <label
                  className="block text-xs uppercase tracking-wide mb-2"
                  style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
                >
                  Fecha del evento *
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={e => setEventDate(e.target.value)}
                  className="w-full rounded-2xl px-4 py-3 text-base outline-none"
                  style={{
                    fontFamily: 'var(--font-body)',
                    color: 'var(--tqf-dark)',
                    background: 'white',
                    border: '1.5px solid var(--tqf-beige-border)',
                  }}
                />
                <p
                  className="text-xs mt-2"
                  style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
                >
                  Puedes crear varios eventos para el mismo día con códigos distintos.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-8 pt-2 space-y-3" style={{ background: 'var(--tqf-beige)' }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isValid}
            className="w-full py-4 rounded-2xl text-base flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 active:scale-[0.98]"
            style={{
              background: 'var(--tqf-bordeaux)',
              color: 'white',
              fontFamily: 'var(--font-body)',
            }}
          >
            {saving ? <Loader2 className="size-5 animate-spin" /> : 'Crear cuenta'}
          </button>
          <button
            type="button"
            onClick={() => { reset(); onClose(); }}
            disabled={saving}
            className="w-full py-4 rounded-2xl text-base transition-opacity disabled:opacity-50"
            style={{
              border: '1.5px solid var(--tqf-beige-border)',
              color: 'var(--tqf-muted)',
              fontFamily: 'var(--font-body)',
              background: 'white',
            }}
          >
            Cancelar
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
