'use client';

import {
  getFlowerItem,
  saveFlowerItem,
  updateFlowerImages,
} from '@/actions/flowers/flowers-crud';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { storage } from '@/firebase/client';
import { FLOWER_CATEGORIES, FlowerCategory, FlowerItem } from '@/lib/planner-types';
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage';
import { ArrowLeft, Flower2, Loader2, LogOut, Star, Trash2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const FLOWER_UNITS = ['stelo', 'mazzo', 'composizione', 'unità'];

const EMPTY: Omit<FlowerItem, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  category: 'rosas',
  price: 0,
  unit: 'stelo',
  images: [],
  description: '',
  published: true,
};

type UploadProgress = { name: string; progress: number };

export default function FlowerEditorPage() {
  const { adminUser, logout } = useAdminAuth();
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id as string;
  const isNew = rawId === 'new';

  const [projectId] = useState(() => isNew ? crypto.randomUUID() : rawId);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [coverImage, setCoverImage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isNew) return;
    getFlowerItem(rawId).then((item) => {
      if (!item) { router.replace('/admin/flowers'); return; }
      const { id: _id, createdAt: _ca, updatedAt: _ua, ...rest } = item;
      setForm(rest);
      setCoverImage(item.images?.[0] ?? '');
      setLoading(false);
    });
  }, [isNew, rawId, router]);

  const set = (field: keyof typeof EMPTY, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

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
            const path = `flowers/${projectId}/${Date.now()}_${safeName}`;
            const sRef = storageRef(storage, path);
            const task = uploadBytesResumable(sRef, file, { contentType: file.type });

            task.on(
              'state_changed',
              (snap) => {
                const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
                setUploads((prev) =>
                  prev.map((u) =>
                    u.name === file.name && u.progress !== 100
                      ? { ...u, progress: pct }
                      : u
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
      if (!isNew) await updateFlowerImages(projectId, updatedImages);
      setUploads([]);
      toast.success(`${fileArr.length} ${fileArr.length === 1 ? 'immagine caricata' : 'immagini caricate'}.`);
    },
    [form.images, coverImage, isNew, projectId]
  );

  const removeImage = async (url: string) => {
    const updated = form.images.filter((u) => u !== url);
    setForm((prev) => ({ ...prev, images: updated }));
    if (coverImage === url) setCoverImage(updated[0] ?? '');
    if (!isNew) await updateFlowerImages(projectId, updated);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Inserisci il nome del fiore.'); return; }
    setSaving(true);
    const result = await saveFlowerItem({ ...form, id: isNew ? undefined : projectId });
    if (result.success && isNew && result.id) {
      await updateFlowerImages(result.id, form.images);
    }
    setSaving(false);
    if (result.success) {
      toast.success('Elemento salvato.');
      router.push('/admin/flowers');
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

  const inputStyle = {
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

  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontFamily: 'var(--font-body)',
    color: 'var(--tqf-muted)',
    marginBottom: '0.375rem',
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      <header
        className="border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}
      >
        <div className="flex items-center gap-4">
          <Link
            href="/admin/flowers"
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
          >
            <ArrowLeft className="size-4" />
            Catalogo Fiori
          </Link>
          <div className="h-4 w-px" style={{ background: 'var(--tqf-beige-border)' }} />
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg" style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
              <Flower2 className="size-4" />
            </div>
            <h1 className="text-xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              {isNew ? 'Nuovo Fiore' : 'Modifica Fiore'}
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
        <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
          <h2 className="text-lg mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
            Informazioni
          </h2>
          <div className="space-y-4">
            <div>
              <label style={labelStyle}>Nome *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="es. Rosa Bianca Premium"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Categoria *</label>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value as FlowerCategory)}
                style={inputStyle}
              >
                {FLOWER_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>Prezzo (MXN) *</label>
                <input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => set('price', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Unità *</label>
                <select
                  value={form.unit}
                  onChange={(e) => set('unit', e.target.value)}
                  style={inputStyle}
                >
                  {FLOWER_UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Descrizione</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={3}
                placeholder="Note opzionali..."
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

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

        {/* Right: images */}
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
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5" style={{ background: 'rgba(26,15,10,0.5)' }}>
                    <button
                      type="button"
                      onClick={() => setCoverImage(url)}
                      className="size-7 rounded-full flex items-center justify-center"
                      style={{ background: coverImage === url ? 'var(--tqf-gold)' : 'rgba(255,255,255,0.8)' }}
                    >
                      <Star className="size-3.5" style={{ color: coverImage === url ? 'white' : 'var(--tqf-dark)' }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      className="size-7 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.8)' }}
                    >
                      <Trash2 className="size-3.5" style={{ color: '#991b1b' }} />
                    </button>
                  </div>
                  {coverImage === url && (
                    <span className="absolute top-1 left-1 text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--tqf-gold)', color: 'white', fontFamily: 'var(--font-body)' }}>
                      Cover
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
