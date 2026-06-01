'use client';

import { getPublishedFurnitureItems } from '@/actions/furniture/furniture-crud';
import { getPublishedFlowerItems } from '@/actions/flowers/flowers-crud';
import { savePlannerEvent } from '@/actions/planner/planner-event-crud';
import { sendPlannerEventEmail } from '@/actions/planner/send-planner-email';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { storage } from '@/firebase/client';
import {
  CustomItem,
  EventDay,
  FLOWER_CATEGORIES, FlowerItem,
  FurnitureItem,
  PlannerEvent,
} from '@/lib/planner-types';
import { Lang, LANG_OPTIONS, T, Translations } from '@/lib/planner-i18n';
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage';
import {
  ArrowLeft, Calendar, ChevronDown, ChevronUp,
  Download, FileText, Flower2, ImagePlus, Loader2, LogOut,
  Minus, Plus, Save, Send, Sofa, Trash2, Upload, Wallet, X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import TqfCalendar from './TqfCalendar';
import VenueSearchInput, { VenueData } from './VenueSearchInput';

type Props = { initialEvent?: PlannerEvent; eventId: string; isNew: boolean; };

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
  border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)',
  fontSize: '0.875rem', color: 'var(--tqf-dark)', background: 'white', outline: 'none',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', fontFamily: 'var(--font-body)',
  color: 'var(--tqf-muted)', marginBottom: '0.375rem',
  letterSpacing: '0.06em', textTransform: 'uppercase',
};

function formatDate(iso: string, months: string[]) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function newDay(date: string): EventDay {
  return {
    id: crypto.randomUUID(), date,
    eventName: '', venue: '', venueAddress: '', venuePlaceId: '', venueMapUrl: '',
    notes: '', setupTime: '', breakdownTime: '', supplierAccessTime: '', eventStartTime: '',
    supplierRegulationUrl: '', layoutUrls: [],
    selectedFurniture: [], selectedFlowers: [], customItems: [],
  };
}

function EditorSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
      <div className="flex items-center gap-2 mb-5">
        <div className="p-1.5 rounded-lg" style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>{icon}</div>
        <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function QtyButtons({ qty, onInc, onDec }: { qty: number; onInc: () => void; onDec: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={onDec} className="size-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
        style={{ background: qty > 0 ? 'var(--tqf-cipria-light)' : '#f3f4f6', color: qty > 0 ? 'var(--tqf-bordeaux)' : '#9ca3af', border: '1px solid var(--tqf-beige-border)' }}>
        <Minus className="size-3" />
      </button>
      <span className="w-8 text-center text-sm font-medium" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>{qty}</span>
      <button type="button" onClick={onInc} className="size-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
        style={{ background: 'var(--tqf-bordeaux)', color: 'white', border: 'none' }}>
        <Plus className="size-3" />
      </button>
    </div>
  );
}

function TimePickerAMPM({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parts = value ? value.split(':').map(Number) : [null, null];
  const h24   = parts[0] ?? null;
  const min   = parts[1] ?? 0;
  const isPM  = h24 !== null && h24 >= 12;
  const h12   = h24 === null ? '' : h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;

  const emit = (newH12: number | '', newM: number, newIsPM: boolean) => {
    if (newH12 === '') { onChange(''); return; }
    const h = (newH12 % 12) + (newIsPM ? 12 : 0);
    onChange(`${String(h).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
  };

  const sel: React.CSSProperties = {
    padding: '0.4rem 0.3rem', borderRadius: '0.4rem',
    border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)',
    fontSize: '0.85rem', color: 'var(--tqf-dark)', background: 'white', outline: 'none',
  };

  return (
    <div className="flex items-center gap-1">
      <select value={h12} onChange={e => emit(e.target.value === '' ? '' : Number(e.target.value), min, isPM)} style={{ ...sel, width: '3.2rem' }}>
        <option value="">--</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <span style={{ color: 'var(--tqf-muted)', fontSize: '0.9rem' }}>:</span>
      <select value={min} onChange={e => emit(h12, Number(e.target.value), isPM)} style={{ ...sel, width: '3.6rem' }}>
        {[0, 15, 30, 45].map(m => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
      </select>
      <select value={isPM ? 'PM' : 'AM'} onChange={e => emit(h12, min, e.target.value === 'PM')} style={{ ...sel, width: '3.4rem' }}>
        <option>AM</option>
        <option>PM</option>
      </select>
    </div>
  );
}

type DayCardProps = {
  day: EventDay;
  dayIndex: number;
  eventId: string;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (updated: EventDay) => void;
  onRemove: () => void;
  onAddSameDay: () => void;
  t: Translations;
  furnitureItems: FurnitureItem[];
  flowerItems: FlowerItem[];
  catalogLoading: boolean;
};

function DayCard({ day, dayIndex, eventId, isExpanded, onToggle, onChange, onRemove, onAddSameDay, t, furnitureItems, flowerItems, catalogLoading }: DayCardProps) {
  const regRef    = useRef<HTMLInputElement>(null);
  const layoutRef = useRef<HTMLInputElement>(null);
  const [uploadingReg,    setUploadingReg]    = useState(false);
  const [uploadingLayout, setUploadingLayout] = useState(false);
  const [furnitureCatFilter, setFurnitureCatFilter] = useState<string>('all');
  const [flowerCatFilter,    setFlowerCatFilter]    = useState<string>('all');
  const [uploadingCustom, setUploadingCustom]       = useState<string | null>(null); // itemId being uploaded
  const customInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const set = <K extends keyof EventDay>(k: K, v: EventDay[K]) => onChange({ ...day, [k]: v });

  const addCustomItem = () => {
    const newItem: CustomItem = { id: crypto.randomUUID(), imageUrls: [], note: '' };
    set('customItems', [...(day.customItems ?? []), newItem]);
  };

  const updateCustomItem = (id: string, patch: Partial<CustomItem>) => {
    set('customItems', (day.customItems ?? []).map(ci => ci.id === id ? { ...ci, ...patch } : ci));
  };

  const removeCustomItem = (id: string) => {
    set('customItems', (day.customItems ?? []).filter(ci => ci.id !== id));
  };

  const handleCustomImageUpload = async (itemId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingCustom(itemId);
    try {
      const uploaded: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const url = await uploadFile(file, `planner-events/${eventId}/days/${day.id}/custom/${Date.now()}_${i}_${safe}`);
        uploaded.push(url);
      }
      const current = day.customItems.find(ci => ci.id === itemId);
      updateCustomItem(itemId, { imageUrls: [...(current?.imageUrls ?? []), ...uploaded] });
      toast.success(t.imageUploaded(uploaded.length));
    } catch { toast.error(t.imageUploadError); }
    setUploadingCustom(null);
  };

  const getFurnitureQty = (id: string) => day.selectedFurniture.find(i => i.itemId === id)?.quantity ?? 0;
  const setFurnitureQty = (item: FurnitureItem, qty: number) => {
    const rest = day.selectedFurniture.filter(i => i.itemId !== item.id);
    if (qty <= 0) set('selectedFurniture', rest);
    else set('selectedFurniture', [...rest, { itemId: item.id, itemName: item.name, category: item.category, quantity: qty, price: item.price }]);
  };

  const getFlowerQty = (id: string) => day.selectedFlowers.find(i => i.itemId === id)?.quantity ?? 0;
  const setFlowerQty = (item: FlowerItem, qty: number) => {
    const rest = day.selectedFlowers.filter(i => i.itemId !== item.id);
    if (qty <= 0) set('selectedFlowers', rest);
    else set('selectedFlowers', [...rest, { itemId: item.id, itemName: item.name, category: item.category, quantity: qty, price: item.price, unit: item.unit }]);
  };

  const furnitureCategories = Array.from(new Set(furnitureItems.map(i => i.category))).sort();
  const filteredFurniture   = furnitureCatFilter === 'all' ? furnitureItems : furnitureItems.filter(i => i.category === furnitureCatFilter);
  const filteredFlowers     = flowerCatFilter    === 'all' ? flowerItems    : flowerItems.filter(i => i.category === flowerCatFilter);

  const dayFurnitureTotal = day.selectedFurniture.reduce((s, i) => s + i.price * i.quantity, 0);
  const dayFlowersTotal   = day.selectedFlowers.reduce((s, i) => s + i.price * i.quantity, 0);

  const uploadFile = (file: File, path: string): Promise<string> =>
    new Promise((resolve, reject) => {
      const sRef = storageRef(storage, path);
      const task = uploadBytesResumable(sRef, file, { contentType: file.type });
      task.on('state_changed', () => {}, reject, async () => resolve(await getDownloadURL(task.snapshot.ref)));
    });

  const handleRegUpload = async (files: FileList | null) => {
    if (!files?.[0]) return;
    setUploadingReg(true);
    try {
      const safe = files[0].name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const url  = await uploadFile(files[0], `planner-events/${eventId}/days/${day.id}/regulations/${Date.now()}_${safe}`);
      set('supplierRegulationUrl', url);
      toast.success(t.regulationUploaded);
    } catch { toast.error(t.regulationError); }
    setUploadingReg(false);
  };

  const handleLayoutUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingLayout(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        urls.push(await uploadFile(file, `planner-events/${eventId}/days/${day.id}/layouts/${Date.now()}_${safe}`));
      }
      set('layoutUrls', [...day.layoutUrls, ...urls]);
      toast.success(t.layoutUploaded(urls.length));
    } catch { toast.error(t.layoutError); }
    setUploadingLayout(false);
  };

  const handleVenueChange = (data: VenueData) =>
    onChange({ ...day, venue: data.name, venueAddress: data.address ?? day.venueAddress, venuePlaceId: data.placeId ?? day.venuePlaceId, venueMapUrl: data.mapUrl ?? day.venueMapUrl });

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--tqf-beige-border)', background: 'white' }}>
      {/* Card header */}
      <div
        role="button" tabIndex={0}
        onClick={onToggle}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors cursor-pointer"
        style={{ background: isExpanded ? 'var(--tqf-cipria-light)' : 'white' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--tqf-bordeaux)' }}>
            <Calendar className="size-4" style={{ color: 'white' }} />
          </div>
          <div className="text-left min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                {formatDate(day.date, t.dateMonths)}
              </p>
              {dayIndex > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)', fontSize: '0.6rem' }}>
                  #{dayIndex + 1}
                </span>
              )}
            </div>
            <p className="text-xs truncate" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {day.eventName || t.eventDescriptionEmpty}
              {day.venue ? ` · ${day.venue}` : ''}
              {(day.selectedFurniture.length > 0 || day.selectedFlowers.length > 0) && (
                ` · ${t.itemsCount(day.selectedFurniture.reduce((s, i) => s + i.quantity, 0) + day.selectedFlowers.reduce((s, i) => s + i.quantity, 0))}`
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="size-7 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
            style={{ color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca' }}
          >
            <Trash2 className="size-3.5" />
          </button>
          {isExpanded ? <ChevronUp className="size-4" style={{ color: 'var(--tqf-muted)' }} /> : <ChevronDown className="size-4" style={{ color: 'var(--tqf-muted)' }} />}
        </div>
      </div>

      {/* Card body */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-1 space-y-5 border-t" style={{ borderColor: 'var(--tqf-beige-border)' }}>

          {/* ── Info base evento ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div>
              <label style={labelStyle}>{t.eventDescription}</label>
              <input type="text" value={day.eventName} onChange={e => set('eventName', e.target.value)}
                placeholder={t.eventDescriptionPlaceholder} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Venue</label>
              <VenueSearchInput
                value={day.venue} address={day.venueAddress} mapUrl={day.venueMapUrl}
                onChange={handleVenueChange} placeholder={t.venuePlaceholder}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>{t.notes}</label>
            <input type="text" value={day.notes} onChange={e => set('notes', e.target.value)}
              placeholder={t.notesPlaceholder} style={inputStyle} />
          </div>

          <div>
            <label style={{ ...labelStyle, marginBottom: '0.5rem' }}>{t.logistics}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t.setup}</label>
                <TimePickerAMPM value={day.setupTime} onChange={v => set('setupTime', v)} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t.eventStart}</label>
                <TimePickerAMPM value={day.eventStartTime ?? ''} onChange={v => set('eventStartTime', v)} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t.breakdown}</label>
                <TimePickerAMPM value={day.breakdownTime} onChange={v => set('breakdownTime', v)} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t.supplierAccess}</label>
                <TimePickerAMPM value={day.supplierAccessTime} onChange={v => set('supplierAccessTime', v)} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>{t.supplierRegulations}</label>
              {day.supplierRegulationUrl ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: 'var(--tqf-cipria-light)', border: '1px solid var(--tqf-cipria)' }}>
                  <FileText className="size-4 flex-shrink-0" style={{ color: 'var(--tqf-bordeaux)' }} />
                  <a href={day.supplierRegulationUrl} target="_blank" rel="noopener noreferrer"
                    className="flex-1 text-xs truncate hover:opacity-70" style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                    {t.regulationsUploaded}
                  </a>
                  <button type="button" onClick={() => set('supplierRegulationUrl', '')}>
                    <X className="size-4" style={{ color: 'var(--tqf-muted)' }} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => regRef.current?.click()} disabled={uploadingReg}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 border-dashed text-xs transition-opacity hover:opacity-70 disabled:opacity-50"
                  style={{ borderColor: 'var(--tqf-cipria)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  {uploadingReg ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                  {uploadingReg ? t.uploading : t.uploadDoc}
                </button>
              )}
              <input ref={regRef} type="file" accept=".pdf,.doc,.docx,image/*" className="hidden"
                onChange={e => handleRegUpload(e.target.files)} />
            </div>

            <div>
              <label style={labelStyle}>{t.layoutLabel(day.layoutUrls.length)}</label>
              <button type="button" onClick={() => layoutRef.current?.click()} disabled={uploadingLayout}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 border-dashed text-xs transition-opacity hover:opacity-70 disabled:opacity-50"
                style={{ borderColor: 'var(--tqf-cipria)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {uploadingLayout ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                {uploadingLayout ? t.uploading : t.addLayout}
              </button>
              <input ref={layoutRef} type="file" accept=".pdf,.doc,.docx,image/*" multiple className="hidden"
                onChange={e => handleLayoutUpload(e.target.files)} />
              {day.layoutUrls.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  {day.layoutUrls.map((url, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1 text-xs truncate hover:opacity-70"
                        style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                        {t.layoutItem(i)}
                      </a>
                      <button type="button" onClick={() => set('layoutUrls', day.layoutUrls.filter((_, idx) => idx !== i))}>
                        <X className="size-3.5" style={{ color: 'var(--tqf-muted)' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Catalogo Mobili (per giorno) ── */}
          <div className="rounded-xl p-4" style={{ background: 'var(--tqf-beige)', border: '1px solid var(--tqf-beige-border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1 rounded-lg" style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
                <Sofa className="size-3.5" />
              </div>
              <p className="text-sm" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
                {t.furnitureCatalog('')}
              </p>
            </div>

            {furnitureCategories.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-4">
                {[{ value: 'all', label: t.all }, ...furnitureCategories.map(c => ({ value: c, label: c }))].map(cat => (
                  <button key={cat.value} type="button" onClick={() => setFurnitureCatFilter(cat.value)}
                    className="text-xs px-2.5 py-1 rounded-full transition-all"
                    style={furnitureCatFilter === cat.value
                      ? { background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }
                      : { background: 'white', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', border: '1px solid var(--tqf-cipria)' }
                    }>
                    {cat.label}
                  </button>
                ))}
              </div>
            )}

            {catalogLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} /></div>
            ) : filteredFurniture.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {t.noFurniture('')}
              </p>
            ) : furnitureCatFilter !== 'all' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredFurniture.map(item => {
                  const qty = getFurnitureQty(item.id);
                  return (
                    <div key={item.id} className="rounded-xl overflow-hidden"
                      style={{ border: qty > 0 ? '2px solid var(--tqf-bordeaux)' : '1px solid var(--tqf-beige-border)', background: qty > 0 ? 'var(--tqf-cipria-light)' : 'white' }}>
                      {item.images?.[0] && (
                        <div style={{ height: '80px', overflow: 'hidden' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>{item.name}</p>
                        <p className="text-xs mt-0.5 mb-3" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                          {item.price.toLocaleString('es-MX')} {item.currency ?? 'MXN'}
                        </p>
                        <QtyButtons qty={qty} onInc={() => setFurnitureQty(item, qty + 1)} onDec={() => setFurnitureQty(item, qty - 1)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-5">
                {furnitureCategories.map(cat => {
                  const catItems = furnitureItems.filter(i => i.category === cat);
                  if (catItems.length === 0) return null;
                  return (
                    <div key={cat}>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>{cat}</p>
                        <div className="flex-1 h-px" style={{ background: 'var(--tqf-beige-border)' }} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {catItems.map(item => {
                          const qty = getFurnitureQty(item.id);
                          return (
                            <div key={item.id} className="rounded-xl overflow-hidden"
                              style={{ border: qty > 0 ? '2px solid var(--tqf-bordeaux)' : '1px solid var(--tqf-beige-border)', background: qty > 0 ? 'var(--tqf-cipria-light)' : 'white' }}>
                              {item.images?.[0] && (
                                <div style={{ height: '80px', overflow: 'hidden' }}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                              )}
                              <div className="p-3">
                                <p className="text-sm font-medium truncate" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>{item.name}</p>
                                <p className="text-xs mt-0.5 mb-3" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                                  {item.price.toLocaleString('es-MX')} {item.currency ?? 'MXN'}
                                </p>
                                <QtyButtons qty={qty} onInc={() => setFurnitureQty(item, qty + 1)} onDec={() => setFurnitureQty(item, qty - 1)} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {day.selectedFurniture.length > 0 && (
              <div className="mt-4 rounded-xl p-3" style={{ background: 'white', border: '1px solid var(--tqf-cipria)' }}>
                <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  {t.furnitureSelection(day.selectedFurniture.reduce((s, i) => s + i.quantity, 0))}
                </p>
                <div className="space-y-1.5">
                  {day.selectedFurniture.map(item => (
                    <div key={item.itemId} className="flex items-center justify-between text-sm">
                      <span style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>{item.itemName}</span>
                      <div className="flex items-center gap-3">
                        <span style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>×{item.quantity}</span>
                        <span style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>{(item.price * item.quantity).toLocaleString('es-MX')}</span>
                        <button type="button" onClick={() => setFurnitureQty(furnitureItems.find(f => f.id === item.itemId)!, 0)}>
                          <Trash2 className="size-3.5" style={{ color: 'var(--tqf-muted)' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t flex justify-between" style={{ borderColor: 'var(--tqf-beige-border)' }}>
                  <span className="text-xs font-medium" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t.furnitureSubtotal}</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>{dayFurnitureTotal.toLocaleString('es-MX')}</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Catalogo Fiori (per giorno) ── */}
          <div className="rounded-xl p-4" style={{ background: 'var(--tqf-beige)', border: '1px solid var(--tqf-beige-border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1 rounded-lg" style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
                <Flower2 className="size-3.5" />
              </div>
              <p className="text-sm" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
                {t.flowerCatalog}
              </p>
            </div>

            <div className="flex gap-2 flex-wrap mb-4">
              {[{ value: 'all', label: t.all }, ...FLOWER_CATEGORIES].map(cat => (
                <button key={cat.value} type="button" onClick={() => setFlowerCatFilter(cat.value)}
                  className="text-xs px-2.5 py-1 rounded-full transition-all"
                  style={flowerCatFilter === cat.value
                    ? { background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }
                    : { background: 'white', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', border: '1px solid var(--tqf-cipria)' }
                  }>
                  {cat.label}
                </button>
              ))}
            </div>

            {catalogLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} /></div>
            ) : filteredFlowers.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t.noFlowers}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredFlowers.map(item => {
                  const qty = getFlowerQty(item.id);
                  return (
                    <div key={item.id} className="rounded-xl overflow-hidden"
                      style={{ border: qty > 0 ? '2px solid var(--tqf-bordeaux)' : '1px solid var(--tqf-beige-border)', background: qty > 0 ? 'var(--tqf-cipria-light)' : 'white' }}>
                      {item.images?.[0] && (
                        <div style={{ height: '80px', overflow: 'hidden' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>{item.name}</p>
                        <p className="text-xs mt-0.5 mb-3" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>${item.price.toLocaleString('es-MX')} / {item.unit}</p>
                        <QtyButtons qty={qty} onInc={() => setFlowerQty(item, qty + 1)} onDec={() => setFlowerQty(item, qty - 1)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {day.selectedFlowers.length > 0 && (
              <div className="mt-4 rounded-xl p-3" style={{ background: 'white', border: '1px solid var(--tqf-cipria)' }}>
                <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  {t.flowersSelection(day.selectedFlowers.reduce((s, i) => s + i.quantity, 0))}
                </p>
                <div className="space-y-1.5">
                  {day.selectedFlowers.map(item => (
                    <div key={item.itemId} className="flex items-center justify-between text-sm">
                      <span style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>{item.itemName}</span>
                      <div className="flex items-center gap-3">
                        <span style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>×{item.quantity} {item.unit}</span>
                        <span style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>${(item.price * item.quantity).toLocaleString('es-MX')}</span>
                        <button type="button" onClick={() => setFlowerQty(flowerItems.find(f => f.id === item.itemId)!, 0)}>
                          <Trash2 className="size-3.5" style={{ color: 'var(--tqf-muted)' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t flex justify-between" style={{ borderColor: 'var(--tqf-beige-border)' }}>
                  <span className="text-xs font-medium" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t.flowersSubtotal}</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>${dayFlowersTotal.toLocaleString('es-MX')} MXN</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Add another event for same date ── */}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onAddSameDay(); }}
            className="w-full py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
            style={{ border: '1.5px dashed var(--tqf-cipria)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', background: 'transparent' }}
          >
            <Plus className="size-4" />
            {t.addEventSameDay}
          </button>

          {/* ── Idee & Elementi Personalizzati (per giorno) ── */}
          <div className="rounded-xl p-4" style={{ background: 'var(--tqf-beige)', border: '1px solid var(--tqf-beige-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg" style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
                  <ImagePlus className="size-3.5" />
                </div>
                <p className="text-sm" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
                  {t.customItemsTitle}
                </p>
                {(day.customItems ?? []).length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--tqf-cipria)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                    {day.customItems.length}
                  </span>
                )}
              </div>
              <button
                type="button" onClick={addCustomItem}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-70"
                style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)', border: 'none' }}
              >
                <Plus className="size-3" /> {t.add}
              </button>
            </div>

            {(day.customItems ?? []).length === 0 ? (
              <button
                type="button" onClick={addCustomItem}
                className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed transition-opacity hover:opacity-70"
                style={{ borderColor: 'var(--tqf-cipria)', color: 'var(--tqf-muted)', background: 'transparent' }}
              >
                <ImagePlus className="size-5" style={{ color: 'var(--tqf-cipria)' }} />
                <span className="text-xs" style={{ fontFamily: 'var(--font-body)' }}>
                  {t.customItemsEmptyHint}
                </span>
              </button>
            ) : (
              <div className="space-y-3">
                {(day.customItems ?? []).map(ci => (
                  <div key={ci.id} className="flex gap-3 rounded-xl p-3"
                    style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>

                    {/* Images grid */}
                    <div className="flex-shrink-0 flex flex-col gap-1.5" style={{ width: '90px' }}>
                      {(ci.imageUrls ?? []).map((url, imgIdx) => (
                        <div key={imgIdx} className="relative rounded-lg overflow-hidden" style={{ width: '90px', height: '72px' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => updateCustomItem(ci.id, { imageUrls: ci.imageUrls.filter((_, i) => i !== imgIdx) })}
                            className="absolute top-1 right-1 size-4 flex items-center justify-center rounded-full"
                            style={{ background: 'rgba(0,0,0,0.55)', color: 'white', border: 'none', cursor: 'pointer' }}
                          >
                            <X className="size-2.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => customInputRefs.current[ci.id]?.click()}
                        disabled={uploadingCustom === ci.id}
                        className="flex flex-col items-center justify-center gap-1 rounded-lg transition-opacity hover:opacity-70"
                        style={{ width: '90px', height: '56px', background: 'var(--tqf-cipria-light)', border: '1.5px dashed var(--tqf-cipria)', cursor: 'pointer' }}
                      >
                        {uploadingCustom === ci.id ? (
                          <Loader2 className="size-4 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
                        ) : (
                          <>
                            <Upload className="size-3.5" style={{ color: 'var(--tqf-bordeaux)' }} />
                            <span style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', fontSize: '0.58rem', lineHeight: 1.2, textAlign: 'center' }}>
                              {(ci.imageUrls ?? []).length > 0 ? t.addMorePhotos : t.uploadPhoto}
                            </span>
                          </>
                        )}
                      </button>
                      <input
                        type="file" accept="image/*" multiple className="hidden"
                        ref={el => { customInputRefs.current[ci.id] = el; }}
                        onChange={e => { handleCustomImageUpload(ci.id, e.target.files); e.target.value = ''; }}
                      />
                    </div>

                    {/* Note */}
                    <div className="flex-1 flex flex-col gap-2">
                      <textarea
                        value={ci.note}
                        onChange={e => updateCustomItem(ci.id, { note: e.target.value })}
                        placeholder={t.customItemNotePlaceholder}
                        rows={3}
                        style={{ ...inputStyle, resize: 'none', fontSize: '0.8125rem', padding: '0.4rem 0.6rem', flex: 1 }}
                      />
                    </div>

                    {/* Remove */}
                    <button
                      type="button" onClick={() => removeCustomItem(ci.id)}
                      className="flex-shrink-0 size-7 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70 self-start"
                      style={{ color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca' }}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

// ── Main editor ───────────────────────────────────────────────────────────────

type FormState = { eventCode: string; clientName: string; city: string; days: EventDay[] };
const EMPTY: FormState = { eventCode: '', clientName: '', city: '', days: [] };

const LANG_KEY = 'tqf-planner-lang';

export default function PlannerEventEditor({ initialEvent, eventId, isNew }: Props) {
  const { plannerUser, logout, canManageCashControl, canCreateProjects, isSuperAdmin } = usePlannerAuth();
  const router = useRouter();

  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LANG_KEY) as Lang | null;
      if (stored && ['it','en','es'].includes(stored)) return stored;
    }
    return 'it';
  });

  const t = T[lang];

  const changeLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem(LANG_KEY, l);
  };

  const [form, setForm] = useState<FormState>(() => {
    if (!initialEvent) return EMPTY;
    return {
      eventCode: initialEvent.eventCode ?? initialEvent.eventName ?? '',
      clientName: initialEvent.clientName ?? '',
      city: initialEvent.city ?? '',
      days: (initialEvent.days ?? []).map(d => ({
        ...d,
        eventStartTime: d.eventStartTime ?? '',
        selectedFurniture: d.selectedFurniture ?? [],
        selectedFlowers: d.selectedFlowers ?? [],
        customItems: (d.customItems ?? []).map(ci => ({
          ...ci,
          imageUrls: ci.imageUrls ?? ((ci as any).imageUrl ? [(ci as any).imageUrl] : []),
        })),
      })),
    };
  });

  const [saving, setSaving]           = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [furnitureItems, setFurnitureItems] = useState<FurnitureItem[]>([]);
  const [flowerItems, setFlowerItems]       = useState<FlowerItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  useEffect(() => {
    setCatalogLoading(true);
    Promise.all([getPublishedFurnitureItems(), getPublishedFlowerItems()])
      .then(([furniture, flowers]) => { setFurnitureItems(furniture); setFlowerItems(flowers); setCatalogLoading(false); });
  }, []);

  const selectedDates = [...new Set(form.days.map(d => d.date))];

  const handleDatesChange = (newDates: string[]) => {
    const removedDates = selectedDates.filter(d => !newDates.includes(d));
    const addedDates   = newDates.filter(d => !selectedDates.includes(d));
    let updatedDays = form.days.filter(d => !removedDates.includes(d.date));
    for (const date of addedDates) {
      updatedDays = [...updatedDays, newDay(date)];
    }
    updatedDays.sort((a, b) => a.date.localeCompare(b.date));
    setForm(prev => ({ ...prev, days: updatedDays }));
    if (addedDates.length > 0) {
      const addedDay = updatedDays.find(d => d.date === addedDates[addedDates.length - 1]);
      if (addedDay) setExpandedDay(addedDay.id);
    }
  };

  const addEventForDate = (date: string) => {
    const newD = newDay(date);
    setForm(prev => ({ ...prev, days: [...prev.days, newD] }));
    setExpandedDay(newD.id);
  };

  const updateDay = (id: string, updated: EventDay) =>
    setForm(prev => ({ ...prev, days: prev.days.map(d => d.id === id ? updated : d) }));

  const removeDay = (id: string) => {
    const day = form.days.find(d => d.id === id);
    if (!day) return;
    const siblingsForDate = form.days.filter(d => d.date === day.date && d.id !== id);
    if (siblingsForDate.length === 0) {
      handleDatesChange(selectedDates.filter(dt => dt !== day.date));
    } else {
      setForm(prev => ({ ...prev, days: prev.days.filter(d => d.id !== id) }));
    }
    if (expandedDay === id) setExpandedDay(null);
  };

  const handleSave = async (submit: boolean) => {
    if (!plannerUser) return;
    if (!form.eventCode.trim()) { toast.error(t.enterEventCode); return; }
    if (submit && form.days.length === 0) { toast.error(t.selectOneDay); return; }
    setSaving(true);
    const payload = {
      ...form, id: isNew ? undefined : eventId,
      plannerId: plannerUser.id, plannerName: plannerUser.name, plannerEmail: plannerUser.email,
      status: submit ? 'submitted' : 'active',
    } as const;
    const result = await savePlannerEvent(payload);
    if (result.success && submit) {
      await sendPlannerEventEmail({
        ...payload,
        id: result.id!,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'submitted',
      }, lang);
    }
    setSaving(false);
    if (result.success) {
      toast.success(submit ? t.eventSent : t.eventSaved);
      router.push('/planner');
    } else {
      toast.error(t.saveError);
    }
  };

  const downloadPdf = async () => {
    if (!plannerUser) return;
    setDownloading(true);
    try {
      const event: PlannerEvent = {
        ...form, id: eventId,
        plannerId: plannerUser.id, plannerName: plannerUser.name, plannerEmail: plannerUser.email,
        status: 'draft', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      const res = await fetch('/api/planner-event-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, lang }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `TQF_${(form.eventCode || 'evento').replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t.pdfError);
    }
    setDownloading(false);
  };

  const furnitureTotal = form.days.flatMap(d => d.selectedFurniture).reduce((s, i) => s + i.price * i.quantity, 0);
  const flowersTotal   = form.days.flatMap(d => d.selectedFlowers).reduce((s, i) => s + i.price * i.quantity, 0);
  const grandTotal     = furnitureTotal + flowersTotal;

  if (!plannerUser) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}>
        <div className="flex items-center gap-4">
          <Link href="/planner" className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            <ArrowLeft className="size-4" /> {t.myEvents}
          </Link>
          <div className="h-4 w-px" style={{ background: 'var(--tqf-beige-border)' }} />
          <h1 className="text-xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
            {isNew ? t.newEvent : (form.eventCode || t.editEvent)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--tqf-beige-border)' }}>
            {LANG_OPTIONS.map((opt, idx) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => changeLang(opt.value)}
                className="text-xs px-2.5 py-1.5 transition-colors"
                style={{
                  fontFamily : 'var(--font-body)',
                  fontWeight : lang === opt.value ? 600 : 400,
                  background : lang === opt.value ? 'var(--tqf-bordeaux)' : 'white',
                  color      : lang === opt.value ? 'white' : 'var(--tqf-muted)',
                  borderLeft : idx > 0 ? '1px solid var(--tqf-beige-border)' : 'none',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Cash Control link — visible when event exists and user has access */}
          {!isNew && (isSuperAdmin || canManageCashControl || canCreateProjects) && (
            <Link
              href={`/planner/projects/${eventId}/cash-control`}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ color: 'var(--tqf-bordeaux)', border: '1px solid var(--tqf-cipria)', background: 'var(--tqf-cipria-light)', fontFamily: 'var(--font-body)' }}
            >
              <Wallet className="size-4" />
              <span className="hidden sm:inline">Gastos</span>
            </Link>
          )}

          <button onClick={downloadPdf} disabled={downloading || saving}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', background: 'white', fontFamily: 'var(--font-body)' }}>
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            <span className="hidden sm:inline">{t.downloadPdf}</span>
          </button>
          <button onClick={() => handleSave(false)} disabled={saving}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ color: 'var(--tqf-bordeaux)', border: '1px solid var(--tqf-cipria)', background: 'var(--tqf-cipria-light)', fontFamily: 'var(--font-body)' }}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            <span className="hidden sm:inline">{t.saveActive}</span>
          </button>
          <button onClick={() => handleSave(true)} disabled={saving}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            <span className="hidden sm:inline">{t.send}</span>
          </button>
          <button onClick={logout} className="size-9 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
            style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)' }}>
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ── 1. Dettagli evento ──────────────────────────────────────── */}
        <EditorSection title={t.eventDetails} icon={<Calendar className="size-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label style={labelStyle}>{t.eventCode} *</label>
              <input type="text" value={form.eventCode}
                onChange={e => set('eventCode', e.target.value.toUpperCase())}
                placeholder={t.eventCodePlaceholder}
                style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}
              />
              <p className="mt-1 text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {t.eventCodeHint}
              </p>
            </div>
            <div>
              <label style={labelStyle}>{t.clientName}</label>
              <input type="text" value={form.clientName} onChange={e => set('clientName', e.target.value)}
                placeholder={t.clientNamePlaceholder} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t.city} *</label>
              <input type="text" value={form.city} onChange={e => set('city', e.target.value)}
                placeholder={t.cityPlaceholder} style={inputStyle} />
            </div>
          </div>
        </EditorSection>

        {/* ── 2. Giorni & Venue ──────────────────────────────────────── */}
        <EditorSection title={t.daysVenue} icon={<Calendar className="size-4" />}>
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-shrink-0">
              <p className="text-xs mb-3" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {t.clickDates}
              </p>
              <TqfCalendar
                selected={selectedDates}
                onChange={handleDatesChange}
                monthsFull={t.monthsFull}
                monthsShort={t.monthsShort}
                days={t.days}
                daySelected={t.daySelected}
                daysSelected={t.daysSelected}
              />
            </div>

            <div className="flex-1 min-w-0">
              {form.days.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-10 rounded-xl"
                  style={{ border: '2px dashed var(--tqf-cipria)', color: 'var(--tqf-muted)' }}>
                  <Calendar className="size-8 mb-2" style={{ color: 'var(--tqf-cipria)' }} />
                  <p className="text-sm" style={{ fontFamily: 'var(--font-body)' }}>{t.selectDaysHint}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {form.days.map((day) => {
                    const sameDateDays = form.days.filter(d => d.date === day.date);
                    const dayIndex = sameDateDays.findIndex(d => d.id === day.id);
                    return (
                      <DayCard
                        key={day.id} day={day} dayIndex={dayIndex} eventId={eventId} t={t}
                        isExpanded={expandedDay === day.id}
                        onToggle={() => setExpandedDay(expandedDay === day.id ? null : day.id)}
                        onChange={updated => updateDay(day.id, updated)}
                        onRemove={() => removeDay(day.id)}
                        onAddSameDay={() => addEventForDate(day.date)}
                        furnitureItems={furnitureItems}
                        flowerItems={flowerItems}
                        catalogLoading={catalogLoading}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </EditorSection>

        {/* ── Totale ─────────────────────────────────────────────────── */}
        {grandTotal > 0 && (
          <div className="rounded-2xl p-5 flex justify-between items-center" style={{ background: 'var(--tqf-bordeaux)' }}>
            <span style={{ color: 'var(--tqf-cipria-light)', fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>{t.estimatedTotal}</span>
            <span style={{ color: 'white', fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 300 }}>
              ${grandTotal.toLocaleString('es-MX')} MXN
            </span>
          </div>
        )}

        <div className="flex justify-end gap-3 pb-6">
          <button onClick={downloadPdf} disabled={downloading || saving}
            className="flex items-center gap-2 text-sm px-6 py-3 rounded-xl transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', background: 'white', fontFamily: 'var(--font-body)' }}>
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {t.downloadPdf}
          </button>
          <button onClick={() => handleSave(false)} disabled={saving}
            className="flex items-center gap-2 text-sm px-6 py-3 rounded-xl transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ color: 'var(--tqf-bordeaux)', border: '1px solid var(--tqf-cipria)', background: 'var(--tqf-cipria-light)', fontFamily: 'var(--font-body)' }}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {t.saveActive}
          </button>
          <button onClick={() => handleSave(true)} disabled={saving}
            className="flex items-center gap-2 text-sm px-6 py-3 rounded-xl transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {t.sendToTqf}
          </button>
        </div>
      </main>
    </div>
  );
}
