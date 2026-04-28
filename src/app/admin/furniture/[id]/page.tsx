'use client';

import {
  getFurnitureItem,
  getFurnitureMeta,
  saveFurnitureItem,
  saveFurnitureMeta,
  updateFurnitureImages,
} from '@/actions/furniture/furniture-crud';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { storage } from '@/firebase/client';
import { FurnitureCurrency, FurnitureItem } from '@/lib/planner-types';
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage';
import {
  ArrowLeft,
  Check,
  Loader2,
  LogOut,
  Plus,
  Sofa,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type FormState = Omit<FurnitureItem, 'id' | 'createdAt' | 'updatedAt'>;

const EMPTY: FormState = {
  name: '',
  category: '',
  price: 0,
  currency: 'MXN',
  cities: [],
  images: [],
  description: '',
  published: true,
};

const CURRENCIES: { value: FurnitureCurrency; symbol: string }[] = [
  { value: 'MXN', symbol: 'MXN' },
  { value: 'USD', symbol: 'USD' },
  { value: 'EUR', symbol: 'EUR' },
];

type UploadProgress = { name: string; progress: number };

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid var(--tqf-beige-border)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.875rem',
  color: 'var(--tqf-dark)',
  background: 'white',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontFamily: 'var(--font-body)',
  color: 'var(--tqf-muted)',
  marginBottom: '0.375rem',
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const,
};

export default function FurnitureEditorPage() {
  const { adminUser, logout } = useAdminAuth();
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id as string;
  const isNew = rawId === 'new';

  const [projectId] = useState(() => (isNew ? crypto.randomUUID() : rawId));
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [coverImage, setCoverImage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Meta: available categories and cities
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  // Category "add new" state
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  // City "add new" state
  const [showNewCity, setShowNewCity] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [savingCity, setSavingCity] = useState(false);

  useEffect(() => {
    async function load() {
      const [meta, item] = await Promise.all([
        getFurnitureMeta(),
        isNew ? Promise.resolve(null) : getFurnitureItem(rawId),
      ]);

      setAvailableCategories(meta.categories);
      setAvailableCities(meta.cities);

      if (!isNew && item) {
        const { id: _id, createdAt: _ca, updatedAt: _ua, ...rest } = item;
        setForm({ ...EMPTY, ...rest });
        setCoverImage(item.images?.[0] ?? '');
      } else if (isNew) {
        setForm((prev) => ({ ...prev, category: meta.categories[0] ?? '' }));
      } else if (!isNew && !item) {
        router.replace('/admin/furniture');
        return;
      }
      setLoading(false);
    }
    load();
  }, [isNew, rawId, router]);

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleCity = (city: string) =>
    setForm((prev) => ({
      ...prev,
      cities: prev.cities.includes(city)
        ? prev.cities.filter((c) => c !== city)
        : [...prev.cities, city],
    }));

  async function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    if (availableCategories.includes(name)) {
      set('category', name);
      setShowNewCategory(false);
      setNewCategoryName('');
      return;
    }
    setSavingCategory(true);
    const updated = [...availableCategories, name];
    await saveFurnitureMeta(updated, availableCities);
    setAvailableCategories(updated);
    set('category', name);
    setShowNewCategory(false);
    setNewCategoryName('');
    setSavingCategory(false);
    toast.success(`Categoria "${name}" aggiunta.`);
  }

  async function handleAddCity() {
    const name = newCityName.trim();
    if (!name) return;
    setSavingCity(true);
    let updatedCities = availableCities;
    if (!availableCities.includes(name)) {
      updatedCities = [...availableCities, name];
      await saveFurnitureMeta(availableCategories, updatedCities);
      setAvailableCities(updatedCities);
      toast.success(`Città "${name}" aggiunta.`);
    }
    setForm((prev) => ({
      ...prev,
      cities: prev.cities.includes(name) ? prev.cities : [...prev.cities, name],
    }));
    setNewCityName('');
    setShowNewCity(false);
    setSavingCity(false);
  }

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const fileArr = Array.from(files);
      const newUploads: UploadProgress[] = fileArr.map((f) => ({ name: f.name, progress: 0 }));
      setUploads((prev) => [...prev, ...newUploads]);
      const urls: string[] = [];

      await Promise.all(
        fileArr.map((file) =>
          new Promise<void>((resolve, reject) => {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `furniture/${projectId}/${Date.now()}_${safeName}`;
            const sRef = storageRef(storage, path);
            const task = uploadBytesResumable(sRef, file, { contentType: file.type });
            task.on(
              'state_changed',
              (snap) => {
                const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
                setUploads((prev) =>
                  prev.map((u) =>
                    u.name === file.name && u.progress !== 100 ? { ...u, progress: pct } : u
                  )
                );
              },
              reject,
              async () => {
                const url = await getDownloadURL(task.snapshot.ref);
                urls.push(url);
                resolve();
              }
            );
          })
        )
      );

      const updatedImages = [...form.images, ...urls];
      setForm((prev) => ({ ...prev, images: updatedImages }));
      if (!coverImage && updatedImages.length > 0) setCoverImage(updatedImages[0]);
      if (!isNew) await updateFurnitureImages(projectId, updatedImages);
      setUploads([]);
      toast.success(`${fileArr.length} ${fileArr.length === 1 ? 'immagine caricata' : 'immagini caricate'}.`);
    },
    [form.images, coverImage, isNew, projectId]
  );

  const removeImage = async (url: string) => {
    const updated = form.images.filter((u) => u !== url);
    setForm((prev) => ({ ...prev, images: updated }));
    if (coverImage === url) setCoverImage(updated[0] ?? '');
    if (!isNew) await updateFurnitureImages(projectId, updated);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Inserisci il nome dell\'elemento.'); return; }
    if (!form.category) { toast.error('Seleziona una categoria.'); return; }
    if (form.cities.length === 0) { toast.error('Seleziona almeno una città.'); return; }
    setSaving(true);
    const result = await saveFurnitureItem({ ...form, id: isNew ? undefined : projectId });
    setSaving(false);
    if (result.success) {
      if (isNew && result.id) await updateFurnitureImages(result.id, form.images);
      toast.success('Elemento salvato.');
      router.push('/admin/furniture');
    } else {
      toast.error(result.error ?? 'Errore salvataggio.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  if (!adminUser) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      {/* Header */}
      <header
        className="border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}
      >
        <div className="flex items-center gap-4">
          <Link
            href="/admin/furniture"
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
          >
            <ArrowLeft className="size-4" />
            Catalogo Mobili
          </Link>
          <div className="h-4 w-px" style={{ background: 'var(--tqf-beige-border)' }} />
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg" style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
              <Sofa className="size-4" />
            </div>
            <h1 className="text-xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              {isNew ? 'Nuovo Elemento' : 'Modifica Elemento'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 text-sm px-5 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Salva
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)' }}
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Esci</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: metadata */}
        <div className="space-y-5">
          <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <h2 className="text-lg mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              Informazioni
            </h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label style={labelStyle}>Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="es. Sedia Chiavari Oro"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--tqf-bordeaux)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--tqf-beige-border)')}
                />
              </div>

              {/* Category */}
              <div>
                <label style={labelStyle}>Categoria *</label>
                <select
                  value={showNewCategory ? '__new__' : form.category}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      setShowNewCategory(true);
                    } else {
                      set('category', e.target.value);
                      setShowNewCategory(false);
                    }
                  }}
                  style={inputStyle}
                >
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__new__">＋ Aggiungi nuova categoria...</option>
                </select>

                {showNewCategory && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                      placeholder="Nome categoria..."
                      autoFocus
                      style={{ ...inputStyle, flex: 1 }}
                      onFocus={(e) => (e.target.style.borderColor = 'var(--tqf-bordeaux)')}
                      onBlur={(e) => (e.target.style.borderColor = 'var(--tqf-beige-border)')}
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      disabled={savingCategory || !newCategoryName.trim()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-opacity hover:opacity-80 disabled:opacity-40"
                      style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}
                    >
                      {savingCategory ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                      Aggiungi
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }}
                      className="size-9 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70 flex-shrink-0"
                      style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)' }}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Price + Currency */}
              <div>
                <label style={labelStyle}>Prezzo *</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.price === 0 ? '' : form.price}
                    onChange={(e) => set('price', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--tqf-bordeaux)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--tqf-beige-border)')}
                  />
                  <select
                    value={form.currency}
                    onChange={(e) => set('currency', e.target.value as FurnitureCurrency)}
                    style={{ ...inputStyle, width: 'auto', paddingLeft: '0.625rem', paddingRight: '0.625rem' }}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.symbol}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cities */}
              <div>
                <label style={labelStyle}>Disponibile a *</label>

                {/* Selected cities as removable pills */}
                {form.cities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.cities.map((city) => (
                      <span
                        key={city}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                        style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', border: '1px solid var(--tqf-cipria)' }}
                      >
                        {city}
                        <button
                          type="button"
                          onClick={() => toggleCity(city)}
                          className="transition-opacity hover:opacity-60"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Available cities as checkboxes */}
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--tqf-beige-border)' }}>
                  <div className="max-h-40 overflow-y-auto">
                    {availableCities.map((city) => {
                      const selected = form.cities.includes(city);
                      return (
                        <label
                          key={city}
                          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-gray-50"
                          style={{ borderBottom: '1px solid var(--tqf-beige-border)' }}
                        >
                          <div
                            className="size-4 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                            style={{
                              border: selected ? 'none' : '1.5px solid var(--tqf-beige-border)',
                              background: selected ? 'var(--tqf-bordeaux)' : 'white',
                            }}
                            onClick={() => toggleCity(city)}
                          >
                            {selected && <Check className="size-2.5 text-white" strokeWidth={3} />}
                          </div>
                          <span
                            className="text-sm select-none"
                            style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)' }}
                            onClick={() => toggleCity(city)}
                          >
                            {city}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Add new city */}
                  <div className="px-3 py-2.5" style={{ background: 'var(--tqf-beige)' }}>
                    {!showNewCity ? (
                      <button
                        type="button"
                        onClick={() => setShowNewCity(true)}
                        className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
                        style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}
                      >
                        <Plus className="size-3.5" />
                        Aggiungi nuova città...
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCityName}
                          onChange={(e) => setNewCityName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddCity()}
                          placeholder="Nome città..."
                          autoFocus
                          style={{ ...inputStyle, flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}
                          onFocus={(e) => (e.target.style.borderColor = 'var(--tqf-bordeaux)')}
                          onBlur={(e) => (e.target.style.borderColor = 'var(--tqf-beige-border)')}
                        />
                        <button
                          type="button"
                          onClick={handleAddCity}
                          disabled={savingCity || !newCityName.trim()}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-opacity hover:opacity-80 disabled:opacity-40"
                          style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}
                        >
                          {savingCity ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                          Aggiungi
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowNewCity(false); setNewCityName(''); }}
                          className="size-7 flex items-center justify-center rounded-lg flex-shrink-0"
                          style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', background: 'white' }}
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Descrizione</label>
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={3}
                  placeholder="Note opzionali sull'elemento..."
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {/* Published toggle */}
              <div className="flex items-center justify-between pt-2">
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--tqf-dark)' }}>
                  Pubblicato nel catalogo
                </span>
                <button
                  type="button"
                  onClick={() => set('published', !form.published)}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                  style={{ background: form.published ? 'var(--tqf-bordeaux)' : '#d1d5db' }}
                >
                  <span
                    className="inline-block size-4 rounded-full bg-white transition-transform"
                    style={{ transform: form.published ? 'translateX(1.375rem)' : 'translateX(0.25rem)' }}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: images */}
        <div className="space-y-5">
          <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <h2 className="text-lg mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              Immagini
            </h2>

            <div
              className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer p-8"
              style={{ borderColor: 'var(--tqf-cipria)', background: 'var(--tqf-cipria-light)' }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
            >
              <Upload className="size-6" style={{ color: 'var(--tqf-bordeaux)' }} />
              <p className="text-sm text-center" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                Trascina le immagini qui o <span style={{ color: 'var(--tqf-bordeaux)' }}>clicca per caricare</span>
              </p>
              <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                Qualità originale · nessun limite di dimensione
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
              />
            </div>

            {uploads.length > 0 && (
              <div className="mt-4 space-y-2">
                {uploads.map((u, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1" style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-muted)' }}>
                      <span className="truncate max-w-[200px]">{u.name}</span>
                      <span>{u.progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--tqf-beige-border)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${u.progress}%`, background: 'var(--tqf-bordeaux)' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {form.images.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {form.images.map((url) => (
                  <div key={url} className="relative group rounded-xl overflow-hidden" style={{ aspectRatio: '1' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5"
                      style={{ background: 'rgba(26,15,10,0.5)' }}
                    >
                      <button
                        type="button"
                        title="Imposta come principale"
                        onClick={() => setCoverImage(url)}
                        className="size-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                        style={{ background: coverImage === url ? 'var(--tqf-gold)' : 'rgba(255,255,255,0.8)' }}
                      >
                        <Star className="size-3.5" style={{ color: coverImage === url ? 'white' : 'var(--tqf-dark)' }} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(url)}
                        className="size-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                        style={{ background: 'rgba(255,255,255,0.8)' }}
                      >
                        <Trash2 className="size-3.5" style={{ color: '#991b1b' }} />
                      </button>
                    </div>
                    {coverImage === url && (
                      <span
                        className="absolute top-1 left-1 text-xs px-1.5 py-0.5 rounded-full"
                        style={{ background: 'var(--tqf-gold)', color: 'white', fontFamily: 'var(--font-body)' }}
                      >
                        Cover
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
