'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { PhotoUpload } from './PhotoUpload';
import { PaymentMethod, TransactionRow } from '@/lib/cash-control/types';
import { addMoneyReceived, updateMoneyReceived } from '@/lib/cash-control/firestore';
import {
  cacheProofUploadFile,
  removeCachedProofUploadFile,
  retryCachedProofUpload,
  uploadProofPhoto,
} from '@/lib/cash-control/storage';
import { todayISO } from '@/lib/cash-control/calculations';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  eventId: string;
  userId: string;
  initialData?: TransactionRow; // when provided → edit mode
}

export function ReceivedMoneySheet({ open, onClose, eventId, userId, initialData }: Props) {
  const isEdit = !!initialData;

  const [amount, setAmount] = useState(initialData ? String(initialData.amount) : '');
  const [method, setMethod] = useState<PaymentMethod>(initialData?.method ?? 'efectivo');
  const [note, setNote] = useState(initialData?.note ?? '');
  const [date, setDate] = useState(initialData?.date ?? todayISO());
  const [photo, setPhoto] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setAmount(initialData ? String(initialData.amount) : '');
    setMethod(initialData?.method ?? 'efectivo');
    setNote(initialData?.note ?? '');
    setDate(initialData?.date ?? todayISO());
    setPhoto(null);
    setUploadProgress(null);
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
        await updateMoneyReceived(initialData.id, {
          amount: numAmount,
          method,
          note: note.trim() || null,
          date,
        });
        toast.success('Movimiento actualizado');
      } else {
        const proofPending = Boolean(photo);
        const proofImageUrl = null;

        const movementId = await addMoneyReceived({
          eventId,
          userId,
          amount: numAmount,
          method,
          note: note.trim() || null,
          proofImageUrl,
          uploadStatus: proofPending ? 'pending' : null,
          date,
          createdBy: userId,
        });

        const pendingPhoto = photo;
        reset();
        onClose();

        if (pendingPhoto) {
          cacheProofUploadFile(movementId, pendingPhoto);
          toast.success('Movimiento guardado, subiendo foto…');

          void (async () => {
            try {
              const uploadedUrl = await uploadProofPhoto(userId, eventId, pendingPhoto, {
                onProgress: setUploadProgress,
              });
              await updateMoneyReceived(movementId, {
                proofImageUrl: uploadedUrl,
                uploadStatus: 'uploaded',
              });
              removeCachedProofUploadFile(movementId);
            } catch (innerError) {
              console.error('Error uploading proof photo:', innerError);
              await updateMoneyReceived(movementId, {
                uploadStatus: 'failed',
              });
              toast.error('Foto fallida', {
                action: {
                  label: 'Reintentar',
                  onClick: async () => {
                    try {
                      setUploadProgress(0);
                      const uploadedUrl = await retryCachedProofUpload(
                        movementId,
                        userId,
                        eventId,
                        {
                          onProgress: setUploadProgress,
                        }
                      );
                      await updateMoneyReceived(movementId, {
                        proofImageUrl: uploadedUrl,
                        uploadStatus: 'uploaded',
                      });
                      removeCachedProofUploadFile(movementId);
                      toast.success('Foto subida correctamente');
                    } catch (retryError) {
                      console.error('Retry upload failed:', retryError);
                      toast.error('Reintento fallido. Verifica la conexión.');
                    } finally {
                      setUploadProgress(null);
                    }
                  },
                },
              });
            } finally {
              setUploadProgress(null);
            }
          })();
        } else {
          toast.success(
            `Recibido: $${numAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
          );
        }
      }
      if (isEdit) {
        reset();
        onClose();
      }
    } catch (error) {
      console.error('Error saving received money entry:', error);
      const message = error instanceof Error ? error.message : 'Error al guardar. Intenta de nuevo.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const numAmount = parseFloat(amount.replace(',', '.'));
  const isValid = !isNaN(numAmount) && numAmount > 0;

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
        className="rounded-t-3xl max-h-[90vh] overflow-y-auto"
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
            {isEdit ? 'Editar entrada' : 'Recibir dinero'}
          </SheetTitle>
        </SheetHeader>

        <div className="px-6 py-4 space-y-5">
          {/* Amount — first so keyboard opens here and stays visible */}
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

          {/* Date — below method since it defaults to today */}
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

          {/* Photo — only in add mode */}
          {!isEdit && (
            <PhotoUpload
              value={photo}
              onChange={setPhoto}
              label="Comprobante (opcional)"
              uploadProgress={uploadProgress}
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
              placeholder="Ej: Anticipo de Nancy, transferencia recibida al llegar..."
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
        </div>

        <div className="px-6 pb-8 pt-2" style={{ background: 'var(--tqf-beige)' }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid || saving}
            className="w-full py-4 rounded-2xl text-base flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 active:scale-[0.98]"
            style={{
              background: '#166534',
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
