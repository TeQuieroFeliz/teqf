'use client';

import {
  deleteFurnitureItem,
  saveFurnitureItem,
  saveFurnitureMeta,
  updateFurnitureImages,
} from '@/actions/furniture/furniture-crud';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { db, storage } from '@/firebase/client';
import { collection, doc, getDocs, getDoc, orderBy, query } from 'firebase/firestore';
import { FurnitureCurrency, FurnitureItem } from '@/lib/planner-types';
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage';
import {
  ArrowLeft, Armchair, Check, Edit2, Flower2,
  Loader2, LogOut, Plus, RotateCcw, Scissors, Sofa, Sparkles, Square,
  Trash2, Upload, X,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  const l = cat.toLowerCase();
  if (l.includes('sedi') || l.includes('chair'))  return <Armchair className="size-10" />;
  if (l.includes('divano') || l.includes('sofa'))  return <Sofa className="size-10" />;
  if (l.includes('flore') || l.includes('flower')) return <Flower2 className="size-10" />;
  if (l.includes('tavol') || l.includes('table'))  return <Square className="size-10" strokeWidth={1} />;
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
  item, categories, cities,
  onUpdate, onSave, onRemove, onAddCity,
}: {
  item: StandbyItem;
  categories: string[];
  cities: string[];
  onUpdate: (patch: Partial<StandbyItem>) => void;
  onSave: () => void;
  onRemove: () => void;
  onAddCity: (city: string) => void;
}) {
  const [showNewCat,  setShowNewCat]  = useState(false);
  const [newCat,      setNewCat]      = useState('');
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
        throw new Error((body as { error?: string }).error ?? `Errore ${res.status}`);
      }
      const blob = await res.blob();
      setProcessedBlob(blob);
      setProcessedLocalUrl(URL.createObjectURL(blob));
      setBgState('comparing');
    } catch (err) {
      setBgError(err instanceof Error ? err.message : 'Errore sconosciuto');
      setBgState('error');
    }
  };

  // User picked the processed version → upload to Firebase and update imageUrl
  const handleChooseProcessed = async () => {
    if (!processedBlob) return;
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
      setBgError('Errore durante il caricamento su Firebase');
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
                Originale
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
                ✦ Sfondo Rimosso
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
              Usa Originale
            </button>
            <button type="button" onClick={handleChooseProcessed}
              className="py-2 text-xs transition-opacity hover:opacity-80"
              style={{ fontFamily: 'var(--font-body)', color: 'white', background: 'var(--tqf-bordeaux)', border: 'none' }}>
              Usa Sfondo Rimosso
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
              {isProcessed ? 'BG RIMOSSO' : 'STANDBY'}
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
                  Rimuovi Sfondo
                </button>
                {isProcessed && (
                  <button type="button" onClick={handleRestore}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-opacity hover:opacity-70"
                    style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', background: 'white' }}>
                    <RotateCcw className="size-3" />
                    Ripristina
                  </button>
                )}
              </div>
            )}
            {bgState === 'removing' && (
              <div className="flex items-center gap-1.5">
                <Loader2 className="size-3 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
                <span className="text-xs" style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-muted)' }}>
                  Rimozione sfondo in corso…
                </span>
              </div>
            )}
            {bgState === 'uploading' && (
              <div className="flex items-center gap-1.5">
                <Loader2 className="size-3 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
                <span className="text-xs" style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-muted)' }}>
                  Caricamento immagine…
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
                  Riprova
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
            Nome *
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
            Categoria *
          </label>
          {!showNewCat ? (
            <select value={item.category} onChange={e => e.target.value === '__new__' ? setShowNewCat(true) : onUpdate({ category: e.target.value })} style={inp}>
              <option value="">— Seleziona —</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="__new__">＋ Nuova categoria...</option>
            </select>
          ) : (
            <div className="flex gap-1.5">
              <input type="text" value={newCat} autoFocus placeholder="Nome categoria..."
                onChange={e => setNewCat(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newCat.trim()) { onUpdate({ category: newCat.trim() }); setShowNewCat(false); setNewCat(''); } }}
                style={{ ...inp, flex: 1 }} />
              <button type="button" onClick={() => { if (newCat.trim()) { onUpdate({ category: newCat.trim() }); setShowNewCat(false); setNewCat(''); } }}
                className="size-8 flex items-center justify-center rounded-lg transition-opacity hover:opacity-80"
                style={{ background: 'var(--tqf-bordeaux)', color: 'white', border: 'none', flexShrink: 0 }}>
                <Check className="size-3.5" />
              </button>
              <button type="button" onClick={() => { setShowNewCat(false); setNewCat(''); }}
                className="size-8 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
                style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', flexShrink: 0 }}>
                <X className="size-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Price + currency */}
        <div>
          <label className="block mb-1" style={{ fontSize: '0.6rem', letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            Prezzo *
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
            Città *
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
                <Plus className="size-3" /> Nuova
              </button>
            ) : (
              <div className="flex items-center gap-1 mt-1 w-full">
                <input
                  type="text" value={newCity} autoFocus placeholder="Nome città..."
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
            Scarta
          </button>
          <button type="button" onClick={onSave} disabled={!canSave}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)', border: 'none' }}>
            {item.saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            Salva
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ItemCard ──────────────────────────────────────────────────────────────────

function ItemCard({ item, allCategories, onDelete, deleting }: {
  item: FurnitureItem;
  allCategories: string[];
  onDelete: () => void;
  deleting: boolean;
}) {
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
          {item.published ? 'Pubblicato' : 'Bozza'}
        </span>

        {/* Admin action overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-start gap-2 p-3" style={{ background: 'linear-gradient(to top, rgba(30,15,10,0.45) 0%, transparent 55%)' }}>
          <Link
            href={`/admin/furniture/${item.id}`}
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
            style={{ background: 'white', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', textDecoration: 'none', fontWeight: 500 }}
          >
            <Edit2 className="size-3" /> Modifica
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
      </div>

      {/* Lightbox */}
      {lightbox && item.images?.[0] && (
        <ImageLightbox src={item.images[0]} alt={item.name} onClose={() => setLightbox(false)} />
      )}

      {/* Body */}
      <div className="p-4 flex flex-col gap-2.5 flex-1">
        <p style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', lineHeight: 1.4 }}>
          {item.category}{item.description ? ` · ${item.description}` : ''}
        </p>
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontSize: '1.15rem', fontWeight: 400, lineHeight: 1.2 }}>
          {item.name || <span style={{ opacity: 0.35 }}>Senza nome</span>}
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminFurniturePage() {
  const { adminUser, logout } = useAdminAuth();

  const [items, setItems]           = useState<FurnitureItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [catFilter, setCatFilter]   = useState('all');

  const [standby, setStandby]   = useState<StandbyItem[]>([]);
  const [uploads, setUploads]   = useState<UploadState[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [cities, setCities]         = useState<string[]>([]);
  const [metaLoaded, setMetaLoaded] = useState(false);

  const bulkRef = useRef<HTMLInputElement>(null);

  // Load items + meta + standby from localStorage
  useEffect(() => {
    const DEFAULT_CATEGORIES = ['Sedie', 'Tavoli', 'Tovaglie', 'Cocktail Table', 'Divani', 'Sala Lounge'];
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
      setCategories(meta.categories ?? DEFAULT_CATEGORIES);
      setCities(meta.cities ?? DEFAULT_CITIES);
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
    const fileArr = Array.from(files);

    const newUploads: UploadState[] = fileArr.map(f => ({
      id: crypto.randomUUID(), fileName: f.name, progress: 0, done: false,
    }));
    setUploads(prev => [...prev, ...newUploads]);

    await Promise.all(fileArr.map((file, i) => {
      const uid = newUploads[i].id;
      return new Promise<void>((resolve) => {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `furniture/bulk/${Date.now()}_${safe}`;
        const sRef = storageRef(storage, path);
        const task = uploadBytesResumable(sRef, file, { contentType: file.type });

        task.on('state_changed',
          snap => {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            setUploads(prev => prev.map(u => u.id === uid ? { ...u, progress: pct } : u));
          },
          () => {
            setUploads(prev => prev.map(u => u.id === uid ? { ...u, error: 'Errore upload', done: true } : u));
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

    // Clear finished uploads after a short delay
    setTimeout(() => setUploads(prev => prev.filter(u => !u.done)), 2000);
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

    const result = await saveFurnitureItem({
      name: s.name.trim(), category: s.category, price: s.price as number,
      currency: s.currency, cities: s.cities, images: [], description: '', published: true,
    });

    if (result.success && result.id) {
      await updateFurnitureImages(result.id, [s.imageUrl]);
      const newItem: FurnitureItem = {
        id: result.id, name: s.name.trim(), category: s.category,
        price: s.price as number, currency: s.currency, cities: s.cities,
        images: [s.imageUrl], description: '', published: true,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      setItems(prev => [newItem, ...prev]);
      removeStandby(id);
      toast.success(`"${s.name}" aggiunto al catalogo.`);
    } else {
      updateStandby(id, { saving: false });
      toast.error('Errore salvataggio.');
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
    if (!confirm(`Eliminare "${item.name}"?`)) return;
    setDeletingId(item.id);
    const result = await deleteFurnitureItem(item.id);
    if (result.success) {
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast.success('Elemento eliminato.');
    } else {
      toast.error(result.error ?? 'Errore eliminazione.');
    }
    setDeletingId(null);
  };

  if (!adminUser) return null;

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

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}>
        <div className="flex items-center gap-4">
          <Link href="/admin" className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            <ArrowLeft className="size-4" /> Dashboard
          </Link>
          <div className="h-4 w-px" style={{ background: 'var(--tqf-beige-border)' }} />
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg" style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
              <Sofa className="size-4" />
            </div>
            <h1 className="text-xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              Catalogo Mobili
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Bulk upload button */}
          <button
            onClick={() => bulkRef.current?.click()}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', border: '1px solid var(--tqf-cipria)', fontFamily: 'var(--font-body)' }}
          >
            <Upload className="size-4" />
            Carica Immagini
          </button>
          <input ref={bulkRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => handleBulkUpload(e.target.files)} />

          {/* Manual new item */}
          <Link href="/admin/furniture/new"
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
            <Plus className="size-4" /> Nuovo
          </Link>

          <button onClick={logout}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)' }}>
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Esci</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10">

        {/* ── Upload progress ─────────────────────────────────────────────── */}
        {uploads.filter(u => !u.done).length > 0 && (
          <div className="rounded-2xl p-5 space-y-3" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <p className="text-sm font-medium" style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)' }}>
              Caricamento in corso…
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
                Rinomina e configura per pubblicare
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {standby.map(s => (
                <StandbyCard
                  key={s.id} item={s}
                  categories={categories} cities={cities}
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
              <button onClick={() => setCatFilter('all')} style={pill(catFilter === 'all')}>Tutto</button>
              {allCategories.map(cat => (
                <button key={cat} onClick={() => setCatFilter(cat)} style={pill(catFilter === cat)}>{cat}</button>
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
                Nessun elemento
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                Carica immagini per iniziare a costruire il catalogo.
              </p>
              <button onClick={() => bulkRef.current?.click()}
                className="inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)', border: 'none', cursor: 'pointer' }}>
                <Upload className="size-4" /> Carica Immagini
              </button>
            </div>
          )}

          {/* Grid */}
          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map(item => (
                <ItemCard
                  key={item.id} item={item}
                  allCategories={allCategories}
                  onDelete={() => handleDelete(item)}
                  deleting={deletingId === item.id}
                />
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
