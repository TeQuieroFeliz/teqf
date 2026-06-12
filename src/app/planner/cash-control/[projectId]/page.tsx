'use client';

// PART-3: MXN currency, IT/ES switch, payment method, tags FIFO, photo upload,
//         cerrar cuenta + email, calendar restyling

import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { auth as clientAuth, db, storage } from '@/firebase/client';
import { formatCurrency } from '@/lib/format';
import { compressImage } from '@/lib/cash-control/compressImage';
import { TeqfCashMovement, TeqfMovementType, TeqfPaymentMethod, TeqfProject } from '@/lib/teqf-types';
import { useT } from '@/hooks/useT';
import IT from '@/locales/cash-control/it.json';
import ES from '@/locales/cash-control/es.json';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { format as fmtDateFns, parseISO } from 'date-fns';
import { es as dateES, it as dateIT } from 'date-fns/locale';
import {
  ArrowLeft,
  CalendarIcon,
  Camera,
  ChevronRight,
  Lock,
  Loader2,
  MailX,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
  Unlock,
  Wallet,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────────────────────

const QUICK_TAGS = ['flores', 'ferreteria', 'comida', 'uber', 'taxi', 'materiales', 'propina', 'urgente'];
const MAX_TAGS = 8;
const MAX_TAG_CHARS = 24;
const MAX_PHOTOS = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtLocalDate(iso: string, lang: 'it' | 'es'): string {
  if (!iso) return '—';
  try {
    return fmtDateFns(parseISO(iso), 'dd MMM yyyy', { locale: lang === 'it' ? dateIT : dateES });
  } catch {
    return iso;
  }
}

// PART-3: FIFO tag cap — when 9th tag added, remove the oldest
function fifoAddTag(current: string[], tag: string): string[] {
  const norm = tag.trim().toLowerCase().slice(0, MAX_TAG_CHARS);
  if (!norm || current.includes(norm)) return current;
  const next = [...current, norm];
  return next.length > MAX_TAGS ? next.slice(next.length - MAX_TAGS) : next;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputSt: React.CSSProperties = {
  width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.625rem',
  border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)',
  fontSize: '0.9rem', color: 'var(--tqf-dark)', background: 'white', outline: 'none',
};
const lbl: React.CSSProperties = {
  display: 'block', fontSize: '0.6rem', textTransform: 'uppercase',
  letterSpacing: '0.1em', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)',
  marginBottom: '0.3rem',
};

// ─── MovementModal ────────────────────────────────────────────────────────────

interface MovForm {
  date: string;
  description: string;
  amount: string;
  type: TeqfMovementType;
  paymentMethod: TeqfPaymentMethod;
  tags: string[];
  tagInput: string;
  photos: File[];
  previewUrls: string[];
}

function MovementModal({
  projectId, existing, createdBy, createdByName, onClose, onSaved, lang,
}: {
  projectId: string;
  existing?: TeqfCashMovement;
  createdBy: string;
  createdByName: string;
  onClose: () => void;
  onSaved: () => void;
  lang: 'it' | 'es';
}) {
  const { t } = useT({ it: IT, es: ES });

  // PART-3: step 1 shows payment-method selector for new income movements
  const [step, setStep] = useState<'methodSelect' | 'form'>(() =>
    existing ? 'form' : 'methodSelect'
  );

  const [form, setForm] = useState<MovForm>({
    date:          existing?.date          ?? todayISO(),
    description:   existing?.description   ?? '',
    amount:        existing?.amount        ? String(existing.amount) : '',
    type:          existing?.type          ?? 'income',
    paymentMethod: existing?.paymentMethod ?? 'efectivo',
    tags:          existing?.tags          ?? [],
    tagInput:      '',
    photos:        [],
    previewUrls:   [],
  });
  const [calOpen,   setCalOpen]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up preview object URLs on unmount
  useEffect(() => {
    const urls = form.previewUrls;
    return () => { urls.forEach(URL.revokeObjectURL); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = <K extends keyof MovForm>(k: K, v: MovForm[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  function submitTag(raw: string) {
    const norm = raw.trim().toLowerCase().slice(0, MAX_TAG_CHARS);
    if (!norm) return;
    setField('tags', fifoAddTag(form.tags, norm));
    setField('tagInput', '');
  }

  function removeTag(tag: string) {
    setField('tags', form.tags.filter(t => t !== tag));
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const toAdd = files.slice(0, MAX_PHOTOS - form.photos.length);
    const newUrls = toAdd.map(f => URL.createObjectURL(f));
    setForm(f => ({
      ...f,
      photos: [...f.photos, ...toAdd],
      previewUrls: [...f.previewUrls, ...newUrls],
    }));
    e.target.value = '';
  }

  function removePhoto(idx: number) {
    URL.revokeObjectURL(form.previewUrls[idx]);
    setForm(f => ({
      ...f,
      photos: f.photos.filter((_, i) => i !== idx),
      previewUrls: f.previewUrls.filter((_, i) => i !== idx),
    }));
  }

  // Upload photos while modal is still open (File objects are still live)
  // Path: cashcontrol/{projectId}/{timestamp}_{i}_{filename} — no uid segment
  async function uploadPhotos(photos: File[]): Promise<string[]> {
    if (!storage) throw new Error('Firebase Storage non disponibile. Riprova.');
    const urls: string[] = [];
    const total = photos.length;
    for (let i = 0; i < total; i++) {
      const file = photos[i];
      const compressed = await compressImage(file);
      const fileToUpload = compressed.size > 0 ? compressed : file;
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `cashcontrol/${projectId}/${Date.now()}_${i}_${safeName}`;
      const sRef = storageRef(storage, path);
      await new Promise<void>((resolve, reject) => {
        const task = uploadBytesResumable(sRef, fileToUpload, {
          contentType: fileToUpload.type || 'image/jpeg',
        });
        task.on('state_changed',
          snap => {
            const base = (i / total) * 100;
            const chunk = (snap.bytesTransferred / snap.totalBytes) * (100 / total);
            setUploadPct(Math.round(base + chunk));
          },
          err => {
            console.error('[cash-control] photo upload error:', err);
            reject(err);
          },
          () => resolve()
        );
      });
      urls.push(await getDownloadURL(sRef));
    }
    return urls;
  }

  async function handleSave() {
    if (!form.description.trim()) { toast.error(t('required')); return; }
    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) { toast.error(t('invalidAmount')); return; }
    setSaving(true);
    try {
      // Upload photos first, while modal is still mounted (File objects are live)
      let photoUrls: string[] = existing?.photoUrls ?? [];
      if (form.photos.length > 0) {
        const newUrls = await uploadPhotos(form.photos);
        photoUrls = [...photoUrls, ...newUrls];
        setUploadPct(null);
      }

      const now = new Date().toISOString();
      const base = {
        date:         form.date,
        description:  form.description.trim(),
        amount,
        type:         form.type,
        ...(form.type === 'income' ? { paymentMethod: form.paymentMethod } : {}),
        tags:         form.tags,
        photoUrls,
        assignedTo:   createdByName,
        status:       'completed' as const,
      };

      if (existing) {
        await updateDoc(
          doc(db, 'teqfProjects', projectId, 'cashControl', existing.id),
          { ...base, updatedAt: now }
        );
        toast.success(t('updated'));
      } else {
        await addDoc(
          collection(db, 'teqfProjects', projectId, 'cashControl'),
          { ...base, createdBy, createdAt: now, updatedAt: now }
        );
        toast.success(t('saved'));
      }
      form.previewUrls.forEach(URL.revokeObjectURL);
      onSaved(); onClose();
    } catch (e: any) {
      console.error('[cash-control] save failed:', e);
      toast.error(e.message ?? 'Error.');
      setUploadPct(null);
    } finally {
      setSaving(false);
    }
  }

  const isIncome    = form.type === 'income';
  const dateLocale  = lang === 'it' ? dateIT : dateES;

  // ── Step 1: type + payment method ─────────────────────────────────────────
  if (step === 'methodSelect' && !existing) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center"
        style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
        <div className="w-full max-w-lg rounded-t-3xl overflow-hidden"
          style={{ background: 'white' }} onClick={e => e.stopPropagation()}>
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full" style={{ background: 'var(--tqf-beige-border)' }} />
          </div>
          <div className="px-5 pb-8 space-y-5">
            {/* Type toggle */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              {(['income', 'expense'] as TeqfMovementType[]).map(tp => {
                const active = form.type === tp;
                const isInc  = tp === 'income';
                return (
                  <button key={tp} type="button"
                    onClick={() => setField('type', tp)}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium"
                    style={{
                      border: `1.5px solid ${active ? (isInc ? '#15803d' : '#991b1b') : 'var(--tqf-beige-border)'}`,
                      background: active ? (isInc ? '#f0fdf4' : '#fef2f2') : 'white',
                      color: active ? (isInc ? '#15803d' : '#991b1b') : 'var(--tqf-muted)',
                      fontFamily: 'var(--font-body)',
                    }}>
                    {isInc ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                    {t(isInc ? 'income' : 'expense')}
                  </button>
                );
              })}
            </div>

            {/* PART-3: Payment method selector (income) */}
            {form.type === 'income' && (
              <div className="space-y-2">
                <p style={{ ...lbl, marginBottom: 0 }}>{t('selectPaymentMethod')}</p>
                <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  {t('paymentMethodHint')}
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {(['efectivo', 'transferencia'] as TeqfPaymentMethod[]).map(m => (
                    <button key={m} type="button"
                      onClick={() => { setField('paymentMethod', m); setStep('form'); }}
                      className="flex items-center justify-between py-4 px-4 rounded-2xl text-sm font-medium transition-all active:scale-[0.97]"
                      style={{
                        border: '1.5px solid var(--tqf-beige-border)',
                        background: 'white',
                        color: 'var(--tqf-dark)',
                        fontFamily: 'var(--font-body)',
                      }}>
                      {t(m)}
                      <ChevronRight className="size-4" style={{ color: 'var(--tqf-muted)' }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Expense goes straight to form */}
            {form.type === 'expense' && (
              <button type="button" onClick={() => setStep('form')}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold"
                style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
                {t('next')} <ChevronRight className="size-4" />
              </button>
            )}

            <button onClick={onClose} className="w-full py-3 rounded-2xl text-sm"
              style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {t('cancel')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: full form ──────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl overflow-y-auto"
        style={{ background: 'white', maxHeight: '92dvh' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--tqf-beige-border)' }} />
        </div>
        <div className="px-5 pb-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              {existing ? t('editMovement') : t('newMovement')}
            </h2>
            <button onClick={onClose} style={{ color: 'var(--tqf-muted)' }}><X className="size-5" /></button>
          </div>

          {/* Type toggle (edit mode or after method select) */}
          {!existing && (
            <div className="grid grid-cols-2 gap-2">
              {(['income', 'expense'] as TeqfMovementType[]).map(tp => {
                const active = form.type === tp;
                const isInc  = tp === 'income';
                return (
                  <button key={tp} type="button"
                    onClick={() => setField('type', tp)}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium"
                    style={{
                      border: `1.5px solid ${active ? (isInc ? '#15803d' : '#991b1b') : 'var(--tqf-beige-border)'}`,
                      background: active ? (isInc ? '#f0fdf4' : '#fef2f2') : 'white',
                      color: active ? (isInc ? '#15803d' : '#991b1b') : 'var(--tqf-muted)',
                      fontFamily: 'var(--font-body)',
                    }}>
                    {isInc ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                    {t(isInc ? 'income' : 'expense')}
                  </button>
                );
              })}
            </div>
          )}

          {/* Payment method toggle (income) */}
          {isIncome && (
            <div className="flex gap-2">
              {(['efectivo', 'transferencia'] as TeqfPaymentMethod[]).map(m => (
                <button key={m} type="button"
                  onClick={() => setField('paymentMethod', m)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium"
                  style={{
                    border: `1.5px solid ${form.paymentMethod === m ? '#15803d' : 'var(--tqf-beige-border)'}`,
                    background: form.paymentMethod === m ? '#f0fdf4' : 'white',
                    color: form.paymentMethod === m ? '#15803d' : 'var(--tqf-muted)',
                    fontFamily: 'var(--font-body)',
                  }}>
                  {t(m)}
                </button>
              ))}
            </div>
          )}

          {/* Importo */}
          <div>
            <label style={lbl}>{t('amount')} *</label>
            <input type="number" inputMode="decimal" min="0" step="0.01"
              value={form.amount}
              onChange={e => setField('amount', e.target.value)}
              placeholder="0.00"
              style={{
                ...inputSt, fontSize: '1.4rem', fontWeight: 700, textAlign: 'center',
                color: isIncome ? '#15803d' : '#991b1b',
              }}
              autoFocus={!existing} />
          </div>

          {/* Descrizione */}
          <div>
            <label style={lbl}>{t('description')} *</label>
            <input type="text" value={form.description}
              onChange={e => setField('description', e.target.value)}
              placeholder={t('description')} style={inputSt} />
          </div>

          {/* PART-3: Tags with FIFO cap */}
          <div>
            <label style={lbl}>
              {t('tags')}
              {form.tags.length > 0 && (
                <span className="ml-2 normal-case" style={{ letterSpacing: 0, fontSize: '0.65rem' }}>
                  {form.tags.length}/{MAX_TAGS}
                </span>
              )}
            </label>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs"
                    style={{
                      background: 'var(--tqf-cipria-light)',
                      border: '1px solid var(--tqf-bordeaux)',
                      color: 'var(--tqf-bordeaux)',
                      fontFamily: 'var(--font-body)',
                    }}>
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}>
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {form.tags.length < MAX_TAGS && (
              <div className="flex gap-2 mb-2">
                <input type="text" value={form.tagInput}
                  onChange={e => {
                    const v = e.target.value;
                    if (v.length <= MAX_TAG_CHARS) setField('tagInput', v);
                    else toast.error(t('tagTooLong'));
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); submitTag(form.tagInput); }
                  }}
                  placeholder={t('tagsPlaceholder')}
                  style={{ ...inputSt, flex: 1 }} />
                <button type="button" onClick={() => submitTag(form.tagInput)}
                  className="px-3 rounded-xl text-xs font-bold"
                  style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
                  +
                </button>
              </div>
            )}
            {form.tags.length < MAX_TAGS && (
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TAGS.filter(qt => !form.tags.includes(qt)).map(qt => (
                  <button key={qt} type="button"
                    onClick={() => setField('tags', fifoAddTag(form.tags, qt))}
                    className="px-3 py-2 rounded-full text-xs transition-all active:scale-95"
                    style={{
                      border: '1px solid var(--tqf-beige-border)',
                      background: 'white',
                      color: 'var(--tqf-muted)',
                      fontFamily: 'var(--font-body)',
                    }}>
                    {qt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* PART-3: Photo upload (camera + gallery) */}
          <div>
            <label style={lbl}>
              {t('photo')}
              {form.photos.length > 0 && ` (${form.photos.length}/${MAX_PHOTOS})`}
            </label>
            <div className="flex items-start gap-2 flex-wrap">
              {/* Saved photos from existing movement */}
              {existing?.photoUrls?.map((url, idx) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                  className="size-16 rounded-xl overflow-hidden flex-shrink-0 block"
                  style={{ border: '1px solid var(--tqf-beige-border)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`foto ${idx + 1}`} className="size-full object-cover" />
                </a>
              ))}
              {/* New photos to upload */}
              {form.previewUrls.map((url, idx) => (
                <div key={url} className="relative size-16 rounded-xl overflow-hidden flex-shrink-0"
                  style={{ border: '1px solid var(--tqf-beige-border)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`foto ${idx + 1}`} className="size-full object-cover" />
                  <button type="button" onClick={() => removePhoto(idx)}
                    className="absolute top-0.5 right-0.5 size-4 rounded-full flex items-center justify-center"
                    style={{ background: '#991b1b', color: 'white' }}>
                    <X className="size-2.5" />
                  </button>
                </div>
              ))}
              {form.photos.length < MAX_PHOTOS && (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="size-16 rounded-xl flex flex-col items-center justify-center gap-1 text-xs transition-all active:scale-95 flex-shrink-0"
                  style={{
                    border: '1.5px dashed var(--tqf-beige-border)',
                    background: 'var(--tqf-beige)',
                    color: 'var(--tqf-muted)',
                    fontFamily: 'var(--font-body)',
                  }}>
                  <Camera className="size-5" />
                </button>
              )}
              <input ref={fileInputRef} type="file"
                accept="image/*" capture="environment"
                multiple className="hidden"
                onChange={handlePhotoChange} />
            </div>
            {uploadPct !== null && (
              <div className="mt-2 w-full rounded-full overflow-hidden h-1.5"
                style={{ background: 'var(--tqf-beige-border)' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${uploadPct}%`, background: '#15803d' }} />
              </div>
            )}
          </div>

          {/* PART-3: Calendar date picker */}
          <div>
            <label style={lbl}>{t('date')}</label>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <button type="button"
                  className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-left"
                  style={{
                    border: '1px solid var(--tqf-beige-border)',
                    background: 'white',
                    color: 'var(--tqf-dark)',
                    fontFamily: 'var(--font-body)',
                  }}>
                  <CalendarIcon className="size-4 flex-shrink-0" style={{ color: 'var(--tqf-muted)' }} />
                  {fmtLocalDate(form.date, lang)}
                </button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-auto" align="start">
                <Calendar
                  mode="single"
                  selected={form.date ? parseISO(form.date) : undefined}
                  onSelect={d => {
                    if (d) {
                      const y = d.getFullYear();
                      const mo = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      setField('date', `${y}-${mo}-${day}`);
                    }
                    setCalOpen(false);
                  }}
                  weekStartsOn={1}
                  locale={dateLocale}
                  initialFocus
                  className="rounded-xl"
                  style={{
                    '--accent': 'var(--tqf-cipria-light)',
                    '--accent-foreground': 'var(--tqf-bordeaux)',
                    '--primary': 'var(--tqf-bordeaux)',
                    '--primary-foreground': '#fff',
                    '--muted': 'var(--tqf-beige)',
                    '--radius': '0.75rem',
                  } as React.CSSProperties}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {uploadPct !== null
                ? `${uploadPct}%`
                : (existing ? t('update') : t('save'))}
            </button>
            <button onClick={onClose}
              className="px-5 py-3.5 rounded-2xl text-sm"
              style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {t('cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CloseConfirmSheet ────────────────────────────────────────────────────────

function CloseConfirmSheet({
  projectId, projectName, createdBy,
  totalIncome, totalExpense, saldo,
  onClose, onClosed,
}: {
  projectId: string;
  projectName: string;
  createdBy: string;
  totalIncome: number;
  totalExpense: number;
  saldo: number;
  onClose: () => void;
  onClosed: (emailFailed: boolean) => void;
}) {
  const { t } = useT({ it: IT, es: ES });
  const [closing, setClosing] = useState(false);

  async function handleConfirm() {
    setClosing(true);
    try {
      const token = await clientAuth?.currentUser?.getIdToken(true);
      if (!token) throw new Error('Sin sesión activa.');
      const res = await fetch('/api/cash-control/teqf-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ projectId, projectName, closedBy: createdBy, totalIncome, totalExpense, saldo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al cerrar.');
      toast.success(t('closedOk'));
      if (data.emailFailed) toast.error(t('reportEmailFailed'));
      onClosed(data.emailFailed ?? false);
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setClosing(false);
    }
  }

  const saldoColor = saldo >= 0 ? '#166534' : '#991b1b';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl"
        style={{ background: 'var(--tqf-beige)' }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--tqf-beige-border)' }} />
        </div>
        <div className="px-6 py-4 space-y-4">
          <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
            {t('closeAccountTitle')}
          </h2>
          <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            {t('closeAccountDesc')}
          </p>
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            {[
              { label: t('totalReceived'), value: totalIncome,  color: '#166534' },
              { label: t('totalSpent'),    value: totalExpense, color: '#991b1b' },
              { label: t('finalBalance'),  value: saldo,        color: saldoColor, bold: true },
            ].map(({ label, value, color, bold }, i, arr) => (
              <div key={label} className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--tqf-beige-border)' : 'none' }}>
                <span className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{label}</span>
                <span className="text-sm" style={{ color, fontFamily: 'var(--font-body)', fontWeight: bold ? 600 : 400 }}>
                  {formatCurrency(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 pb-8 pt-2 space-y-3" style={{ background: 'var(--tqf-beige)' }}>
          <button type="button" onClick={handleConfirm} disabled={closing}
            className="w-full py-4 rounded-2xl text-base flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
            style={{ background: '#991b1b', color: 'white', fontFamily: 'var(--font-body)' }}>
            {closing ? <Loader2 className="size-5 animate-spin" /> : t('closeConfirm')}
          </button>
          <button type="button" onClick={onClose} disabled={closing}
            className="w-full py-4 rounded-2xl text-base disabled:opacity-50"
            style={{ border: '1.5px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', background: 'white', fontFamily: 'var(--font-body)' }}>
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CashControlDetailPage() {
  const params    = useParams();
  const projectId = params?.projectId as string;

  const {
    isSuperAdmin, canManageCashControl,
    plannerUser, adminUser,
    isLoading: authLoading,
  } = usePlannerAuth();

  // PART-3: IT/ES language switch persisted to localStorage
  const { t, lang, setLang } = useT({ it: IT, es: ES });

  const [project,   setProject]  = useState<TeqfProject | null>(null);
  const [movements, setMovements] = useState<TeqfCashMovement[]>([]);
  const [loading,   setLoading]  = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [editMov,      setEditMov]      = useState<TeqfCashMovement | undefined>();
  const [showClose,    setShowClose]    = useState(false);
  const [showRename,   setShowRename]   = useState(false);
  const [renameDraft,  setRenameDraft]  = useState('');
  const [renaming,     setRenaming]     = useState(false);

  const canAccess      = isSuperAdmin || canManageCashControl;
  const isAdmin        = isSuperAdmin;
  const isClosed       = project?.isClosed === true;
  // Open project: any participant can modify. Closed project: admin only.
  const canModify      = canAccess && (!isClosed || isAdmin);
  const canAddMovement = canAccess && !isClosed;

  useEffect(() => {
    if (authLoading || !projectId) return;
    const unsubProject = onSnapshot(
      doc(db, 'teqfProjects', projectId),
      snap => { if (snap.exists()) setProject({ id: snap.id, ...snap.data() } as TeqfProject); }
    );
    const unsubMov = onSnapshot(
      query(collection(db, 'teqfProjects', projectId, 'cashControl'), orderBy('date', 'desc')),
      snap => {
        setMovements(snap.docs.map(d => ({ id: d.id, ...d.data() } as TeqfCashMovement)));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => { unsubProject(); unsubMov(); };
  }, [projectId, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <div className="text-center">
          <p className="text-base mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)' }}>
            Accesso non autorizzato
          </p>
          <Link href="/planner/cash-control" className="text-sm"
            style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
            ← Cash Control
          </Link>
        </div>
      </div>
    );
  }

  const createdBy     = adminUser?.id   ?? plannerUser?.id   ?? '';
  const createdByName = adminUser?.name ?? plannerUser?.name ?? '';
  const projectName   = project?.name ?? 'Cash Control';

  const totalIncome  = movements.filter(m => m.type === 'income').reduce((s, m) => s + m.amount, 0);
  const totalExpense = movements.filter(m => m.type === 'expense').reduce((s, m) => s + m.amount, 0);
  const saldo        = totalIncome - totalExpense;
  const saldoColor   = saldo >= 0 ? '#15803d' : '#991b1b';

  function openAdd()  { setEditMov(undefined); setShowModal(true); }
  function openEdit(m: TeqfCashMovement) { setEditMov(m); setShowModal(true); }

  function openRename() { setRenameDraft(projectName); setShowRename(true); }

  async function handleRename() {
    const trimmed = renameDraft.trim();
    if (!trimmed) { toast.error('Il nome è obbligatorio.'); return; }
    if (trimmed === project?.name) { setShowRename(false); return; }
    setRenaming(true);
    try {
      await updateDoc(doc(db, 'teqfProjects', projectId), {
        name: trimmed, updatedAt: new Date().toISOString(),
      });
      toast.success('Nome aggiornato.');
      setShowRename(false);
    } catch (e: any) {
      toast.error(e.message ?? 'Errore durante il salvataggio.');
    } finally {
      setRenaming(false);
    }
  }

  async function handleDelete(m: TeqfCashMovement) {
    if (!confirm(t('deleteConfirm').replace('{name}', m.description))) return;
    try {
      await deleteDoc(doc(db, 'teqfProjects', projectId, 'cashControl', m.id));
      toast.success(t('removed'));
    } catch (e: any) {
      toast.error(e.message ?? 'Error.');
    }
  }

  async function handleDeleteProject() {
    const msg = t('deleteProjectConfirm').replace('{name}', projectName);
    if (!confirm(msg)) return;
    try {
      await updateDoc(doc(db, 'teqfProjects', projectId), {
        deleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: createdBy,
        updatedAt: new Date().toISOString(),
      });
      toast.success(t('projectDeleted'));
      window.location.href = '/planner/cash-control';
    } catch (e: any) {
      toast.error(e.message ?? 'Error.');
    }
  }

  async function handleReopenProject() {
    if (!confirm(t('reopenAccount') + '?')) return;
    try {
      const token = await clientAuth?.currentUser?.getIdToken(true);
      if (!token) throw new Error('Sin sesión activa.');
      const res = await fetch('/api/cash-control/teqf-reopen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error.');
      toast.success(t('reopenOk'));
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : 'Error.');
    }
  }

  async function handleResendReport() {
    try {
      const token = await clientAuth?.currentUser?.getIdToken(true);
      if (!token) throw new Error('Sin sesión activa.');
      const res = await fetch('/api/cash-control/teqf-resend-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error.');
      toast.success(t('resendReportOk'));
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : 'Error.');
    }
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: 'var(--tqf-beige)' }}>

      {/* Header */}
      <header className="sticky top-0 z-10 px-4 pt-3 pb-3"
        style={{ background: 'white', borderBottom: '1px solid var(--tqf-beige-border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Link href="/planner/cash-control" className="flex-shrink-0" style={{ color: 'var(--tqf-muted)' }}>
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: '#f0fdf4', color: '#15803d' }}>
              <Wallet className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium truncate"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontWeight: 400 }}>
                  {projectName}
                </p>
                {canModify && (
                  <button onClick={openRename} className="flex-shrink-0 hover:opacity-70"
                    style={{ color: 'var(--tqf-muted)' }}>
                    <Pencil className="size-3.5" />
                  </button>
                )}
                {canModify && (
                  <button onClick={handleDeleteProject} className="flex-shrink-0 hover:opacity-70"
                    style={{ color: '#991b1b' }}>
                    <Trash2 className="size-3.5" />
                  </button>
                )}
                {isClosed && (
                  <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: '#fef2f2', color: '#991b1b', fontFamily: 'var(--font-body)' }}>
                    <Lock className="size-2.5" />{t('closed')}
                  </span>
                )}
                {isClosed && isAdmin && (
                  <button onClick={handleReopenProject}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg flex-shrink-0 hover:opacity-70"
                    style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontFamily: 'var(--font-body)' }}>
                    <Unlock className="size-3" />{t('reopenAccount')}
                  </button>
                )}
              </div>
              <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {movements.length} {movements.length === 1 ? t('movement') : t('movements')}
              </p>
            </div>
          </div>

          {/* PART-3: IT/ES language toggle */}
          <button onClick={() => setLang(lang === 'it' ? 'es' : 'it')}
            className="text-xs px-2 py-1 rounded-lg flex-shrink-0"
            style={{
              border: '1px solid var(--tqf-beige-border)',
              color: 'var(--tqf-muted)',
              fontFamily: 'var(--font-body)',
              background: 'white',
            }}>
            {t('langSwitch')}
          </button>

          {canAddMovement && (
            <button onClick={openAdd}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl flex-shrink-0"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
              <Plus className="size-3.5" /> {t('addMovement')}
            </button>
          )}
        </div>

        {/* Stats bar — PART-3: MXN currency */}
        <div className="grid grid-cols-3 gap-2 rounded-xl px-3 py-2.5"
          style={{ background: 'var(--tqf-beige)' }}>
          {[
            { label: t('incomes'),  value: formatCurrency(totalIncome),  color: '#15803d' },
            { label: t('expenses'), value: formatCurrency(totalExpense), color: '#991b1b' },
            { label: t('balance'),  value: formatCurrency(saldo),        color: saldoColor },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className="text-sm font-semibold truncate" style={{ color, fontFamily: 'var(--font-body)' }}>{value}</p>
              <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{label}</p>
            </div>
          ))}
        </div>
      </header>

      {/* Closed notice */}
      {isClosed && (
        <div className="mx-4 mt-4 rounded-2xl px-5 py-4 flex items-center gap-3"
          style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <Lock className="size-5 flex-shrink-0" style={{ color: '#991b1b' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: '#991b1b', fontFamily: 'var(--font-body)' }}>
              {t('accountClosed')}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#991b1b', opacity: 0.8, fontFamily: 'var(--font-body)' }}>
              {t('accountClosedDesc')}
            </p>
          </div>
        </div>
      )}

      {/* Movements list */}
      <div className="px-4 pt-4 space-y-2">
        {movements.length === 0 ? (
          <div className="rounded-2xl p-10 text-center"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <div className="mx-auto mb-4 size-12 rounded-2xl flex items-center justify-center"
              style={{ background: '#f0fdf4', color: '#15803d' }}>
              <Wallet className="size-6" />
            </div>
            <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {t('noMovements')}
            </p>
          </div>
        ) : movements.map(m => {
          const isInc = m.type === 'income';
          return (
            <div key={m.id} className="rounded-2xl px-4 py-3"
              style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: isInc ? '#f0fdf4' : '#fef2f2' }}>
                  {isInc
                    ? <TrendingUp  className="size-4" style={{ color: '#15803d' }} />
                    : <TrendingDown className="size-4" style={{ color: '#991b1b' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate"
                    style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                    {m.description}
                  </p>
                  {/* Tags */}
                  {m.tags && m.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {m.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-full text-xs"
                          style={{
                            background: 'var(--tqf-cipria-light)',
                            color: 'var(--tqf-bordeaux)',
                            fontFamily: 'var(--font-body)',
                          }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                    <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                      {fmtLocalDate(m.date, lang)}
                    </span>
                    {m.paymentMethod && isInc && (
                      <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                        · {t(m.paymentMethod)}
                      </span>
                    )}
                    {m.assignedTo && (
                      <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                        · {m.assignedTo}
                      </span>
                    )}
                    {m.uploadStatus === 'pending' && (
                      <span className="text-xs" style={{ color: '#92400e', fontFamily: 'var(--font-body)' }}>· ⏳</span>
                    )}
                  </div>
                  {/* Photo thumbnails from Firestore */}
                  {m.photoUrls && m.photoUrls.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {m.photoUrls.slice(0, 3).map((url, i) => (
                        <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                          className="size-10 rounded-lg overflow-hidden flex-shrink-0 block"
                          style={{ border: '1px solid var(--tqf-beige-border)' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`foto ${i + 1}`} className="size-full object-cover" />
                        </a>
                      ))}
                      {m.photoUrls.length > 3 && (
                        <div className="size-10 rounded-lg flex items-center justify-center flex-shrink-0 text-xs"
                          style={{ background: 'var(--tqf-beige)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', border: '1px solid var(--tqf-beige-border)' }}>
                          +{m.photoUrls.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {/* PART-3: MXN amount */}
                  <p className="text-sm font-bold"
                    style={{ color: isInc ? '#15803d' : '#991b1b', fontFamily: 'var(--font-body)' }}>
                    {isInc ? '+' : '-'}{formatCurrency(m.amount)}
                  </p>
                  {canModify && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(m)}
                        className="p-1.5 rounded-lg"
                        style={{ color: 'var(--tqf-bordeaux)', background: 'var(--tqf-cipria-light)' }}>
                        <Pencil className="size-3" />
                      </button>
                      <button onClick={() => handleDelete(m)}
                        className="p-1.5 rounded-lg"
                        style={{ color: '#991b1b', background: '#fef2f2' }}>
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Email report failed banner */}
      {isClosed && project?.reportEmailFailed && (
        <div className="mx-4 mt-3 rounded-2xl px-5 py-3.5 flex items-center gap-3"
          style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
          <MailX className="size-5 flex-shrink-0" style={{ color: '#b45309' }} />
          <p className="text-sm flex-1" style={{ color: '#92400e', fontFamily: 'var(--font-body)' }}>
            {t('reportEmailFailed')}
          </p>
          <button onClick={handleResendReport}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
            style={{ background: '#b45309', color: 'white', fontFamily: 'var(--font-body)' }}>
            <RefreshCw className="size-3" />{t('resendReport')}
          </button>
        </div>
      )}

      {/* Sticky "Cerrar cuenta" button */}
      {canAddMovement && (
        <div className="fixed bottom-0 left-0 right-0 px-4 z-20"
          style={{
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
            paddingTop: '12px',
            background: 'linear-gradient(to bottom, transparent, var(--tqf-beige) 40%)',
          }}>
          <div className="max-w-lg mx-auto">
            <button onClick={() => setShowClose(true)}
              className="w-full py-4 rounded-2xl text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-80 active:scale-[0.98]"
              style={{
                border: '1.5px solid var(--tqf-beige-border)',
                color: 'var(--tqf-muted)',
                background: 'white',
                fontFamily: 'var(--font-body)',
              }}>
              <Lock className="size-4" />
              {t('closeAccount')}
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <MovementModal
          projectId={projectId}
          existing={editMov}
          createdBy={createdBy}
          createdByName={createdByName}
          onClose={() => setShowModal(false)}
          onSaved={() => setShowModal(false)}
          lang={lang}
        />
      )}

      {showClose && (
        <CloseConfirmSheet
          projectId={projectId}
          projectName={projectName}
          createdBy={createdBy}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          saldo={saldo}
          onClose={() => setShowClose(false)}
          onClosed={() => { /* reportEmailFailed persisted in Firestore via onSnapshot */ }}
        />
      )}

      {showRename && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowRename(false)}>
          <div className="w-full max-w-lg rounded-t-3xl"
            style={{ background: 'white' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--tqf-beige-border)' }} />
            </div>
            <div className="px-5 pb-8 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
                  Rinomina progetto
                </h2>
                <button onClick={() => setShowRename(false)} style={{ color: 'var(--tqf-muted)' }}>
                  <X className="size-5" />
                </button>
              </div>
              <div>
                <label style={lbl}>Nome progetto *</label>
                <input type="text" value={renameDraft} onChange={e => setRenameDraft(e.target.value)}
                  autoFocus style={inputSt}
                  onKeyDown={e => e.key === 'Enter' && handleRename()} />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleRename} disabled={renaming}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold disabled:opacity-50"
                  style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
                  {renaming && <Loader2 className="size-4 animate-spin" />}
                  Salva
                </button>
                <button onClick={() => setShowRename(false)}
                  className="px-5 py-3.5 rounded-2xl text-sm"
                  style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  Annulla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
