'use client';

import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { useI18n } from '@/hooks/useI18n';
import { LanguageSelector } from '@/components/LanguageSelector';
import AccessDenied from '@/components/planner/AccessDenied';
import { storage } from '@/firebase/client';
import { compressFurnitureImage } from '@/lib/furniture/compressImage';
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage';
import {
  getInventoryItems,
  saveInventoryItem,
  deleteInventoryItem,
  adjustInventoryQuantity,
} from '@/actions/inventory/inventory-crud';
import {
  InventoryItem,
  InventoryKind,
  Warehouse,
  WAREHOUSES,
  isLowStock,
} from '@/lib/inventory-types';
import {
  ArrowLeft, Check, Loader2, LogOut, Minus, Package, Pencil, Plus,
  Search, Trash2, TriangleAlert, Upload, Warehouse as WarehouseIcon, Wrench, X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.7rem', borderRadius: '0.5rem',
  border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)',
  fontSize: '0.875rem', color: 'var(--tqf-dark)', background: 'white', outline: 'none',
};
const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '0.3rem', fontSize: '0.7rem', letterSpacing: '0.06em',
  textTransform: 'uppercase', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)',
};

type WarehouseFilter = 'all' | Warehouse;

type Draft = {
  id?: string;
  kind: InventoryKind;
  warehouse: Warehouse;
  name: string;
  description: string;
  imageUrl: string;
  quantity: number;
  minQuantity: number;
};

const EMPTY_DRAFT = (kind: InventoryKind, warehouse: Warehouse): Draft => ({
  kind, warehouse, name: '', description: '', imageUrl: '', quantity: 0, minQuantity: 0,
});

export default function InventarioPage() {
  const { logout, canManageCashControl, isLoading } = usePlannerAuth();
  const { t } = useI18n();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<InventoryKind>('herramienta');
  const [warehouse, setWarehouse] = useState<WarehouseFilter>('all');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    getInventoryItems()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <div className="size-8 animate-spin rounded-full border-2 border-[var(--tqf-bordeaux)] border-t-transparent" />
      </div>
    );
  }
  if (!canManageCashControl) return <AccessDenied />;

  const filtered = items.filter(i =>
    i.kind === kind &&
    (warehouse === 'all' || i.warehouse === warehouse) &&
    (search.trim() === '' ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase()))
  );

  const lowStockCount = items.filter(i => i.kind === kind && isLowStock(i) &&
    (warehouse === 'all' || i.warehouse === warehouse)).length;

  const openNew = () => setDraft(EMPTY_DRAFT(kind, warehouse === 'all' ? 'cancun' : warehouse));
  const openEdit = (it: InventoryItem) => setDraft({
    id: it.id, kind: it.kind, warehouse: it.warehouse, name: it.name,
    description: it.description, imageUrl: it.imageUrl,
    quantity: it.quantity, minQuantity: it.minQuantity,
  });

  const handleSaved = (saved: InventoryItem) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === saved.id);
      if (idx === -1) return [...prev, saved].sort((a, b) => a.name.localeCompare(b.name));
      const next = [...prev];
      next[idx] = saved;
      return next;
    });
  };

  const handleDelete = async (it: InventoryItem) => {
    if (!confirm(t('inv_deleteConfirm', { name: it.name }))) return;
    setBusyId(it.id);
    const res = await deleteInventoryItem(it.id);
    setBusyId(null);
    if (res.success) {
      setItems(prev => prev.filter(i => i.id !== it.id));
      toast.success(t('inv_deleted'));
    } else {
      toast.error(res.error ?? t('inv_deleteError'));
    }
  };

  const handleAdjust = async (it: InventoryItem, delta: number) => {
    const newQty = Math.max(0, it.quantity + delta);
    if (newQty === it.quantity) return;
    // Optimistic update
    setItems(prev => prev.map(i => i.id === it.id ? { ...i, quantity: newQty } : i));
    const res = await adjustInventoryQuantity(it.id, newQty);
    if (!res.success) {
      setItems(prev => prev.map(i => i.id === it.id ? { ...i, quantity: it.quantity } : i));
      toast.error(res.error ?? t('inv_saveError'));
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}>
        <div className="flex items-center gap-4">
          <Link href="/planner" className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            <ArrowLeft className="size-4" /> {t('dashboard')}
          </Link>
          <div className="h-4 w-px" style={{ background: 'var(--tqf-beige-border)' }} />
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg" style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
              <WarehouseIcon className="size-4" />
            </div>
            <div>
              <h1 className="text-xl leading-none" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
                {t('inv_title')}
              </h1>
              <p className="text-[0.7rem] mt-0.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {t('inv_subtitle')}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSelector />
          <button onClick={logout}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg hover:opacity-80"
            style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)' }}>
            <LogOut className="size-4" />
            <span className="hidden sm:inline">{t('logout')}</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Kind tabs */}
        <div className="flex gap-2 mb-5">
          {(['herramienta', 'elemento'] as InventoryKind[]).map(k => {
            const active = kind === k;
            return (
              <button key={k} onClick={() => setKind(k)}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-all"
                style={active
                  ? { background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }
                  : { background: 'white', color: 'var(--tqf-bordeaux)', border: '1px solid var(--tqf-cipria)', fontFamily: 'var(--font-body)' }}>
                {k === 'herramienta' ? <Wrench className="size-4" /> : <Package className="size-4" />}
                {t(k === 'herramienta' ? 'inv_tab_herramientas' : 'inv_tab_elementos')}
              </button>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            {/* Warehouse filter */}
            {(['all', 'cancun', 'cdmx'] as WarehouseFilter[]).map(w => {
              const active = warehouse === w;
              const label = w === 'all' ? t('inv_allWarehouses') : WAREHOUSES.find(x => x.value === w)!.label;
              return (
                <button key={w} onClick={() => setWarehouse(w)}
                  className="text-xs px-3 py-1.5 rounded-full transition-all"
                  style={active
                    ? { background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }
                    : { background: 'white', color: 'var(--tqf-bordeaux)', border: '1px solid var(--tqf-cipria)', fontFamily: 'var(--font-body)' }}>
                  {label}
                </button>
              );
            })}
            {lowStockCount > 0 && (
              <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', fontFamily: 'var(--font-body)' }}>
                <TriangleAlert className="size-3" /> {lowStockCount} · {t('inv_lowStock')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--tqf-muted)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('inv_search')}
                style={{ ...inputStyle, paddingLeft: '2rem', width: '11rem' }} />
            </div>
            <button onClick={openNew}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
              <Plus className="size-4" /> {t('inv_addItem')}
            </button>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="size-6 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl p-16 text-center" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <div className="mx-auto mb-4 size-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
              <WarehouseIcon className="size-7" />
            </div>
            <h2 className="text-xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              {t('inv_empty')}
            </h2>
            <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {t('inv_emptyHint')}
            </p>
            <button onClick={openNew}
              className="inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
              <Plus className="size-4" /> {t('inv_addItem')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(it => (
              <ItemCard key={it.id} item={it} busy={busyId === it.id}
                onEdit={() => openEdit(it)} onDelete={() => handleDelete(it)}
                onAdjust={(d) => handleAdjust(it, d)} t={t} />
            ))}
          </div>
        )}
      </main>

      {draft && (
        <ItemModal
          draft={draft}
          onClose={() => setDraft(null)}
          onSaved={(saved) => { handleSaved(saved); setDraft(null); }}
        />
      )}
    </div>
  );
}

// ── Item card ─────────────────────────────────────────────────────────────────
function ItemCard({
  item, busy, onEdit, onDelete, onAdjust, t,
}: {
  item: InventoryItem;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAdjust: (delta: number) => void;
  t: ReturnType<typeof useI18n>['t'];
}) {
  const low = isLowStock(item);
  const whLabel = WAREHOUSES.find(w => w.value === item.warehouse)?.label ?? item.warehouse;
  return (
    <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: 'white', border: `1px solid ${low ? '#fecaca' : 'var(--tqf-beige-border)'}` }}>
      <div className="relative" style={{ aspectRatio: '4/3', background: 'var(--tqf-cipria-light)' }}>
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--tqf-cipria)' }}>
            {item.kind === 'herramienta' ? <Wrench className="size-8" /> : <Package className="size-8" />}
          </div>
        )}
        <span className="absolute top-2 left-2 text-[0.65rem] px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.92)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
          {whLabel}
        </span>
        {low && (
          <span className="absolute top-2 right-2 flex items-center gap-1 text-[0.65rem] px-2 py-0.5 rounded-full"
            style={{ background: '#991b1b', color: 'white', fontFamily: 'var(--font-body)' }}>
            <TriangleAlert className="size-2.5" /> {t('inv_lowStock')}
          </span>
        )}
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="flex-1">
          <p className="text-sm leading-tight" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)', fontWeight: 500 }}>{item.name}</p>
          {item.description && (
            <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{item.description}</p>
          )}
        </div>

        {/* Quantity stepper */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button onClick={() => onAdjust(-1)}
              className="size-7 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
              style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', background: 'white' }}>
              <Minus className="size-3.5" />
            </button>
            <span className="min-w-[2.5rem] text-center text-sm" style={{ fontFamily: 'var(--font-body)', color: low ? '#991b1b' : 'var(--tqf-dark)', fontWeight: 600 }}>
              {item.quantity}
            </span>
            <button onClick={() => onAdjust(1)}
              className="size-7 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
              style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', background: 'white' }}>
              <Plus className="size-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onEdit}
              className="size-7 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
              style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-bordeaux)', background: 'white' }}>
              <Pencil className="size-3.5" />
            </button>
            <button onClick={onDelete} disabled={busy}
              className="size-7 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70 disabled:opacity-40"
              style={{ border: '1px solid #f3d0d0', color: '#991b1b', background: 'white' }}>
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            </button>
          </div>
        </div>
        {item.minQuantity > 0 && (
          <p className="text-[0.65rem]" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            {t('inv_minQuantity')}: {item.minQuantity}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Add / edit modal ──────────────────────────────────────────────────────────
function ItemModal({
  draft, onClose, onSaved,
}: {
  draft: Draft;
  onClose: () => void;
  onSaved: (saved: InventoryItem) => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<Draft>(draft);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setForm(prev => ({ ...prev, [k]: v }));

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const compressed = await compressFurnitureImage(files[0]);
      const safe = compressed.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `inventory/${Date.now()}_${safe}`;
      const sRef = storageRef(storage, path);
      await new Promise<void>((res, rej) => {
        const task = uploadBytesResumable(sRef, compressed, { contentType: compressed.type });
        task.on('state_changed', () => {}, rej, async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          set('imageUrl', url);
          res();
        });
      });
    } catch {
      toast.error(t('inv_uploadError'));
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error(t('inv_nameRequired')); return; }
    setSaving(true);
    const res = await saveInventoryItem({
      id: form.id,
      kind: form.kind,
      warehouse: form.warehouse,
      name: form.name.trim(),
      description: form.description.trim(),
      imageUrl: form.imageUrl,
      quantity: Number(form.quantity) || 0,
      minQuantity: Number(form.minQuantity) || 0,
      createdBy: '',
    });
    setSaving(false);
    if (res.success && res.id) {
      const now = new Date().toISOString();
      onSaved({
        id: res.id,
        kind: form.kind,
        warehouse: form.warehouse,
        name: form.name.trim(),
        description: form.description.trim(),
        imageUrl: form.imageUrl,
        quantity: Number(form.quantity) || 0,
        minQuantity: Number(form.minQuantity) || 0,
        lowStockNotified: isLowStock({ quantity: Number(form.quantity) || 0, minQuantity: Number(form.minQuantity) || 0 }),
        createdAt: now,
        updatedAt: now,
        createdBy: '',
      });
      toast.success(t('inv_saved'));
    } else {
      toast.error(res.error ?? t('inv_saveError'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: 'white' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--tqf-beige-border)' }}>
          <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
            {form.id ? t('inv_editItem') : t('inv_newItem')}
          </h2>
          <button onClick={onClose} className="size-8 flex items-center justify-center rounded-lg hover:opacity-70" style={{ color: 'var(--tqf-muted)' }}>
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5 space-y-4">
          {/* Photo */}
          <div>
            <label style={labelStyle}>{t('inv_photo')}</label>
            <div className="flex items-center gap-3">
              <div className="size-20 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--tqf-cipria-light)', border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-cipria)' }}>
                {form.imageUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                  : (form.kind === 'herramienta' ? <Wrench className="size-7" /> : <Package className="size-7" />)}
              </div>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ border: '1px solid var(--tqf-cipria)', color: 'var(--tqf-bordeaux)', background: 'var(--tqf-cipria-light)', fontFamily: 'var(--font-body)' }}>
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {form.imageUrl ? t('inv_changePhoto') : t('inv_uploadPhoto')}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e.target.files)} />
            </div>
          </div>

          {/* Kind + warehouse */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>{t('inv_kind')}</label>
              <select value={form.kind} onChange={e => set('kind', e.target.value as InventoryKind)} style={inputStyle}>
                <option value="herramienta">{t('inv_kind_herramienta')}</option>
                <option value="elemento">{t('inv_kind_elemento')}</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t('inv_warehouse')}</label>
              <select value={form.warehouse} onChange={e => set('warehouse', e.target.value as Warehouse)} style={inputStyle}>
                {WAREHOUSES.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
              </select>
            </div>
          </div>

          {/* Name */}
          <div>
            <label style={labelStyle}>{t('inv_name')} *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder={t('inv_namePlaceholder')} style={inputStyle} />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>{t('inv_description')}</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              placeholder={t('inv_descriptionPlaceholder')} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {/* Quantity + threshold */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>{t('inv_quantity')}</label>
              <input type="number" min={0} value={form.quantity === 0 ? '' : form.quantity}
                onChange={e => set('quantity', parseInt(e.target.value) || 0)} placeholder="0" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('inv_minQuantity')}</label>
              <input type="number" min={0} value={form.minQuantity === 0 ? '' : form.minQuantity}
                onChange={e => set('minQuantity', parseInt(e.target.value) || 0)} placeholder="0" style={inputStyle} />
              <p className="text-[0.65rem] mt-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t('inv_minQuantityHint')}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--tqf-beige-border)' }}>
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg"
            style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', background: 'white', fontFamily: 'var(--font-body)' }}>
            {t('inv_cancel')}
          </button>
          <button onClick={save} disabled={saving || uploading}
            className="flex items-center gap-2 text-sm px-5 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {t('inv_save')}
          </button>
        </div>
      </div>
    </div>
  );
}
