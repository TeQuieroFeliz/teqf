'use client';

import {
  deleteFurnitureItem,
  deleteFurnitureCategoryFromMeta,
  executeFurnitureMigration,
  getMigrationDryRun,
  mergeFurnitureCategory,
  MigrationDryRunResult,
  renameFurnitureCategory,
  saveCustomCategories,
  saveFurnitureItem,
  saveFurnitureMeta,
  updateFurnitureImages,
} from '@/actions/furniture/furniture-crud';
import {
  CustomFurnitureCategory,
  getCategoryLabel,
  Lang,
  PREDEFINED_FURNITURE_CATEGORIES,
} from '@/lib/furniture-categories';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import AccessDenied from '@/components/planner/AccessDenied';
import ReadOnlyBanner from '@/components/planner/ReadOnlyBanner';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useI18n } from '@/hooks/useI18n';
import { db, storage } from '@/firebase/client';
import { collection, doc, getDocs, getDoc, orderBy, query } from 'firebase/firestore';
import { compressFurnitureImage } from '@/lib/furniture/compressImage';
import { FurnitureCurrency, FurnitureItem } from '@/lib/planner-types';
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage';
import {
  ArrowLeft, Armchair, Check, Edit2, Flower2,
  Loader2, LogOut, Plus, RotateCcw, Scissors, Sofa, Sparkles, Square,
  Trash2, Upload, X,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

// ── Palette & icons ───────────────────────────────────────────────────────────

const PALETTE = [
  { bg: '#f0ead9', icon: '#c4b49a' },
  { bg: '#e8dded', icon: '#b09ab8' },
  { bg: '#dde8d9', icon: '#8caa84' },
  { bg: '#e8e0cf', icon: '#b8a882' },
  { bg: '#dde6e8', icon: '#84a4aa' },
  { bg: '#ecdde0', icon: '#c49aa0' },
  { bg: '#e8e8dd', icon: '#a8a884' },
];

function categoryColor(cat: string, all: string[]) {
  const idx = all.indexOf(cat);
  return PALETTE[(idx >= 0 ? idx : 0) % PALETTE.length];
}

function categoryIcon(cat: string) {
  // Keys first
  if (cat === 'chairs' || cat === 'cocktail_chairs') return <Armchair className="size-10" />;
  if (cat === 'tables' || cat === 'cocktail_table')  return <Square className="size-10" strokeWidth={1} />;
  if (cat === 'sala_lounge')                          return <Sofa className="size-10" />;
  // Legacy label fallback
  const l = cat.toLowerCase();
  if (l.includes('sedi') || l.includes('chair'))    return <Armchair className="size-10" />;
  if (l.includes('divano') || l.includes('sofa'))   return <Sofa className="size-10" />;
  if (l.includes('flore') || l.includes('flower'))  return <Flower2 className="size-10" />;
  if (l.includes('tavol') || l.includes('table'))   return <Square className="size-10" strokeWidth={1} />;
  return <Sparkles className="size-10" />;
}

const CURRENCIES: FurnitureCurrency[] = ['MXN', 'USD', 'EUR'];

// ── Types ─────────────────────────────────────────────────────────────────────

type UploadState = { id: string; fileName: string; progress: number; done: boolean; url?: string; error?: string };

type StandbyItem = {
  id: string;
  imageUrl: string;
  fileName: string;
  name: string;
  category: string;
  price: number | '';
  currency: FurnitureCurrency;
  cities: string[];
  saving: boolean;
};

const STANDBY_KEY = 'tqf-furniture-standby';

function loadStandby(): StandbyItem[] {
  try { return JSON.parse(localStorage.getItem(STANDBY_KEY) ?? '[]'); } catch { return []; }
}
function saveStandby(items: StandbyItem[]) {
  localStorage.setItem(STANDBY_KEY, JSON.stringify(items));
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%', padding: '0.45rem 0.65rem', borderRadius: '0.5rem',
  border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)',
  fontSize: '0.8125rem', color: 'var(--tqf-dark)', background: 'white', outline: 'none',
};

// ── ImageLightbox ─────────────────────────────────────────────────────────────

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)', zIndex: 9999 }}
      onClick={onClose}>
      <button
        onClick={e => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 size-10 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
        style={{ background: 'rgba(255,255,255,0.14)', color: 'white' }}>
        <X className="size-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt}
        className="rounded-2xl object-contain shadow-2xl"
        style={{ maxHeight: '90vh', maxWidth: '90vw' }}
        onClick={e => e.stopPropagation()} />
    </div>,
    document.body
  );
}

// ── StandbyCard ───────────────────────────────────────────────────────────────

type BgState = 'idle' | 'removing' | 'comparing' | 'uploading' | 'error';

const CHECKERBOARD: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg,#d0d0d0 25%,transparent 25%),' +
    'linear-gradient(-45deg,#d0d0d0 25%,transparent 25%),' +
    'linear-gradient(45deg,transparent 75%,#d0d0d0 75%),' +
    'linear-gradient(-45deg,transparent 75%,#d0d0d0 75%)',
  backgroundSize: '14px 14px',
  backgroundPosition: '0 0,0 7px,7px -7px,-7px 0px',
  backgroundColor: 'white',
};

function StandbyCard({
  item, categories, cities, lang, customCategories,
  onUpdate, onSave, onRemove, onAddCity,
}: {
  item: StandbyItem;
  categories: string[];
  cities: string[];
  lang: Lang;
  customCategories: CustomFurnitureCategory[];
  onUpdate: (patch: Partial<StandbyItem>) => void;
  onSave: () => void;
  onRemove: () => void;
  onAddCity: (city: string) => void;
}) {
  const { t } = useI18n();
  const [showNewCity, setShowNewCity] = useState(false);
  const [newCity,     setNewCity]     = useState('');
  const [lightbox,    setLightbox]    = useState(false);

  // BG removal state
  const originalUrlRef            = useRef(item.imageUrl);
  const [bgState, setBgState]     = useState<BgState>('idle');
  const [bgError, setBgError]     = useState('');
  const [processedBlob, setProcessedBlob]       = useState<Blob | null>(null);
  const [processedLocalUrl, setProcessedLocalUrl] = useState('');

  const isProcessed = item.imageUrl !== originalUrlRef.current;

  const canSave = item.name.trim() && item.category && item.price !== '' && item.cities.length > 0 && !item.saving;

  const toggleCity = (city: string) => {
    const next = item.cities.includes(city)
      ? item.cities.filter(c => c !== city)
      : [...item.cities, city];
    onUpdate({ cities: next });
  };

  const handleAddCity = () => {
    const name = newCity.trim();
    if (!name) return;
    onAddCity(name);
    onUpdate({ cities: [...item.cities.filter(c => c !== name), name] });
    setNewCity('');
    setShowNewCity(false);
  };

  // Remove background — pass imageUrl as string so the server fetches it
  // (avoids browser CORS failure when fetching firebasestorage.googleapis.com)
  const handleRemoveBgStandby = async () => {
    if (bgState === 'removing' || bgState === 'uploading') return;
    setBgState('removing');
    setBgError('');
    try {
      const fd = new FormData();
      fd.append('imageUrl', item.imageUrl); // server fetches it — no browser CORS
      const res = await fetch('/api/remove-background', { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Error ${res.status}`);
      }
      const blob = await res.blob();
      setProcessedBlob(blob);
      setProcessedLocalUrl(URL.createObjectURL(blob));
      setBgState('comparing');
    } catch (err) {
      setBgError(err instanceof Error ? err.message : 'Unknown error');
      setBgState('error');
    }
  };

  // User picked the processed version → upload to Firebase and update imageUrl
  const handleChooseProcessed = async () => {
    if (!processedBlob) return;
    if (!storage) { toast.error('Firebase Storage non configurato (NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET mancante).'); return; }
    setBgState('uploading');
    try {
      const newUrl = await new Promise<string>((resolve, reject) => {
        const path = `furniture/bulk/${Date.now()}_processed_bg.png`;
        const sRef = storageRef(storage, path);
        const task = uploadBytesResumable(sRef, processedBlob, { contentType: 'image/png' });
        task.on('state_changed', null, reject,
          async () => resolve(await getDownloadURL(task.snapshot.ref)));
      });
      if (processedLocalUrl) URL.revokeObjectURL(processedLocalUrl);
      setProcessedLocalUrl('');
      setProcessedBlob(null);
      onUpdate({ imageUrl: newUrl });
      setBgState('idle');
    } catch {
      setBgState('error');
      setBgError('Firebase upload error');
    }
  };

  // User picked the original → discard processed blob, keep current imageUrl
  const handleChooseOriginal = () => {
    if (processedLocalUrl) URL.revokeObjectURL(processedLocalUrl);
    setProcessedLocalUrl('');
    setProcessedBlob(null);
    setBgState('idle');
  };

  // Revert to the very first imageUrl (before any processing)
  const handleRestore = () => {
    onUpdate({ imageUrl: originalUrlRef.current });
    setBgState('idle');
  };

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: 'white', border: '2px solid var(--tqf-cipria)' }}>

      {/* ── Image area (normal or comparison) ─────────────────────────── */}
      {bgState === 'comparing' ? (
        <div style={{ flexShrink: 0 }}>
          {/* Side-by-side comparison */}
          <div className="grid grid-cols-2" style={{ height: '160px' }}>
            {/* Original */}
            <div className="relative flex flex-col" style={{ borderRight: '1px solid var(--tqf-cipria)', background: '#f8f6f2' }}>
              <p className="text-center py-1" style={{ fontSize: '0.6rem', letterSpacing: '0.08em', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', textTransform: 'uppercase' }}>
                {t('furniture_original')}
              </p>
              <div className="flex-1 flex items-center justify-center overflow-hidden px-1 pb-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={originalUrlRef.current} alt=""
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
            </div>
            {/* Processed */}
            <div className="relative flex flex-col" style={CHECKERBOARD}>
              <p className="text-center py-1" style={{ fontSize: '0.6rem', letterSpacing: '0.08em', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', textTransform: 'uppercase', fontWeight: 500, background: 'var(--tqf-cipria-light)' }}>
                {t('furniture_bgRemoved')}
              </p>
              <div className="flex-1 flex items-center justify-center overflow-hidden px-1 pb-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={processedLocalUrl} alt=""
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
            </div>
          </div>
          {/* Choice buttons */}
          <div className="grid grid-cols-2" style={{ borderTop: '1px solid var(--tqf-cipria)' }}>
            <button type="button" onClick={handleChooseOriginal}
              className="py-2 text-xs transition-opacity hover:opacity-80"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)', background: 'white', border: 'none', borderRight: '1px solid var(--tqf-cipria)' }}>
              {t('furniture_useOriginal')}
            </button>
            <button type="button" onClick={handleChooseProcessed}
              className="py-2 text-xs transition-opacity hover:opacity-80"
              style={{ fontFamily: 'var(--font-body)', color: 'white', background: 'var(--tqf-bordeaux)', border: 'none' }}>
              {t('furniture_useBgRemoved')}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Normal image */}
          <div
            className="relative flex items-center justify-center cursor-zoom-in"
            style={{ height: '200px', overflow: 'hidden', background: '#f8f6f2', flexShrink: 0 }}
            onClick={() => setLightbox(true)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.imageUrl} alt=""
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: '8px' }} />
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onRemove(); }}
              className="absolute top-2 right-2 size-7 flex items-center justify-center rounded-full transition-opacity hover:opacity-80"
              style={{ background: 'rgba(0,0,0,0.45)', color: 'white' }}
            >
              <X className="size-3.5" />
            </button>
            <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--tqf-cipria)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', fontSize: '0.6rem', letterSpacing: '0.08em' }}>
              {isProcessed ? t('furniture_bgRemovedBadge') : 'STANDBY'}
            </span>
          </div>

          {/* BG removal action bar */}
          <div className="px-3 py-2" style={{ background: 'var(--tqf-beige)', borderBottom: '1px solid var(--tqf-beige-border)' }}>
            {bgState === 'idle' && (
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleRemoveBgStandby}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                  style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)', border: 'none' }}>
                  <Scissors className="size-3" />
                  {t('furniture_removeBg')}
                </button>
                {isProcessed && (
                  <button type="button" onClick={handleRestore}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-opacity hover:opacity-70"
                    style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', background: 'white' }}>
                    <RotateCcw className="size-3" />
                    {t('furniture_restore')}
                  </button>
                )}
              </div>
            )}
            {bgState === 'removing' && (
              <div className="flex items-center gap-1.5">
                <Loader2 className="size-3 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
                <span className="text-xs" style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-muted)' }}>
                  {t('furniture_removingBg')}
                </span>
              </div>
            )}
            {bgState === 'uploading' && (
              <div className="flex items-center gap-1.5">
                <Loader2 className="size-3 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
                <span className="text-xs" style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-muted)' }}>
                  {t('furniture_uploadingImage')}
                </span>
              </div>
            )}
            {bgState === 'error' && (
              <div className="flex items-center gap-2">
                <span className="text-xs flex-1 truncate" style={{ color: '#991b1b', fontFamily: 'var(--font-body)' }}>
                  {bgError}
                </span>
                <button type="button" onClick={handleRemoveBgStandby}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-opacity hover:opacity-80 flex-shrink-0"
                  style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', background: 'white' }}>
                  <RotateCcw className="size-3" />
                  {t('furniture_retry')}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Lightbox (only when not comparing) */}
      {lightbox && bgState !== 'comparing' && (
        <ImageLightbox src={item.imageUrl} alt={item.name || item.fileName} onClose={() => setLightbox(false)} />
      )}

      {/* ── Form ──────────────────────────────────────────────────────── */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Name */}
        <div>
          <label className="block mb-1" style={{ fontSize: '0.6rem', letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            {t('furniture_nameItemLabel')}
          </label>
          <input
            type="text" value={item.name} placeholder={item.fileName}
            onChange={e => onUpdate({ name: e.target.value })}
            style={{ ...inp, borderColor: item.name.trim() ? 'var(--tqf-bordeaux)' : 'var(--tqf-beige-border)' }}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block mb-1" style={{ fontSize: '0.6rem', letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            {t('furniture_categoryRequired')}
          </label>
          <select value={item.category} onChange={e => onUpdate({ category: e.target.value })} style={inp}>
            <option value="">{t('furniture_selectPlaceholder')}</option>
            {categories.map(c => (
              <option key={c} value={c}>{getCategoryLabel(c, lang, customCategories)}</option>
            ))}
          </select>
        </div>

        {/* Price + currency */}
        <div>
          <label className="block mb-1" style={{ fontSize: '0.6rem', letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            {t('furniture_priceRequired')}
          </label>
          <div className="flex gap-1.5">
            <input type="number" min={0} step={0.01} placeholder="0.00"
              value={item.price === '' ? '' : item.price}
              onChange={e => onUpdate({ price: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
              style={{ ...inp, flex: 1 }} />
            <select value={item.currency} onChange={e => onUpdate({ currency: e.target.value as FurnitureCurrency })}
              style={{ ...inp, width: 'auto', padding: '0.45rem 0.4rem', flexShrink: 0 }}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Cities */}
        <div>
          <label className="block mb-1.5" style={{ fontSize: '0.6rem', letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            {t('furniture_cityLabel')} *
          </label>
          <div className="flex flex-wrap gap-1.5">
            {cities.map(city => {
              const sel = item.cities.includes(city);
              return (
                <button key={city} type="button" onClick={() => toggleCity(city)}
                  className="text-xs px-2.5 py-1 rounded-full transition-all"
                  style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', letterSpacing: '0.05em', border: sel ? '1px solid var(--tqf-bordeaux)' : '1px solid var(--tqf-beige-border)', background: sel ? 'var(--tqf-bordeaux)' : 'transparent', color: sel ? 'white' : 'var(--tqf-muted)' }}>
                  {city}
                </button>
              );
            })}
            {!showNewCity ? (
              <button type="button" onClick={() => setShowNewCity(true)}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all"
                style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', border: '1px dashed var(--tqf-beige-border)', color: 'var(--tqf-bordeaux)', background: 'transparent' }}>
                <Plus className="size-3" /> {t('furniture_new')}
              </button>
            ) : (
              <div className="flex items-center gap-1 mt-1 w-full">
                <input
                  type="text" value={newCity} autoFocus placeholder={t('furniture_cityNewPlaceholder')}
                  onChange={e => setNewCity(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddCity(); if (e.key === 'Escape') { setShowNewCity(false); setNewCity(''); } }}
                  style={{ ...inp, flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                />
                <button type="button" onClick={handleAddCity}
                  className="size-7 flex items-center justify-center rounded-lg transition-opacity hover:opacity-80"
                  style={{ background: 'var(--tqf-bordeaux)', color: 'white', border: 'none', flexShrink: 0 }}>
                  <Check className="size-3.5" />
                </button>
                <button type="button" onClick={() => { setShowNewCity(false); setNewCity(''); }}
                  className="size-7 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
                  style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', flexShrink: 0 }}>
                  <X className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1 mt-auto">
          <button type="button" onClick={onRemove}
            className="flex-1 text-xs py-2 rounded-lg transition-opacity hover:opacity-70"
            style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', background: 'white' }}>
            {t('furniture_discard')}
          </button>
          <button type="button" onClick={onSave} disabled={!canSave}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)', border: 'none' }}>
            {item.saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            {t('furniture_saveButton')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ItemCard ──────────────────────────────────────────────────────────────────

function ItemCard({ item, allCategories, lang, customCategories, onDelete, deleting, canEdit }: {
  item: FurnitureItem;
  allCategories: string[];
  lang: Lang;
  customCategories: CustomFurnitureCategory[];
  onDelete: () => void;
  deleting: boolean;
  canEdit: boolean;
}) {
  const { t } = useI18n();
  const colors = categoryColor(item.category, allCategories);
  const MAX_CITIES = 2;
  const visibleCities = item.cities.slice(0, MAX_CITIES);
  const extra = item.cities.length - MAX_CITIES;
  const [lightbox, setLightbox] = useState(false);

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col group relative"
      style={{ background: 'white', transition: 'transform 0.18s, box-shadow 0.18s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(92,26,40,0.08)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
    >
      {/* Image area */}
      <div
        className="relative flex items-center justify-center"
        style={{ height: '220px', background: item.images?.[0] ? '#f8f6f2' : colors.bg, overflow: 'hidden', cursor: item.images?.[0] ? 'zoom-in' : 'default' }}
        onClick={() => { if (item.images?.[0]) setLightbox(true); }}
      >
        {item.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.images[0]} alt={item.name}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: '10px' }} />
        ) : (
          <span style={{ color: colors.icon, opacity: 0.55 }}>{categoryIcon(item.category)}</span>
        )}

        {/* Published badge */}
        <span className="absolute top-2.5 right-2.5 text-xs px-2 py-0.5 rounded-full" style={{
          fontFamily: 'var(--font-body)', fontSize: '0.58rem', letterSpacing: '0.08em',
          ...(item.published
            ? { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }
            : { background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' }),
        }}>
          {item.published ? t('furniture_published') : t('draft')}
        </span>

        {/* Admin action overlay — hidden for read-only users */}
        {canEdit && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-start gap-2 p-3" style={{ background: 'linear-gradient(to top, rgba(30,15,10,0.45) 0%, transparent 55%)' }}>
            <Link
              href={`/planner/furniture/${item.id}`}
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
              style={{ background: 'white', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', textDecoration: 'none', fontWeight: 500 }}
            >
              <Edit2 className="size-3" /> {t('furniture_editButton')}
            </Link>
            <button
              type="button" onClick={e => { e.stopPropagation(); onDelete(); }}
              disabled={deleting}
              className="flex items-center justify-center size-7 rounded-full transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ background: 'white', color: '#991b1b', border: 'none' }}
            >
              {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && item.images?.[0] && (
        <ImageLightbox src={item.images[0]} alt={item.name} onClose={() => setLightbox(false)} />
      )}

      {/* Body */}
      <div className="p-4 flex flex-col gap-2.5 flex-1">
        <p style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', lineHeight: 1.4 }}>
          {getCategoryLabel(item.category, lang, customCategories)}{item.description ? ` · ${item.description}` : ''}
        </p>
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontSize: '1.15rem', fontWeight: 400, lineHeight: 1.2 }}>
          {item.name || <span style={{ opacity: 0.35 }}>{t('furniture_untitled')}</span>}
        </h3>
        {item.cities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {visibleCities.map(city => (
              <span key={city} style={{ fontSize: '0.58rem', letterSpacing: '0.05em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: '4px', border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', background: 'var(--tqf-beige)' }}>
                {city}
              </span>
            ))}
            {extra > 0 && (
              <span style={{ fontSize: '0.58rem', padding: '2px 7px', borderRadius: '4px', border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', background: 'var(--tqf-beige)' }}>
                +{extra}
              </span>
            )}
          </div>
        )}
        <div className="mt-auto pt-2" style={{ borderTop: '1px solid var(--tqf-beige-border)' }}>
          <p style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
            {item.price.toLocaleString('es-MX')} {item.currency ?? 'MXN'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── CategoryManagerModal ──────────────────────────────────────────────────────

type CatMgrView =
  | { v: 'list' }
  | { v: 'merge'; fromKey: string; toKey: string }
  | { v: 'delete'; key: string; toKey: string }
  | { v: 'working' };

function CategoryManagerModal({
  categories, items, customCategories, lang, onClose,
  onMergeComplete, onDeleteComplete, onRenameComplete,
}: {
  categories: string[];
  items: FurnitureItem[];
  customCategories: CustomFurnitureCategory[];
  lang: Lang;
  onClose: () => void;
  onMergeComplete: (from: string, to: string, moved: number) => void;
  onDeleteComplete: (key: string) => void;
  onRenameComplete: (oldKey: string, newKey: string) => void;
}) {
  const allKeys = useMemo(() => {
    const fromItems = Array.from(new Set(items.map(i => i.category))).filter(Boolean);
    return Array.from(new Set([...categories, ...fromItems])).sort();
  }, [categories, items]);

  const countFor = (key: string) => items.filter(i => i.category === key).length;
  const label    = (key: string) => getCategoryLabel(key, lang, customCategories);
  const others   = (excludeKey: string) => allKeys.filter(k => k !== excludeKey);

  const [view, setView] = useState<CatMgrView>({ v: 'list' });

  // Inline edit state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue,  setEditValue]  = useState('');
  const [editError,  setEditError]  = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const startEdit = (key: string) => {
    setEditingKey(key);
    setEditValue(key);
    setEditError('');
  };

  const cancelEdit = () => { setEditingKey(null); setEditError(''); };

  const confirmRename = async () => {
    const newKey = editValue.trim();
    if (!newKey) { setEditError('Name cannot be empty.'); return; }
    if (newKey !== editingKey && allKeys.includes(newKey)) { setEditError('Category already exists.'); return; }
    if (newKey === editingKey) { cancelEdit(); return; }
    setEditSaving(true);
    const res = await renameFurnitureCategory(editingKey!, newKey);
    if (res.success) {
      onRenameComplete(editingKey!, newKey);
      toast.success(`Renamed "${label(editingKey!)}" → "${newKey}" (${res.moved} items updated)`);
      setEditingKey(null);
    } else {
      setEditError(res.error ?? 'Rename failed.');
    }
    setEditSaving(false);
  };

  const startMerge = (fromKey: string) => {
    cancelEdit();
    const opts = others(fromKey);
    if (!opts.length) { toast.error('No other categories to merge into.'); return; }
    setView({ v: 'merge', fromKey, toKey: opts[0] });
  };

  const startDelete = (key: string) => {
    cancelEdit();
    setView({ v: 'delete', key, toKey: others(key)[0] ?? '' });
  };

  const confirmMerge = async (fromKey: string, toKey: string) => {
    setView({ v: 'working' });
    const res = await mergeFurnitureCategory(fromKey, toKey);
    if (res.success) {
      onMergeComplete(fromKey, toKey, res.moved);
      toast.success(`Moved ${res.moved} item${res.moved !== 1 ? 's' : ''} — "${label(fromKey)}" → "${label(toKey)}"`);
    } else {
      toast.error(res.error ?? 'Merge failed.');
    }
    setView({ v: 'list' });
  };

  const confirmDelete = async (key: string, toKey: string) => {
    setView({ v: 'working' });
    const count = countFor(key);
    if (count > 0 && toKey) {
      const mergeRes = await mergeFurnitureCategory(key, toKey);
      if (!mergeRes.success) { toast.error(mergeRes.error ?? 'Merge failed.'); setView({ v: 'list' }); return; }
      onMergeComplete(key, toKey, mergeRes.moved);
    }
    const delRes = await deleteFurnitureCategoryFromMeta(key);
    if (delRes.success) {
      onDeleteComplete(key);
      toast.success(
        count > 0
          ? `Moved ${count} item${count !== 1 ? 's' : ''} to "${label(toKey)}" · "${label(key)}" deleted.`
          : `Category "${label(key)}" deleted.`
      );
    } else {
      toast.error(delRes.error ?? 'Delete failed.');
    }
    setView({ v: 'list' });
  };

  const selStyle: React.CSSProperties = {
    width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
    border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)',
    fontSize: '0.875rem', color: 'var(--tqf-dark)', background: 'white', outline: 'none',
  };
  const btnSecondary: React.CSSProperties = {
    border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)',
    fontFamily: 'var(--font-body)', background: 'white',
  };

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 9999 }}
      onClick={view.v !== 'working' ? onClose : undefined}>
      <div className="rounded-2xl overflow-hidden w-full max-w-lg"
        style={{ background: 'white', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--tqf-beige-border)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400, fontSize: '1.15rem' }}>
            {view.v === 'merge' ? 'Merge Category' : view.v === 'delete' ? 'Delete Category' : 'Manage Categories'}
          </h3>
          {view.v !== 'working' && (
            <button onClick={view.v === 'list' ? onClose : () => setView({ v: 'list' })}
              className="size-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
              style={{ background: 'var(--tqf-beige)', border: 'none', color: 'var(--tqf-muted)', cursor: 'pointer' }}>
              {view.v === 'list' ? <X className="size-4" /> : <ArrowLeft className="size-4" />}
            </button>
          )}
        </div>

        {/* List view */}
        {view.v === 'list' && (
          <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f9f8f5' }}>
                  {(['Category', 'Items', ''] as const).map((h, i) => (
                    <th key={h} style={{ textAlign: i === 1 ? 'center' : i === 2 ? 'right' : 'left', padding: '0.55rem ' + (i === 1 ? '1rem' : '1.5rem'), color: 'var(--tqf-muted)', fontWeight: 500, fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid var(--tqf-beige-border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allKeys.map((key, idx) => {
                  const count = countFor(key);
                  const isEditing = editingKey === key;
                  return (
                    <tr key={key} style={{ borderBottom: idx < allKeys.length - 1 ? '1px solid var(--tqf-beige-border)' : 'none' }}>
                      {/* Category cell — shows input when editing */}
                      <td style={{ padding: isEditing ? '0.5rem 1.5rem' : '0.7rem 1.5rem', color: 'var(--tqf-dark)' }}>
                        {isEditing ? (
                          <div>
                            <input
                              value={editValue}
                              autoFocus
                              onChange={e => { setEditValue(e.target.value); setEditError(''); }}
                              onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') cancelEdit(); }}
                              style={{ ...inp, fontSize: '0.82rem', padding: '0.35rem 0.55rem' }}
                            />
                            {editError && (
                              <p style={{ color: '#991b1b', fontSize: '0.68rem', fontFamily: 'var(--font-body)', marginTop: '3px' }}>
                                {editError}
                              </p>
                            )}
                          </div>
                        ) : (
                          <>
                            <div style={{ fontWeight: 500 }}>{label(key)}</div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--tqf-muted)', fontFamily: 'monospace', marginTop: '1px' }}>{key}</div>
                          </>
                        )}
                      </td>

                      {/* Items count — hidden when editing */}
                      <td style={{ padding: '0.7rem 1rem', textAlign: 'center', color: count > 0 ? 'var(--tqf-dark)' : 'var(--tqf-muted)' }}>
                        {!isEditing && count}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.7rem 1.5rem', textAlign: 'right' }}>
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button type="button" onClick={confirmRename} disabled={editSaving}
                              className="size-7 flex items-center justify-center rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40"
                              style={{ background: 'var(--tqf-bordeaux)', border: 'none', color: 'white', cursor: 'pointer' }}>
                              {editSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                            </button>
                            <button type="button" onClick={cancelEdit}
                              className="size-7 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
                              style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', background: 'white', cursor: 'pointer' }}>
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button type="button" onClick={() => startEdit(key)}
                              className="size-7 flex items-center justify-center rounded-lg transition-opacity hover:opacity-80"
                              style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', background: 'white', cursor: 'pointer' }}
                              title="Rename">
                              <Edit2 className="size-3.5" />
                            </button>
                            <button type="button" onClick={() => startMerge(key)}
                              className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                              style={{ border: '1px solid var(--tqf-cipria)', color: 'var(--tqf-bordeaux)', background: 'white', fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
                              Merge →
                            </button>
                            <button type="button" onClick={() => startDelete(key)}
                              className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                              style={{ border: '1px solid #fca5a5', color: '#991b1b', background: 'white', fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Merge confirm */}
        {view.v === 'merge' && (
          <div className="p-6 space-y-5">
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>From</p>
              <p style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)' }}>
                <strong>{label(view.fromKey)}</strong>
                <span style={{ color: 'var(--tqf-muted)', marginLeft: '0.5rem' }}>{countFor(view.fromKey)} items</span>
              </p>
            </div>
            <div>
              <p className="text-xs mb-1.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Move into</p>
              <select value={view.toKey} onChange={e => setView({ ...view, toKey: e.target.value })} style={selStyle}>
                {others(view.fromKey).map(k => <option key={k} value={k}>{label(k)}</option>)}
              </select>
            </div>
            <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Moves <strong>{countFor(view.fromKey)}</strong> item{countFor(view.fromKey) !== 1 ? 's' : ''} to <strong>{label(view.toKey)}</strong>. The source category stays in the list.
            </p>
            <div className="flex gap-3 justify-end pt-1">
              <button type="button" onClick={() => setView({ v: 'list' })}
                className="text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-70" style={btnSecondary}>
                Cancel
              </button>
              <button type="button" onClick={() => confirmMerge(view.fromKey, view.toKey)}
                className="text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
                style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)', border: 'none', cursor: 'pointer' }}>
                Confirm Merge
              </button>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {view.v === 'delete' && (() => {
          const count = countFor(view.key);
          return (
            <div className="p-6 space-y-5">
              {count > 0 ? (
                <>
                  <p className="text-sm" style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)' }}>
                    <strong>&ldquo;{label(view.key)}&rdquo;</strong> has <strong>{count} item{count !== 1 ? 's' : ''}</strong>. Select a category to move them into before deleting:
                  </p>
                  <select value={view.toKey} onChange={e => setView({ ...view, toKey: e.target.value })} style={selStyle}>
                    {others(view.key).map(k => <option key={k} value={k}>{label(k)}</option>)}
                  </select>
                  <p className="text-xs" style={{ color: '#991b1b', fontFamily: 'var(--font-body)' }}>
                    This will move {count} item{count !== 1 ? 's' : ''} to &ldquo;{label(view.toKey)}&rdquo; and permanently delete &ldquo;{label(view.key)}&rdquo;.
                  </p>
                </>
              ) : (
                <p className="text-sm" style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)' }}>
                  Delete <strong>&ldquo;{label(view.key)}&rdquo;</strong>? This removes it from the category list. No items will be affected.
                </p>
              )}
              <div className="flex gap-3 justify-end pt-1">
                <button type="button" onClick={() => setView({ v: 'list' })}
                  className="text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-70" style={btnSecondary}>
                  Cancel
                </button>
                <button type="button"
                  disabled={count > 0 && !view.toKey}
                  onClick={() => confirmDelete(view.key, view.toKey)}
                  className="text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ background: '#991b1b', color: 'white', fontFamily: 'var(--font-body)', border: 'none', cursor: 'pointer' }}>
                  {count > 0 ? 'Move & Delete' : 'Delete Category'}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Working */}
        {view.v === 'working' && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
            <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>Working…</p>
          </div>
        )}

      </div>
    </div>,
    document.body,
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminFurniturePage() {
  const { adminUser, logout, canManageCatalogs, permissions, isSuperAdmin, isLoading } = usePlannerAuth();
  const { t, lang } = useI18n();

  const [items, setItems]           = useState<FurnitureItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [catFilter, setCatFilter]   = useState('all');

  const [standby, setStandby]   = useState<StandbyItem[]>([]);
  const [uploads, setUploads]   = useState<UploadState[]>([]);
  const [categories, setCategories]       = useState<string[]>([]);
  const [cities, setCities]               = useState<string[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomFurnitureCategory[]>([]);
  const [metaLoaded, setMetaLoaded]       = useState(false);

  // Super Admin: custom category editor
  const [newCatKey, setNewCatKey] = useState('');
  const [newCatEn,  setNewCatEn]  = useState('');
  const [newCatEs,  setNewCatEs]  = useState('');
  const [savingCustomCats, setSavingCustomCats] = useState(false);

  // Super Admin: category manager modal
  const [showCatManager, setShowCatManager] = useState(false);

  // Super Admin: migration
  const [migrationReport,   setMigrationReport]   = useState<MigrationDryRunResult | null>(null);
  const [migrationRunning,  setMigrationRunning]  = useState(false);
  const [migrationExecuting, setMigrationExecuting] = useState(false);

  const bulkRef = useRef<HTMLInputElement>(null);
  // BUG-16 fix: track pending timeouts so we can clear them on unmount.
  const pendingTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => { pendingTimeoutsRef.current.forEach(clearTimeout); }, []);

  // Load items + meta + standby from localStorage
  useEffect(() => {
    const DEFAULT_CITIES = ['Ciudad de México', 'Cancún'];

    Promise.all([
      getDocs(query(collection(db, 'furnitureItems'), orderBy('createdAt', 'desc'))),
      getDoc(doc(db, 'furnitureMeta', 'config')),
    ]).then(([itemsSnap, metaSnap]) => {
      const toStr = (v: any) => (v && typeof v.toDate === 'function' ? v.toDate().toISOString() : (v ?? ''));
      setItems(itemsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name ?? '',
          category: data.category ?? '',
          price: data.price ?? 0,
          currency: data.currency ?? 'MXN',
          cities: data.cities ?? [],
          images: data.images ?? [],
          description: data.description ?? '',
          published: data.published ?? false,
          createdAt: toStr(data.createdAt),
          updatedAt: toStr(data.updatedAt),
        } as FurnitureItem;
      }));
      const meta = metaSnap.exists() ? metaSnap.data() : {};
      const custom: CustomFurnitureCategory[] = meta.customCategories ?? [];
      const predefinedKeys = PREDEFINED_FURNITURE_CATEGORIES.map(c => c.key);
      setCategories(meta.categories ?? predefinedKeys);
      setCities(meta.cities ?? DEFAULT_CITIES);
      setCustomCategories(custom);
      setMetaLoaded(true);
      setLoading(false);
    });
    setStandby(loadStandby());
  }, []);

  // Persist standby to localStorage whenever it changes
  useEffect(() => {
    if (metaLoaded) saveStandby(standby);
  }, [standby, metaLoaded]);

  const updateStandby = (id: string, patch: Partial<StandbyItem>) =>
    setStandby(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));

  const removeStandby = (id: string) =>
    setStandby(prev => prev.filter(s => s.id !== id));

  // ── Bulk upload ─────────────────────────────────────────────────────────────
  const handleBulkUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!storage) { toast.error('Firebase Storage non configurato (NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET mancante).'); return; }
    const fileArr = Array.from(files);

    const newUploads: UploadState[] = fileArr.map(f => ({
      id: crypto.randomUUID(), fileName: f.name, progress: 0, done: false,
    }));
    setUploads(prev => [...prev, ...newUploads]);

    await Promise.all(fileArr.map(async (file, i) => {
      const uid = newUploads[i].id;
      const compressed = await compressFurnitureImage(file);
      return new Promise<void>((resolve) => {
        const safe = compressed.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `furniture/bulk/${Date.now()}_${safe}`;
        const sRef = storageRef(storage, path);
        const task = uploadBytesResumable(sRef, compressed, { contentType: compressed.type });

        task.on('state_changed',
          snap => {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            setUploads(prev => prev.map(u => u.id === uid ? { ...u, progress: pct } : u));
          },
          (err) => {
            const msg = err.code === 'storage/unauthorized'
              ? 'Permesso negato — regole Firebase Storage da deployare.'
              : `Errore upload: ${err.code ?? 'sconosciuto'}`;
            toast.error(msg);
            setUploads(prev => prev.map(u => u.id === uid ? { ...u, error: msg, done: true } : u));
            resolve();
          },
          async () => {
            const url = await getDownloadURL(task.snapshot.ref);
            const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
            const newItem: StandbyItem = {
              id: uid, imageUrl: url, fileName: baseName,
              name: '', category: categories[0] ?? '', price: '', currency: 'MXN', cities: [], saving: false,
            };
            setStandby(prev => [...prev, newItem]);
            setUploads(prev => prev.map(u => u.id === uid ? { ...u, progress: 100, done: true, url } : u));
            resolve();
          }
        );
      });
    }));

    // BUG-16 fix: track timeout id so it can be cleared on unmount.
    const tid = setTimeout(() => setUploads(prev => prev.filter(u => !u.done)), 2000);
    pendingTimeoutsRef.current.push(tid);
    if (bulkRef.current) bulkRef.current.value = '';
  }, [categories]);

  // ── Save standby item ───────────────────────────────────────────────────────
  const saveStandbyItem = async (id: string) => {
    const s = standby.find(x => x.id === id);
    if (!s || !s.name.trim() || !s.category || s.price === '' || s.cities.length === 0) return;

    updateStandby(id, { saving: true });

    // Ensure new category is persisted to meta
    if (!categories.includes(s.category)) {
      const updatedCats = [...categories, s.category];
      await saveFurnitureMeta(updatedCats, cities);
      setCategories(updatedCats);
    }

    // BUG-15 fix: pass images directly to saveFurnitureItem to avoid orphaned doc
    // on failure between the two sequential writes.
    const result = await saveFurnitureItem({
      name: s.name.trim(), category: s.category, price: s.price as number,
      currency: s.currency, cities: s.cities, images: [s.imageUrl], description: '', published: true,
    });

    if (result.success && result.id) {
      const newItem: FurnitureItem = {
        id: result.id, name: s.name.trim(), category: s.category,
        price: s.price as number, currency: s.currency, cities: s.cities,
        images: [s.imageUrl], description: '', published: true,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      setItems(prev => [newItem, ...prev]);
      removeStandby(id);
      toast.success(t('furniture_addedToast', { name: s.name }));
    } else {
      updateStandby(id, { saving: false });
      toast.error(t('furniture_saveError'));
    }
  };

  // ── Add new city to meta ────────────────────────────────────────────────────
  const handleAddCity = async (city: string) => {
    if (cities.includes(city)) return;
    const updated = [...cities, city];
    await saveFurnitureMeta(categories, updated);
    setCities(updated);
  };

  // ── Delete item ─────────────────────────────────────────────────────────────
  const handleDelete = async (item: FurnitureItem) => {
    if (!confirm(t('furniture_deleteConfirm', { name: item.name }))) return;
    setDeletingId(item.id);
    const result = await deleteFurnitureItem(item.id);
    if (result.success) {
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast.success(t('furniture_deleted'));
    } else {
      toast.error(result.error ?? t('furniture_deleteError'));
    }
    setDeletingId(null);
  };

  // ── Category manager callbacks ──────────────────────────────────────────────
  const handleMergeComplete = useCallback((fromKey: string, toKey: string) => {
    setItems(prev => prev.map(item => item.category === fromKey ? { ...item, category: toKey } : item));
  }, []);

  const handleDeleteComplete = useCallback((key: string) => {
    setCategories(prev => prev.filter(k => k !== key));
    setItems(prev => prev.filter(item => item.category !== key));
  }, []);

  const handleRenameComplete = useCallback((oldKey: string, newKey: string) => {
    setItems(prev => prev.map(item => item.category === oldKey ? { ...item, category: newKey } : item));
    setCategories(prev => prev.map(k => k === oldKey ? newKey : k));
    setCustomCategories(prev => prev.map(c => c.key === oldKey ? { ...c, key: newKey } : c));
  }, []);

  // BUG-09 fix: replaced `return null` with proper access control.
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
      <div className="size-8 animate-spin rounded-full border-2 border-[var(--tqf-bordeaux)] border-t-transparent" />
    </div>
  );
  if (!adminUser && !canManageCatalogs) return <AccessDenied />;

  const canEdit = permissions.furniture.canEdit;
  const allCategories = Array.from(new Set(items.map(i => i.category))).sort();
  const filtered = catFilter === 'all' ? items : items.filter(i => i.category === catFilter);

  const pill = (active: boolean): React.CSSProperties => ({
    fontFamily: 'var(--font-body)', fontSize: '0.7rem', letterSpacing: '0.08em',
    textTransform: 'uppercase', padding: '0.4rem 1rem', borderRadius: '999px',
    border: active ? '1px solid var(--tqf-bordeaux)' : '1px solid var(--tqf-beige-border)',
    background: active ? 'var(--tqf-bordeaux)' : 'white',
    color: active ? 'white' : 'var(--tqf-dark)', cursor: 'pointer', whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  });

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>

      {/* PART-2: show banner when user can view but not edit (e.g. XB team) */}
      {!canEdit && <ReadOnlyBanner />}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}>
        <div className="flex items-center gap-4">
          <Link href="/planner" className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            <ArrowLeft className="size-4" /> {t('dashboard')}
          </Link>
          <div className="h-4 w-px" style={{ background: 'var(--tqf-beige-border)' }} />
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg" style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
              <Sofa className="size-4" />
            </div>
            <h1 className="text-xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              {t('furniture_title')}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              {/* Bulk upload button */}
              <button
                onClick={() => bulkRef.current?.click()}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
                style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', border: '1px solid var(--tqf-cipria)', fontFamily: 'var(--font-body)' }}
              >
                <Upload className="size-4" />
                {t('furniture_uploadImages')}
              </button>
              <input ref={bulkRef} type="file" accept="image/*" multiple className="hidden"
                onChange={e => handleBulkUpload(e.target.files)} />

              {/* Manual new item */}
              <Link href="/planner/furniture/new"
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
                style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
                <Plus className="size-4" /> {t('furniture_new')}
              </Link>
            </>
          )}

          {(isSuperAdmin || canManageCatalogs) && (
            <button
              type="button"
              onClick={() => setShowCatManager(true)}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', border: '1px solid var(--tqf-cipria)', fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
              <Edit2 className="size-3.5" /> Manage Categories
            </button>
          )}

          <LanguageSelector />
          <button onClick={logout}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)' }}>
            <LogOut className="size-4" />
            <span className="hidden sm:inline">{t('logout')}</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10">

        {/* ── Upload progress ─────────────────────────────────────────────── */}
        {uploads.filter(u => !u.done).length > 0 && (
          <div className="rounded-2xl p-5 space-y-3" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <p className="text-sm font-medium" style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)' }}>
              {t('furniture_uploading')}
            </p>
            {uploads.filter(u => !u.done).map(u => (
              <div key={u.id}>
                <div className="flex justify-between text-xs mb-1" style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-muted)' }}>
                  <span className="truncate max-w-xs">{u.fileName}</span>
                  <span>{u.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--tqf-beige-border)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${u.progress}%`, background: 'var(--tqf-bordeaux)' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Standby section ─────────────────────────────────────────────── */}
        {standby.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
                Standby
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--tqf-cipria)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                {standby.length}
              </span>
              <div className="flex-1 h-px" style={{ background: 'var(--tqf-beige-border)' }} />
              <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {t('furniture_standby_hint')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {standby.map(s => (
                <StandbyCard
                  key={s.id} item={s}
                  categories={categories} cities={cities}
                  lang={lang as Lang} customCategories={customCategories}
                  onUpdate={patch => updateStandby(s.id, patch)}
                  onSave={() => saveStandbyItem(s.id)}
                  onRemove={() => removeStandby(s.id)}
                  onAddCity={handleAddCity}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Catalog section ─────────────────────────────────────────────── */}
        <div>
          {/* Filter pills */}
          {allCategories.length > 1 && (
            <div className="flex gap-2 flex-wrap mb-6">
              <button onClick={() => setCatFilter('all')} style={pill(catFilter === 'all')}>{t('furniture_all')}</button>
              {allCategories.map(cat => (
                <button key={cat} onClick={() => setCatFilter(cat)} style={pill(catFilter === cat)}>
                  {getCategoryLabel(cat, lang as Lang, customCategories)}
                </button>
              ))}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-20">
              <Loader2 className="size-6 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl p-16 text-center" style={{ background: 'white', border: '2px dashed var(--tqf-cipria)' }}>
              <div className="mx-auto mb-4 size-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
                <Sofa className="size-6" />
              </div>
              <h2 className="text-xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
                {t('furniture_noItems')}
              </h2>
              {canEdit ? (
                <>
                  <p className="text-sm mb-6" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                    {t('furniture_noItemsDesc')}
                  </p>
                  <button onClick={() => bulkRef.current?.click()}
                    className="inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-lg transition-opacity hover:opacity-80"
                    style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)', border: 'none', cursor: 'pointer' }}>
                    <Upload className="size-4" /> {t('furniture_uploadImages')}
                  </button>
                </>
              ) : (
                <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  {t('furniture_noItemsReadOnly')}
                </p>
              )}
            </div>
          )}

          {/* Grid */}
          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map(item => (
                <ItemCard
                  key={item.id} item={item}
                  allCategories={allCategories}
                  lang={lang as Lang} customCategories={customCategories}
                  onDelete={() => handleDelete(item)}
                  deleting={deletingId === item.id}
                  canEdit={canEdit}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Super Admin panel ───────────────────────────────────────────── */}
        {isSuperAdmin && (
          <div className="rounded-2xl p-6 space-y-6" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              Super Admin — Categorie
            </h2>

            {/* ── Predefined categories (read-only) ─────────────────────── */}
            <div>
              <p className="text-xs mb-2" style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Predefinite (chiavi stabili)
              </p>
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_FURNITURE_CATEGORIES.map(c => (
                  <span key={c.key} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
                    style={{ background: 'var(--tqf-beige)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)' }}>
                    <code style={{ fontSize: '0.6rem', color: 'var(--tqf-muted)' }}>{c.key}</code>
                    <span>·</span>
                    <span>{c.en}</span>
                    <span style={{ color: 'var(--tqf-muted)' }}>/</span>
                    <span>{c.es}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* ── Custom categories ─────────────────────────────────────── */}
            <div>
              <p className="text-xs mb-2" style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Categorie custom
              </p>
              {customCategories.length === 0 && (
                <p className="text-sm" style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-muted)' }}>
                  Nessuna categoria custom.
                </p>
              )}
              {customCategories.map((c, idx) => (
                <div key={c.key} className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--tqf-beige)', fontFamily: 'monospace', color: 'var(--tqf-muted)', minWidth: 120 }}>{c.key}</span>
                  <span className="text-sm flex-1" style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)' }}>{c.en} / {c.es}</span>
                  <button type="button"
                    onClick={async () => {
                      const updated = customCategories.filter((_, i) => i !== idx);
                      setSavingCustomCats(true);
                      const res = await saveCustomCategories(updated);
                      if (res.success) {
                        setCustomCategories(updated);
                        const allKeys = [...PREDEFINED_FURNITURE_CATEGORIES.map(p => p.key), ...updated.map(u => u.key)];
                        setCategories(allKeys);
                      }
                      setSavingCustomCats(false);
                    }}
                    className="size-6 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
                    style={{ background: 'var(--tqf-beige)', color: '#991b1b', border: 'none' }}>
                    <X className="size-3" />
                  </button>
                </div>
              ))}

              {/* Add custom category form */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                <input type="text" placeholder="chiave_stabile" value={newCatKey}
                  onChange={e => setNewCatKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  style={{ padding: '0.4rem 0.6rem', borderRadius: '0.5rem', border: '1px solid var(--tqf-beige-border)', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--tqf-dark)', background: 'white', outline: 'none' }}
                />
                <input type="text" placeholder="Label EN" value={newCatEn}
                  onChange={e => setNewCatEn(e.target.value)}
                  style={{ padding: '0.4rem 0.6rem', borderRadius: '0.5rem', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--tqf-dark)', background: 'white', outline: 'none' }}
                />
                <input type="text" placeholder="Label ES" value={newCatEs}
                  onChange={e => setNewCatEs(e.target.value)}
                  style={{ padding: '0.4rem 0.6rem', borderRadius: '0.5rem', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--tqf-dark)', background: 'white', outline: 'none' }}
                />
              </div>
              <button
                type="button"
                disabled={savingCustomCats || !newCatKey.trim() || !newCatEn.trim() || !newCatEs.trim()}
                onClick={async () => {
                  const entry: CustomFurnitureCategory = { key: newCatKey.trim(), en: newCatEn.trim(), es: newCatEs.trim() };
                  if (customCategories.some(c => c.key === entry.key)) { toast.error('Chiave già esistente.'); return; }
                  setSavingCustomCats(true);
                  const updated = [...customCategories, entry];
                  const res = await saveCustomCategories(updated);
                  if (res.success) {
                    setCustomCategories(updated);
                    const allKeys = [...PREDEFINED_FURNITURE_CATEGORIES.map(p => p.key), ...updated.map(u => u.key)];
                    setCategories(allKeys);
                    setNewCatKey(''); setNewCatEn(''); setNewCatEs('');
                    toast.success('Categoria aggiunta.');
                  } else {
                    toast.error(res.error ?? 'Errore.');
                  }
                  setSavingCustomCats(false);
                }}
                className="mt-2 flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)', border: 'none' }}>
                {savingCustomCats ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                Aggiungi categoria custom
              </button>
            </div>

            {/* ── Migration section ─────────────────────────────────────── */}
            <div style={{ borderTop: '1px solid var(--tqf-beige-border)', paddingTop: '1.5rem' }}>
              <p className="text-xs mb-1" style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Migrazione one-time (label → chiavi)
              </p>
              <p className="text-xs mb-4" style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-muted)' }}>
                Converte le vecchie etichette in italiano nelle chiavi stabili. Esegui prima Dry Run per verificare.
              </p>

              <div className="flex gap-2 mb-4">
                <button type="button"
                  disabled={migrationRunning || migrationExecuting}
                  onClick={async () => {
                    setMigrationRunning(true);
                    const report = await getMigrationDryRun();
                    setMigrationReport(report);
                    setMigrationRunning(false);
                  }}
                  className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ border: '1px solid var(--tqf-bordeaux)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', background: 'white' }}>
                  {migrationRunning ? <Loader2 className="size-3 animate-spin" /> : null}
                  Dry Run
                </button>

                {migrationReport && migrationReport.totalToUpdate > 0 && (
                  <button type="button"
                    disabled={migrationExecuting || migrationRunning}
                    onClick={async () => {
                      if (!confirm(`Aggiornare ${migrationReport.totalToUpdate} documenti su Firestore? L'operazione è irreversibile.`)) return;
                      setMigrationExecuting(true);
                      const res = await executeFurnitureMigration();
                      if (res.success) {
                        toast.success(`Migrazione completata: ${res.updated} documenti aggiornati.`);
                        setMigrationReport(null);
                        // Reload items with new keys
                        const snap = await getDocs(query(collection(db, 'furnitureItems'), orderBy('createdAt', 'desc')));
                        const toStr = (v: any) => (v && typeof v.toDate === 'function' ? v.toDate().toISOString() : (v ?? ''));
                        setItems(snap.docs.map(d => {
                          const data = d.data();
                          return { id: d.id, name: data.name ?? '', category: data.category ?? '', price: data.price ?? 0, currency: data.currency ?? 'MXN', cities: data.cities ?? [], images: data.images ?? [], description: data.description ?? '', published: data.published ?? false, createdAt: toStr(data.createdAt), updatedAt: toStr(data.updatedAt) } as FurnitureItem;
                        }));
                        const predefinedKeys = PREDEFINED_FURNITURE_CATEGORIES.map(c => c.key);
                        setCategories(predefinedKeys);
                        setCustomCategories([]);
                      } else {
                        toast.error(res.error ?? 'Errore durante la migrazione.');
                      }
                      setMigrationExecuting(false);
                    }}
                    className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ background: '#991b1b', color: 'white', fontFamily: 'var(--font-body)', border: 'none' }}>
                    {migrationExecuting ? <Loader2 className="size-3 animate-spin" /> : null}
                    Esegui migrazione ({migrationReport.totalToUpdate} doc)
                  </button>
                )}
              </div>

              {migrationReport && (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--tqf-beige-border)' }}>
                  <div className="px-4 py-2" style={{ background: 'var(--tqf-beige)', borderBottom: '1px solid var(--tqf-beige-border)' }}>
                    <p className="text-xs" style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)' }}>
                      Totale doc: <strong>{migrationReport.totalDocs}</strong> · Da aggiornare: <strong>{migrationReport.totalToUpdate}</strong> · Skip: <strong>{migrationReport.totalToSkip}</strong>
                    </p>
                    <p className="text-xs mt-0.5" style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-muted)' }}>
                      Meta attuale: [{migrationReport.metaCurrent.join(', ')}]
                    </p>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', fontFamily: 'var(--font-body)' }}>
                    <thead>
                      <tr style={{ background: '#f9f8f5' }}>
                        <th style={{ textAlign: 'left', padding: '0.5rem 1rem', color: 'var(--tqf-muted)', fontWeight: 500, borderBottom: '1px solid var(--tqf-beige-border)' }}>Label attuale</th>
                        <th style={{ textAlign: 'left', padding: '0.5rem 1rem', color: 'var(--tqf-muted)', fontWeight: 500, borderBottom: '1px solid var(--tqf-beige-border)' }}>→ Nuova chiave</th>
                        <th style={{ textAlign: 'right', padding: '0.5rem 1rem', color: 'var(--tqf-muted)', fontWeight: 500, borderBottom: '1px solid var(--tqf-beige-border)' }}>Doc</th>
                        <th style={{ textAlign: 'left', padding: '0.5rem 1rem', color: 'var(--tqf-muted)', fontWeight: 500, borderBottom: '1px solid var(--tqf-beige-border)' }}>Azione</th>
                      </tr>
                    </thead>
                    <tbody>
                      {migrationReport.groups.map((g, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--tqf-beige-border)', background: g.action === 'update' ? '#fefce8' : 'white' }}>
                          <td style={{ padding: '0.5rem 1rem', color: 'var(--tqf-dark)' }}><code>{g.oldLabel || '(vuoto)'}</code></td>
                          <td style={{ padding: '0.5rem 1rem', color: g.action === 'update' ? 'var(--tqf-bordeaux)' : 'var(--tqf-muted)' }}><code>{g.newKey ?? '—'}</code></td>
                          <td style={{ padding: '0.5rem 1rem', textAlign: 'right', color: 'var(--tqf-dark)' }}>{g.count}</td>
                          <td style={{ padding: '0.5rem 1rem', color: g.action === 'update' ? 'var(--tqf-bordeaux)' : g.action === 'alreadyKey' ? '#15803d' : '#6b7280' }}>
                            {g.action === 'update' ? 'UPDATE' : g.action === 'alreadyKey' ? 'già OK' : '⚠️ senza mapping'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {showCatManager && (isSuperAdmin || canManageCatalogs) && (
        <CategoryManagerModal
          categories={categories}
          items={items}
          customCategories={customCategories}
          lang={lang as Lang}
          onClose={() => setShowCatManager(false)}
          onMergeComplete={handleMergeComplete}
          onDeleteComplete={handleDeleteComplete}
          onRenameComplete={handleRenameComplete}
        />
      )}
    </div>
  );
}
