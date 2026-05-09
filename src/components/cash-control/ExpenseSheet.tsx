'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { PhotoUpload } from './PhotoUpload';
import { PaymentMethod, TransactionRow } from '@/lib/cash-control/types';
import { addExpense, updateExpense } from '@/lib/cash-control/firestore';
import { uploadReceiptPhoto } from '@/lib/cash-control/storage';
import { todayISO } from '@/lib/cash-control/calculations';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
];

const QUICK_TAGS = [
  { label: '🌸 Flores', value: 'Flores' },
  { label: 'Mercado Jamaica', value: 'Mercado Jamaica' },
  { label: 'Taxi', value: 'Taxi' },
  { label: 'Propina', value: 'Propina' },
  { label: 'Materiales', value: 'Materiales' },
  { label: 'Comida', value: 'Comida' },
  { label: 'Urgente', value: 'Urgente' },
  { label: 'Sin comprobante', value: 'Sin comprobante' },
];

const NO_SUPPORT_TAGS = new Set(['Sin comprobante']);

interface Props {
  open: boolean;
  onClose: () => void;
  eventId: string;
  userId: string;
  initialData?: TransactionRow; // when provided → edit mode
}

export function ExpenseSheet({ open, onClose, eventId, userId, initialData }: Props) {
  const isEdit = !!initialData;

  const [amount, setAmount] = useState(initialData ? String(initialData.amount) : '');
  const [method, setMethod] = useState<PaymentMethod>(initialData?.method ?? 'efectivo');
  const [selectedTags, setSelectedTags] = useState<string[]>(initialData?.tags ?? []);
  const [note, setNote] = useState(initialData?.note ?? '');
  const [date, setDate] = useState(initialData?.date ?? todayISO());
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setAmount(initialData ? String(initialData.amount) : '');
    setMethod(initialData?.method ?? 'efectivo');
    setSelectedTags(initialData?.tags ?? []);
    setNote(initialData?.note ?? '');
    setDate(initialData?.date ?? todayISO());
    setPhoto(null);
  }

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

  function computeIsWithoutSupport(
    receiptImageUrl: string | null,
    tags: string[],
    noteText: string
  ): boolean {
    const hasPhoto = receiptImageUrl !== null;
    const hasNote = noteText.trim().length > 0;
    const hasRealTag = tags.some(t => !NO_SUPPORT_TAGS.has(t));
    return !hasPhoto && !hasNote && !hasRealTag;
  }

  async function handleSave() {
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (!numAmount || numAmount <= 0) {
      toast.error('Ingresa un monto válido.');
      return;
    }
    if (!date) {
      toast.error('Selecciona una fecha.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit && initialData) {
        await updateExpense(initialData.id, {
          amount: numAmount,
          method,
          tags: selectedTags,
          note: note.trim() || null,
          date,
          isWithoutSupport: initialData.isWithoutSupport,
        });
        toast.success('Gasto actualizado');
      } else {
        let receiptImageUrl: string | null = null;
        if (photo) {
          receiptImageUrl = await uploadReceiptPhoto(userId, eventId, photo);
        }
        const isWithoutSupport = computeIsWithoutSupport(receiptImageUrl, selectedTags, note);
        await addExpense({
          eventId,
          userId,
          amount: numAmount,
          method,
          tags: selectedTags,
          note: note.trim() || null,
          receiptImageUrl,
          isWithoutSupport,
          date,
          createdBy: userId,
        });
        if (isWithoutSupport) {
          toast.success('Gasto guardado · Sin respaldo');
        } else {
          toast.success(
            `Gasto: $${numAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
          );
        }
      }
      reset();
      onClose();
    } catch {
      toast.error('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  const numAmount = parseFloat(amount.replace(',', '.'));
  const isValid = !isNaN(numAmount) && numAmount > 0;

  const willBeSinRespaldo =
    !isEdit &&
    isValid &&
    !photo &&
    !note.trim() &&
    selectedTags.every(t => NO_SUPPORT_TAGS.has(t));

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
        className="rounded-t-3xl max-h-[92vh] overflow-y-auto"
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
            {isEdit ? 'Editar gasto' : 'Gasto'}
          </SheetTitle>
        </SheetHeader>

        <div className="px-6 py-4 space-y-5">
          {/* Date */}
          <div>
            <label
              className="block text-xs uppercase tracking-wide mb-2"
              style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
            >
              Fecha
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full rounded-2xl px-4 py-3 text-base outline-none"
              style={{
                fontFamily: 'var(--font-body)',
                color: 'var(--tqf-dark)',
                background: 'white',
                border: '1.5px solid var(--tqf-beige-border)',
              }}
            />
          </div>

          {/* Amount */}
          <div>
            <label
              className="block text-xs uppercase tracking-wide mb-2"
              style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
            >
              Monto *
            </label>
            <div className="relative">
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2 text-xl"
                style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
              >
                $
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-2xl pl-10 pr-4 py-4 text-2xl outline-none"
                style={{
                  fontFamily: 'var(--font-body)',
                  color: 'var(--tqf-dark)',
                  background: 'white',
                  border: '1.5px solid var(--tqf-beige-border)',
                }}
                autoFocus={!isEdit}
              />
            </div>
          </div>

          {/* Method */}
          <div>
            <label
              className="block text-xs uppercase tracking-wide mb-2"
              style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
            >
              Método
            </label>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value)}
                  className="py-3 rounded-xl text-sm transition-all active:scale-95"
                  style={{
                    fontFamily: 'var(--font-body)',
                    border:
                      method === m.value
                        ? '2px solid var(--tqf-bordeaux)'
                        : '1.5px solid var(--tqf-beige-border)',
                    background:
                      method === m.value ? 'var(--tqf-cipria-light)' : 'white',
                    color:
                      method === m.value ? 'var(--tqf-bordeaux)' : 'var(--tqf-dark)',
                    fontWeight: method === m.value ? 600 : 400,
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick tags */}
          <div>
            <label
              className="block text-xs uppercase tracking-wide mb-2"
              style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
            >
              Categoría (opcional)
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_TAGS.map(tag => {
                const selected = selectedTags.includes(tag.value);
                return (
                  <button
                    key={tag.value}
                    type="button"
                    onClick={() => toggleTag(tag.value)}
                    className="px-3 py-2 rounded-full text-sm transition-all active:scale-95"
                    style={{
                      fontFamily: 'var(--font-body)',
                      border: selected
                        ? '2px solid var(--tqf-bordeaux)'
                        : '1.5px solid var(--tqf-beige-border)',
                      background: selected ? 'var(--tqf-cipria-light)' : 'white',
                      color: selected ? 'var(--tqf-bordeaux)' : 'var(--tqf-dark)',
                      fontWeight: selected ? 600 : 400,
                    }}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photo — only in add mode */}
          {!isEdit && (
            <PhotoUpload
              value={photo}
              onChange={setPhoto}
              label="Recibo (opcional)"
            />
          )}

          {/* Note */}
          <div>
            <label
              className="block text-xs uppercase tracking-wide mb-2"
              style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
            >
              Nota (opcional)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ej: Flores de Jamaica para el arreglo principal..."
              rows={2}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
              style={{
                fontFamily: 'var(--font-body)',
                color: 'var(--tqf-dark)',
                background: 'white',
                border: '1.5px solid var(--tqf-beige-border)',
              }}
            />
          </div>

          {/* Sin respaldo hint */}
          {willBeSinRespaldo && (
            <div
              className="rounded-xl px-4 py-3"
              style={{ background: '#fffbeb', border: '1px solid #fde68a' }}
            >
              <p
                className="text-sm"
                style={{ color: '#92400e', fontFamily: 'var(--font-body)' }}
              >
                Este gasto se guardará como{' '}
                <strong>sin respaldo</strong>. Puedes agregar foto,
                categoría o nota para darle contexto.
              </p>
            </div>
          )}
        </div>

        {/* Save */}
        <div className="px-6 pb-8 pt-2" style={{ background: 'var(--tqf-beige)' }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid || saving}
            className="w-full py-4 rounded-2xl text-base flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 active:scale-[0.98]"
            style={{
              background: 'var(--tqf-bordeaux)',
              color: 'white',
              fontFamily: 'var(--font-body)',
            }}
          >
            {saving ? (
              <Loader2 className="size-5 animate-spin" />
            ) : isEdit ? (
              'Actualizar'
            ) : isValid ? (
              `Guardar $${numAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
            ) : (
              'Guardar'
            )}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
