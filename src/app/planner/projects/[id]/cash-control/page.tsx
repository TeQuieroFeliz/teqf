'use client';

import {
  addCashMovement,
  approveCashMovement,
  deleteCashMovement,
  updateCashMovement,
  updateEventCashBudget,
} from '@/actions/planner/event-cash-control';
import { getPlannerEvent } from '@/actions/planner/planner-event-crud';
import { db, storage } from '@/firebase/client';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import {
  CASH_CATEGORIES,
  CashControlCategory,
  CashMovement,
  CashPaymentMethod,
  PlannerEvent,
} from '@/lib/planner-types';
import { collection, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage';
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Edit2,
  Loader2,
  PencilLine,
  ShieldCheck,
  Trash2,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { LanguageSelector } from '@/components/LanguageSelector';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// ── helpers ───────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function nowHHMM() {
  return new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function fmtCurrency(n: number) {
  return `$${Math.abs(n).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;
}
function fmtDate(dateStr: string, tFn: (k: 'cc_today' | 'cc_yesterday') => string, lang: string) {
  const today = todayISO();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return tFn('cc_today');
  if (dateStr === yesterday) return tFn('cc_yesterday');
  const locale = lang === 'es' ? 'es-MX' : 'en-US';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

// ── sub-components ────────────────────────────────────────────────────────────

function BalanceCard({
  movements,
  budget,
  onEditBudget,
  canAdmin,
}: {
  movements: CashMovement[];
  budget: number;
  onEditBudget: () => void;
  canAdmin: boolean;
}) {
  const { t } = useI18n();
  const totalSpent   = movements.reduce((s, m) => s + m.amount, 0);
  const totalPending = movements.filter(m => m.status === 'pending').reduce((s, m) => s + m.amount, 0);
  const balance      = budget - totalSpent;
  const hasBudget    = budget > 0;

  return (
    <div
      className="mx-4 mt-4 rounded-3xl px-5 pt-5 pb-4"
      style={{
        background: hasBudget
          ? balance >= 0 ? '#0f2e1a' : '#2a0e0e'
          : '#1a0f0a',
        color: 'white',
      }}
    >
      {/* Budget row */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs uppercase tracking-widest opacity-50" style={{ fontFamily: 'var(--font-body)', letterSpacing: '0.16em' }}>
          {hasBudget ? t('cc_balanceLabel') : t('cc_spendLabel')}
        </p>
        {canAdmin && (
          <button
            onClick={onEditBudget}
            className="flex items-center gap-1 text-xs opacity-50 hover:opacity-90 transition-opacity"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <PencilLine className="size-3" />
            {hasBudget ? 'budget' : 'set budget'}
          </button>
        )}
      </div>

      {/* Big balance */}
      <p
        className="text-5xl font-light leading-none mb-1"
        style={{
          fontFamily: 'var(--font-display)',
          color: hasBudget
            ? balance >= 0 ? '#6aff9e' : '#ff6a6a'
            : 'white',
        }}
      >
        {hasBudget ? (balance < 0 ? '-' : '') + fmtCurrency(balance) : fmtCurrency(totalSpent)}
      </p>

      {/* Sub-stats */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {hasBudget && (
          <span className="text-xs opacity-60" style={{ fontFamily: 'var(--font-body)' }}>
            Budget {fmtCurrency(budget)}
          </span>
        )}
        <span className="text-xs opacity-60" style={{ fontFamily: 'var(--font-body)' }}>
          {t('cc_spent')} {fmtCurrency(totalSpent)}
        </span>
        {totalPending > 0 && (
          <span className="text-xs" style={{ color: '#fbbf24', fontFamily: 'var(--font-body)' }}>
            {t('cc_pending')} {fmtCurrency(totalPending)}
          </span>
        )}
        <span className="text-xs opacity-50" style={{ fontFamily: 'var(--font-body)' }}>
          {movements.length} {t('cc_movements')}
        </span>
      </div>
    </div>
  );
}

// ── Movement row ──────────────────────────────────────────────────────────────

function MovementRow({
  movement,
  canAdmin,
  canEdit,
  onTap,
}: {
  movement: CashMovement;
  canAdmin: boolean;
  canEdit: boolean;
  onTap: () => void;
}) {
  const { t, lang } = useI18n();
  const cat = CASH_CATEGORIES.find(c => c.value === movement.category);

  return (
    <button
      onClick={onTap}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors active:scale-[0.99]"
      style={{ borderBottom: '1px solid var(--tqf-beige-border)', background: 'white' }}
      disabled={!canEdit && !canAdmin}
    >
      {/* Category icon */}
      <div
        className="size-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: 'var(--tqf-cipria-light)' }}
      >
        {cat?.icon ?? '📦'}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
            {cat?.label ?? movement.category}
          </span>
          {movement.paymentMethod === 'tarjeta'
            ? <CreditCard className="size-3.5 flex-shrink-0" style={{ color: 'var(--tqf-muted)' }} />
            : <Wallet className="size-3.5 flex-shrink-0" style={{ color: 'var(--tqf-muted)' }} />
          }
          <span
            className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={movement.status === 'approved'
              ? { background: '#f0fdf4', color: '#15803d', fontFamily: 'var(--font-body)' }
              : { background: '#fef9ee', color: '#b45309', fontFamily: 'var(--font-body)' }
            }
          >
            {movement.status === 'approved' ? '✓' : '·'}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {movement.note && (
            <p className="text-xs truncate max-w-[160px]" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {movement.note}
            </p>
          )}
          <p className="text-xs flex-shrink-0" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            {fmtDate(movement.date, t, lang)} {movement.time}
          </p>
        </div>
      </div>

      {/* Amount */}
      <div className="flex-shrink-0 text-right">
        <p className="text-base font-semibold" style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
          -{fmtCurrency(movement.amount)}
        </p>
        <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
          {movement.registeredByName?.split(' ')[0]}
        </p>
      </div>

      {(canEdit || canAdmin) && (
        <ChevronDown className="size-4 flex-shrink-0" style={{ color: 'var(--tqf-muted)' }} />
      )}
    </button>
  );
}

// ── Edit / Detail modal ───────────────────────────────────────────────────────

function EditModal({
  movement,
  eventId,
  canAdmin,
  onClose,
  onUpdated,
  onDeleted,
}: {
  movement: CashMovement;
  eventId: string;
  canAdmin: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}) {
  const { t, lang } = useI18n();
  const [date, setDate]       = useState(movement.date);
  const [time, setTime]       = useState(movement.time);
  const [amount, setAmount]   = useState(String(movement.amount));
  const [category, setCategory] = useState<CashControlCategory>(movement.category);
  const [method, setMethod]   = useState<CashPaymentMethod>(movement.paymentMethod);
  const [note, setNote]       = useState(movement.note ?? '');
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState(false);

  const cat = CASH_CATEGORIES.find(c => c.value === movement.category);

  async function handleSave() {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) { toast.error(t('cc_editInvalidAmount')); return; }
    setSaving(true);
    const result = await updateCashMovement(eventId, movement.id, {
      date, time,
      ...(canAdmin ? { amount: parsed, category, paymentMethod: method, note } : {}),
    });
    if (result.success) { toast.success(t('cc_editUpdated')); onUpdated(); onClose(); }
    else toast.error(result.error ?? t('cc_editUpdateError'));
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm(t('cc_editDeleteConfirm'))) return;
    setDeleting(true);
    const result = await deleteCashMovement(eventId, movement.id);
    if (result.success) { toast.success(t('cc_editDeleted')); onDeleted(); onClose(); }
    else toast.error(result.error ?? t('cc_editDeleteError'));
    setDeleting(false);
  }

  async function handleApprove() {
    setApproving(true);
    const result = await approveCashMovement(eventId, movement.id);
    if (result.success) { toast.success(t('cc_editApproved')); onUpdated(); onClose(); }
    else toast.error(result.error ?? t('cc_editApproveError'));
    setApproving(false);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '0.625rem',
    border: '1px solid var(--tqf-beige-border)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.875rem',
    color: 'var(--tqf-dark)',
    background: 'white',
    outline: 'none',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl p-5 pb-8 space-y-4"
        style={{ background: 'white', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center mb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--tqf-beige-border)' }} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{cat?.icon ?? '📦'}</span>
            <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              {fmtCurrency(movement.amount)} — {cat?.label}
            </h2>
          </div>
          <button onClick={onClose} style={{ color: 'var(--tqf-muted)' }}>
            <X className="size-5" />
          </button>
        </div>

        {/* Amount (SuperAdmin only) */}
        {canAdmin && (
          <div>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t('cc_editAmount')}</p>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ ...inputStyle, fontSize: '1.125rem', fontWeight: 600 }}
            />
          </div>
        )}

        {/* Category (SuperAdmin only) */}
        {canAdmin && (
          <div>
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t('cc_editCategory')}</p>
            <div className="grid grid-cols-3 gap-2">
              {CASH_CATEGORIES.map(c => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className="flex items-center gap-1.5 px-2 py-2 rounded-xl text-sm transition-all"
                  style={{
                    border: `1px solid ${category === c.value ? 'var(--tqf-bordeaux)' : 'var(--tqf-beige-border)'}`,
                    background: category === c.value ? 'var(--tqf-cipria-light)' : 'white',
                    color: category === c.value ? 'var(--tqf-bordeaux)' : 'var(--tqf-muted)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <span>{c.icon}</span>
                  <span className="text-xs truncate">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Payment method (SuperAdmin only) */}
        {canAdmin && (
          <div>
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t('cc_editMethod')}</p>
            <div className="grid grid-cols-2 gap-2">
              {(['tarjeta', 'efectivo'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all"
                  style={{
                    border: `1px solid ${method === m ? 'var(--tqf-bordeaux)' : 'var(--tqf-beige-border)'}`,
                    background: method === m ? 'var(--tqf-bordeaux)' : 'white',
                    color: method === m ? 'white' : 'var(--tqf-muted)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {m === 'tarjeta' ? <CreditCard className="size-4" /> : <Wallet className="size-4" />}
                  {m === 'tarjeta' ? 'Tarjeta' : 'Efectivo'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Date + Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t('cc_editDate')}</p>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t('cc_editTime')}</p>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* Note (SuperAdmin only) */}
        {canAdmin && (
          <div>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t('cc_editNote')}</p>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={t('cc_editNotePlaceholder')}
              style={inputStyle}
            />
          </div>
        )}

        {/* Receipt preview */}
        {movement.receiptUrl && (
          <div>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t('cc_editReceipt')}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={movement.receiptUrl}
              alt={t('cc_editReceipt')}
              className="w-full rounded-xl object-contain max-h-48"
              style={{ border: '1px solid var(--tqf-beige-border)' }}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {t('cc_editSave')}
          </button>

          {canAdmin && movement.status === 'pending' && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontFamily: 'var(--font-body)' }}
            >
              {approving ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            </button>
          )}

          {canAdmin && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', fontFamily: 'var(--font-body)' }}
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </button>
          )}
        </div>

        {/* Registered by info */}
        <p className="text-xs text-center" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
          {t('cc_editRegisteredBy', { name: movement.registeredByName ?? '', date: fmtDate(movement.date, t, lang), time: movement.time })}
        </p>
      </div>
    </div>
  );
}

// ── User picker sheet ─────────────────────────────────────────────────────────

type UserOption = { id: string; name: string; email?: string };

function UserPickerSheet({
  options,
  currentId,
  onSelect,
  onClose,
}: {
  options: UserOption[];
  currentId: string;
  onSelect: (u: UserOption) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl pb-8"
        style={{ background: 'white' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--tqf-beige-border)' }} />
        </div>

        <p
          className="px-5 pb-3 text-xs uppercase tracking-widest"
          style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
        >
          {t('cc_userPickerTitle')}
        </p>

        <div className="divide-y" style={{ borderColor: 'var(--tqf-beige-border)' }}>
          {options.map(u => (
            <button
              key={u.id}
              onClick={() => { onSelect(u); onClose(); }}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors hover:opacity-80 active:scale-[0.99]"
            >
              <div
                className="size-9 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
                style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}
              >
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                  {u.name}
                </p>
                {u.email && (
                  <p className="text-xs truncate" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                    {u.email}
                  </p>
                )}
              </div>
              {u.id === currentId && (
                <Check className="size-4 flex-shrink-0" style={{ color: 'var(--tqf-bordeaux)' }} />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Budget edit modal ─────────────────────────────────────────────────────────

function BudgetModal({
  eventId,
  currentBudget,
  onClose,
  onSaved,
}: {
  eventId: string;
  currentBudget: number;
  onClose: () => void;
  onSaved: (b: number) => void;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState(currentBudget > 0 ? String(currentBudget) : '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const parsed = parseFloat(value.replace(',', '.'));
    if (isNaN(parsed) || parsed < 0) { toast.error(t('cc_invalidValue')); return; }
    setSaving(true);
    const result = await updateEventCashBudget(eventId, parsed);
    if (result.success) { toast.success(t('cc_budgetSet')); onSaved(parsed); onClose(); }
    else toast.error(result.error ?? t('cc_budgetError'));
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-t-3xl p-6 pb-8 space-y-4" style={{ background: 'white' }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center mb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--tqf-beige-border)' }} />
        </div>
        <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
          {t('cc_budgetTitle')}
        </h2>
        <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
          {t('cc_budgetDesc')}
        </p>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold" style={{ color: 'var(--tqf-muted)' }}>$</span>
          <input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="0"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="w-full pl-8 pr-4 py-3 rounded-2xl text-2xl font-semibold outline-none"
            style={{ border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)', background: 'var(--tqf-beige)' }}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          {t('cc_setBudget')}
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CashControlPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.id as string;
  const { t, lang } = useI18n();

  const { plannerUser, adminUser, isSuperAdmin, canManageCashControl, canCreateProjects, isLoading: authLoading } = usePlannerAuth();

  const [event, setEvent]       = useState<PlannerEvent | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [budget, setBudget]     = useState(0);
  const [eventLoading, setEventLoading] = useState(true);

  // Form state
  const [amount, setAmount]     = useState('');
  const [method, setMethod]     = useState<CashPaymentMethod | null>(null);
  const [category, setCategory] = useState<CashControlCategory | null>(null);
  const [note, setNote]         = useState('');
  const [submitting, setSubmitting] = useState(false);

  // "Registrado por" — defaults to the logged-in user, changeable
  const [registeredAsUser, setRegisteredAsUser] = useState<UserOption | null>(null);
  const [plannerOptions, setPlannerOptions]     = useState<UserOption[]>([]);
  const [showUserPicker, setShowUserPicker]     = useState(false);

  // Receipt upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingReceipt, setPendingReceipt] = useState<File | null>(null);
  const [uploadingFor, setUploadingFor]     = useState<string | null>(null);

  // Modals
  const [editTarget, setEditTarget]   = useState<CashMovement | null>(null);
  const [showBudget, setShowBudget]   = useState(false);
  const [showAllMoves, setShowAllMoves] = useState(false);

  // Load event once
  useEffect(() => {
    if (!eventId) return;
    getPlannerEvent(eventId).then(e => {
      if (!e) { router.replace('/planner'); return; }
      setEvent(e);
      setBudget((e as any).cashControlBudget ?? 0);
      setEventLoading(false);
    });
  }, [eventId, router]);

  // Set default "registrado por" when auth resolves, and load picker options
  useEffect(() => {
    if (authLoading) return;

    // Derive the current user's author entry
    const self: UserOption | null = plannerUser
      ? {
          id: plannerUser.id,
          name: plannerUser.name + (plannerUser.lastName ? ' ' + plannerUser.lastName : ''),
          email: plannerUser.email,
        }
      : isSuperAdmin && adminUser
      ? { id: adminUser.id, name: adminUser.name ?? adminUser.email, email: adminUser.email }
      : null;

    if (self) setRegisteredAsUser(prev => prev ?? self);

    // Load all active planners for the picker (one-time, not real-time)
    getDocs(query(collection(db, 'planners'), where('active', '==', true))).then(snap => {
      const options: UserOption[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name + (data.lastName ? ' ' + data.lastName : ''),
          email: data.email,
        };
      });
      // Put self first, then others alphabetically
      options.sort((a, b) => {
        if (a.id === self?.id) return -1;
        if (b.id === self?.id) return 1;
        return a.name.localeCompare(b.name);
      });
      // If superadmin isn't in planners, prepend them
      if (self && !options.find(o => o.id === self.id)) {
        options.unshift(self);
      }
      setPlannerOptions(options);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  // Real-time movements via onSnapshot
  useEffect(() => {
    if (!eventId) return;
    const q = query(
      collection(db, 'plannerEvents', eventId, 'cashControl'),
      orderBy('timestamp', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setMovements(snap.docs.map(d => ({ id: d.id, ...d.data() } as CashMovement)));
    });
    return () => unsub();
  }, [eventId]);

  // Access control — wait for both auth and event to load
  if (authLoading || eventLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  // XB Planner: only their own events
  const isOwnEvent = plannerUser?.id === event?.plannerId;
  const canView = isSuperAdmin || canManageCashControl || (canCreateProjects && isOwnEvent);
  const canAdd  = isSuperAdmin || canManageCashControl;

  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--tqf-beige)' }}>
        <div className="text-center">
          <p className="text-base mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)' }}>{t('errorUnauthorized')}</p>
          <Link href="/planner" className="text-sm" style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>← {t('dashboard')}</Link>
        </div>
      </div>
    );
  }

  const displayedMoves = showAllMoves ? movements : movements.slice(0, 10);

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!parsed || parsed <= 0) { toast.error(t('cc_invalidAmount')); return; }
    if (!method)            { toast.error(t('cc_noMethod')); return; }
    if (!category)          { toast.error(t('cc_noCategory')); return; }
    if (!registeredAsUser)  { toast.error(t('cc_noUser')); return; }

    setSubmitting(true);
    try {
      const now = new Date();
      const result = await addCashMovement(eventId, {
        amount: parsed,
        paymentMethod: method,
        category,
        note: note.trim(),
        registeredBy: registeredAsUser.id,
        registeredByName: registeredAsUser.name,
        date: now.toISOString().slice(0, 10),
        time: now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }),
      });

      if (!result.success) { toast.error(result.error ?? t('cc_budgetError')); return; }

      // Upload pending receipt if any
      if (pendingReceipt && result.id) {
        setUploadingFor(result.id);
        try {
          const sRef = storageRef(storage, `plannerCashControl/${eventId}/${result.id}/${Date.now()}_${pendingReceipt.name}`);
          const task = uploadBytesResumable(sRef, pendingReceipt, { contentType: pendingReceipt.type });
          await new Promise<void>((res, rej) => {
            task.on('state_changed', () => {}, rej, async () => {
              const url = await getDownloadURL(task.snapshot.ref);
              await updateCashMovement(eventId, result.id!, { receiptUrl: url });
              res();
            });
          });
        } catch {
          toast.warning(t('cc_receiptFailed'));
        }
        setUploadingFor(null);
        setPendingReceipt(null);
        if (fileRef.current) fileRef.current.value = '';
      }

      toast.success(t('cc_registered'));
      setAmount('');
      setMethod(null);
      setCategory(null);
      setNote('');
    } finally {
      setSubmitting(false);
    }
  }

  function handleReceiptPick(files: FileList | null) {
    if (!files || !files[0]) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) { toast.error(t('cc_invalidImage')); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error(t('cc_imageTooLarge')); return; }
    setPendingReceipt(file);
    toast.success(`📎 ${file.name} allegata.`);
  }

  const canEditMove = (m: CashMovement) =>
    isSuperAdmin || (canManageCashControl && m.registeredBy === plannerUser?.id);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-8" style={{ background: 'var(--tqf-beige)' }}>

      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
        style={{ background: 'white', borderBottom: '1px solid var(--tqf-beige-border)' }}
      >
        <Link
          href={`/planner/projects/${eventId}`}
          className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
        >
          <ArrowLeft className="size-4" />
          <span className="hidden xs:inline">{t('cc_event')}</span>
        </Link>

        <div className="flex items-center gap-2">
          <p
            className="text-sm font-medium truncate max-w-[160px]"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontWeight: 400 }}
          >
            {event?.eventCode || event?.clientName || t('cc_event')}
          </p>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}
          >
            Gastos
          </span>
        </div>

        <LanguageSelector />
      </header>

      {/* Balance card */}
      <BalanceCard
        movements={movements}
        budget={budget}
        onEditBudget={() => setShowBudget(true)}
        canAdmin={isSuperAdmin}
      />

      {/* Entry form — shown only if canAdd */}
      {canAdd && (
        <div
          className="mx-4 mt-4 rounded-3xl p-5 space-y-4"
          style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
        >
          {/* Amount input */}
          <div className="relative">
            <span
              className="absolute left-5 top-1/2 -translate-y-1/2 text-3xl font-light"
              style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-display)' }}
            >
              $
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder="0"
              className="w-full pl-10 pr-4 py-4 text-4xl font-light rounded-2xl outline-none text-center"
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--tqf-dark)',
                background: 'var(--tqf-beige)',
                border: '1px solid var(--tqf-beige-border)',
                letterSpacing: '-0.01em',
              }}
            />
            {amount.length > 0 && (
              <button
                onClick={() => setAmount('')}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--tqf-muted)' }}
              >
                <X className="size-5" />
              </button>
            )}
          </div>

          {/* Registrado por */}
          <div className="flex items-center gap-2 px-1">
            <User className="size-3.5 flex-shrink-0" style={{ color: 'var(--tqf-muted)' }} />
            <p className="text-xs flex-1 truncate" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {registeredAsUser?.name ?? '—'}
            </p>
            {plannerOptions.length > 1 && (
              <button
                type="button"
                onClick={() => setShowUserPicker(true)}
                className="text-xs flex-shrink-0 transition-opacity hover:opacity-70"
                style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}
              >
                {t('cc_changeUser')}
              </button>
            )}
          </div>

          {/* Payment method */}
          <div className="grid grid-cols-2 gap-2">
            {(['tarjeta', 'efectivo'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMethod(method === m ? null : m)}
                className="flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-medium transition-all"
                style={{
                  border: `1.5px solid ${method === m ? 'var(--tqf-bordeaux)' : 'var(--tqf-beige-border)'}`,
                  background: method === m ? 'var(--tqf-bordeaux)' : 'white',
                  color: method === m ? 'white' : 'var(--tqf-muted)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {m === 'tarjeta'
                  ? <CreditCard className="size-4" />
                  : <Wallet className="size-4" />
                }
                {m === 'tarjeta' ? 'Tarjeta' : 'Efectivo'}
              </button>
            ))}
          </div>

          {/* Category chips */}
          <div className="grid grid-cols-3 gap-2">
            {CASH_CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setCategory(category === c.value ? null : c.value)}
                className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-2xl text-xs transition-all"
                style={{
                  border: `1.5px solid ${category === c.value ? 'var(--tqf-bordeaux)' : 'var(--tqf-beige-border)'}`,
                  background: category === c.value ? 'var(--tqf-cipria-light)' : 'white',
                  color: category === c.value ? 'var(--tqf-bordeaux)' : 'var(--tqf-muted)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: category === c.value ? 600 : 400,
                }}
              >
                <span className="text-lg leading-none">{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>

          {/* Note */}
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={t('cc_notePlaceholder')}
            className="w-full px-4 py-2.5 rounded-2xl text-sm outline-none"
            style={{
              border: '1px solid var(--tqf-beige-border)',
              fontFamily: 'var(--font-body)',
              color: 'var(--tqf-dark)',
              background: 'var(--tqf-beige)',
            }}
          />

          {/* Receipt preview */}
          {pendingReceipt && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--tqf-cipria-light)', border: '1px solid var(--tqf-cipria)' }}>
              <Camera className="size-4 flex-shrink-0" style={{ color: 'var(--tqf-bordeaux)' }} />
              <p className="text-xs flex-1 truncate" style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                {pendingReceipt.name}
              </p>
              <button onClick={() => { setPendingReceipt(null); if (fileRef.current) fileRef.current.value = ''; }}>
                <X className="size-3.5" style={{ color: 'var(--tqf-bordeaux)' }} />
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {/* Receipt */}
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-3.5 rounded-2xl text-sm transition-opacity hover:opacity-80"
              style={{
                border: '1.5px solid var(--tqf-beige-border)',
                color: pendingReceipt ? 'var(--tqf-bordeaux)' : 'var(--tqf-muted)',
                fontFamily: 'var(--font-body)',
                background: pendingReceipt ? 'var(--tqf-cipria-light)' : 'white',
              }}
            >
              <Camera className="size-4" />
              <span className="hidden sm:inline">{t('cc_receipt')}</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => handleReceiptPick(e.target.files)}
            />

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || uploadingFor !== null}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-base font-semibold transition-all hover:opacity-90 disabled:opacity-50 active:scale-[0.98]"
              style={{
                background: amount && method && category ? 'var(--tqf-bordeaux)' : 'var(--tqf-beige-border)',
                color: amount && method && category ? 'white' : 'var(--tqf-muted)',
                fontFamily: 'var(--font-body)',
                transition: 'all 0.15s',
              }}
            >
              {(submitting || uploadingFor !== null) && <Loader2 className="size-5 animate-spin" />}
              {t('cc_register')}
            </button>
          </div>
        </div>
      )}

      {/* Movements list */}
      <div className="mx-4 mt-4 rounded-3xl overflow-hidden" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--tqf-beige-border)' }}>
          <h2 className="text-sm font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
            {t('cc_recentMoves')}
          </h2>
          <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            {movements.length}
          </span>
        </div>

        {movements.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {canAdd ? t('cc_noMovesFirst') : t('cc_noMoves')}
            </p>
          </div>
        ) : (
          <>
            {displayedMoves.map(m => (
              <MovementRow
                key={m.id}
                movement={m}
                canAdmin={isSuperAdmin}
                canEdit={canEditMove(m)}
                onTap={() => (canEditMove(m) || isSuperAdmin) && setEditTarget(m)}
              />
            ))}

            {movements.length > 10 && (
              <button
                onClick={() => setShowAllMoves(v => !v)}
                className="w-full flex items-center justify-center gap-1.5 py-3 text-sm transition-opacity hover:opacity-70"
                style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', borderTop: '1px solid var(--tqf-beige-border)' }}
              >
                {showAllMoves
                  ? <><ChevronUp className="size-4" /> {t('cc_showLess')}</>
                  : <><ChevronDown className="size-4" /> {t('cc_showAll', { n: String(movements.length) })}</>
                }
              </button>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {editTarget && (
        <EditModal
          movement={editTarget}
          eventId={eventId}
          canAdmin={isSuperAdmin}
          onClose={() => setEditTarget(null)}
          onUpdated={() => setEditTarget(null)}
          onDeleted={() => setEditTarget(null)}
        />
      )}

      {showBudget && (
        <BudgetModal
          eventId={eventId}
          currentBudget={budget}
          onClose={() => setShowBudget(false)}
          onSaved={b => setBudget(b)}
        />
      )}

      {showUserPicker && (
        <UserPickerSheet
          options={plannerOptions}
          currentId={registeredAsUser?.id ?? ''}
          onSelect={u => setRegisteredAsUser(u)}
          onClose={() => setShowUserPicker(false)}
        />
      )}
    </div>
  );
}
