'use client';
import {
  getPortfolioProject,
  savePortfolioProject,
  updatePortfolioImages,
  type PortfolioProject,
} from '@/actions/portfolio/portfolio-crud';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { storage } from '@/firebase/client';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import {
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  LogOut,
  Save,
  Star,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'indian', label: 'Indian Wedding' },
  { value: 'jewish', label: 'Jewish Wedding' },
  { value: 'persian', label: 'Persian Wedding' },
  { value: 'corporate', label: 'Corporate & Other' },
] as const;

const INPUT_STYLE: React.CSSProperties = {
  background: 'var(--tqf-beige)',
  border: '1px solid var(--tqf-beige-border)',
  color: 'var(--tqf-dark)',
  fontFamily: 'var(--font-body)',
};

const LABEL_STYLE: React.CSSProperties = {
  color: 'var(--tqf-muted)',
  fontFamily: 'var(--font-body)',
};

type UploadingFile = {
  id: string;
  name: string;
  progress: number;
  error?: string;
};

type FormState = {
  title: string;
  category: string;
  location: string;
  year: string;
  description: string;
  published: boolean;
};

const EMPTY_FORM: FormState = {
  title: '',
  category: 'indian',
  location: '',
  year: new Date().getFullYear().toString(),
  description: '',
  published: true,
};

export default function PortfolioEditorPage() {
  const { adminUser, logout } = usePlannerAuth();
  const params = useParams();
  const router = useRouter();

  const rawId = params?.id as string;
  const isNew = rawId === 'new';

  // Stable project ID — generated once for new projects
  const projectIdRef = useRef<string>(
    isNew ? crypto.randomUUID() : rawId
  );
  const projectId = projectIdRef.current;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [images, setImages] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState('');
  const [loadingProject, setLoadingProject] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isNew) return;
    getPortfolioProject(rawId).then((project) => {
      if (!project) {
        toast.error('Progetto non trovato.');
        router.replace('/planner/portfolio');
        return;
      }
      setForm({
        title: project.title,
        category: project.category,
        location: project.location,
        year: project.year,
        description: project.description,
        published: project.published,
      });
      setImages(project.images);
      setCoverImage(project.coverImage);
      setLoadingProject(false);
    });
  }, [isNew, rawId, router]);

  // Upload one file to Firebase Storage — original quality, no compression
  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`"${file.name}" non è un'immagine valida.`);
        return;
      }

      const uploadId = crypto.randomUUID();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `portfolio/${projectId}/${Date.now()}_${safeName}`;
      const storageRef = ref(storage, storagePath);

      setUploading((prev) => [
        ...prev,
        { id: uploadId, name: file.name, progress: 0 },
      ]);

      const task = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
        // customMetadata preserves original filename for reference
        customMetadata: { originalName: file.name },
      });

      task.on(
        'state_changed',
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          setUploading((prev) =>
            prev.map((u) => (u.id === uploadId ? { ...u, progress: pct } : u))
          );
        },
        (err) => {
          setUploading((prev) =>
            prev.map((u) =>
              u.id === uploadId ? { ...u, error: err.message, progress: 0 } : u
            )
          );
          toast.error(`Errore caricamento "${file.name}": ${err.message}`);
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          setImages((prev) => {
            const next = [...prev, url];
            // auto-set first image as cover
            if (prev.length === 0) setCoverImage(url);
            // Persist images to Firestore immediately
            updatePortfolioImages(
              projectId,
              next,
              prev.length === 0 ? url : coverImage
            ).catch(console.error);
            return next;
          });
          setUploading((prev) => prev.filter((u) => u.id !== uploadId));
          toast.success(`"${file.name}" caricata.`);
        }
      );
    },
    [projectId, coverImage]
  );

  if (!adminUser) return null;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleFiles(files: FileList | File[]) {
    Array.from(files).forEach(uploadFile);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }

  async function handleDeleteImage(url: string) {
    if (!confirm('Eliminare questa immagine?')) return;

    // Extract storage path from download URL and delete from Storage
    try {
      const storageRef = ref(storage, url);
      await deleteObject(storageRef).catch(() => {
        // URL may not be a direct ref — attempt to parse path from URL
      });
    } catch {
      // Non-blocking: even if storage delete fails, remove from Firestore
    }

    const next = images.filter((img) => img !== url);
    const nextCover = url === coverImage ? (next[0] ?? '') : coverImage;
    setImages(next);
    setCoverImage(nextCover);
    await updatePortfolioImages(projectId, next, nextCover);
    toast.success('Immagine eliminata.');
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error('Il titolo è obbligatorio.');
      return;
    }
    setSaving(true);
    const result = await savePortfolioProject({
      id: projectId,
      ...form,
      coverImage,
      images,
    });
    setSaving(false);
    if (result.success) {
      toast.success('Progetto salvato.');
      router.push('/planner/portfolio');
    } else {
      toast.error(result.error ?? 'Errore durante il salvataggio.');
    }
  }

  if (loadingProject) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-6 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      {/* Header */}
      <header
        className="border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}
      >
        <div className="flex items-center gap-4">
          <Link
            href="/planner/portfolio"
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
          >
            <ArrowLeft className="size-4" />
            Portfolio
          </Link>
          <div className="h-4 w-px" style={{ background: 'var(--tqf-beige-border)' }} />
          <div className="flex items-center gap-2">
            <div
              className="p-1.5 rounded-lg"
              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}
            >
              <ImageIcon className="size-4" />
            </div>
            <h1
              className="text-xl"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}
            >
              {isNew ? 'Nuovo Progetto' : (form.title || 'Modifica Progetto')}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Salva
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors hover:opacity-80"
            style={{
              color: 'var(--tqf-muted)',
              border: '1px solid var(--tqf-beige-border)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Esci</span>
          </button>
        </div>
      </header>

      {/* Main — two-column layout */}
      <main className="max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-[360px_1fr] gap-6 items-start">

        {/* ── Left: metadata ─────────────────────────────────────── */}
        <div
          className="rounded-2xl p-6 flex flex-col gap-5 sticky top-[88px]"
          style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
        >
          <h2
            className="text-sm uppercase tracking-widest"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
          >
            Informazioni Progetto
          </h2>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-widest" style={LABEL_STYLE}>
              Titolo *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="es. Anjali & Rahul"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2"
              style={{ ...INPUT_STYLE, '--tw-ring-color': 'var(--tqf-cipria)' } as React.CSSProperties}
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-widest" style={LABEL_STYLE}>
              Categoria
            </label>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={INPUT_STYLE}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-widest" style={LABEL_STYLE}>
              Location
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="es. Cancún · Riviera Maya"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={INPUT_STYLE}
            />
          </div>

          {/* Year */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-widest" style={LABEL_STYLE}>
              Anno
            </label>
            <input
              type="text"
              value={form.year}
              onChange={(e) => set('year', e.target.value)}
              placeholder="2024"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={INPUT_STYLE}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-widest" style={LABEL_STYLE}>
              Descrizione
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={4}
              placeholder="Descrizione breve del progetto…"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
              style={INPUT_STYLE}
            />
          </div>

          {/* Published toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                Pubblicato
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                Visibile nel portfolio pubblico
              </p>
            </div>
            <button
              onClick={() => set('published', !form.published)}
              className="relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors"
              style={{
                background: form.published ? 'var(--tqf-bordeaux)' : 'var(--tqf-beige-border)',
              }}
              role="switch"
              aria-checked={form.published}
            >
              <span
                className="inline-block size-5 rounded-full bg-white shadow transition-transform mt-0.5"
                style={{ transform: form.published ? 'translateX(22px)' : 'translateX(2px)' }}
              />
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 text-sm py-2.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Salva Progetto
          </button>
        </div>

        {/* ── Right: image gallery ────────────────────────────────── */}
        <div className="flex flex-col gap-6">

          {/* Drop zone */}
          <div
            onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all select-none"
            style={{
              minHeight: '180px',
              border: `2px dashed ${isDragging ? 'var(--tqf-bordeaux)' : 'var(--tqf-beige-border)'}`,
              background: isDragging ? 'var(--tqf-cipria-light)' : 'white',
              padding: '2rem',
            }}
          >
            <div
              className="size-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}
            >
              <UploadCloud className="size-6" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                Trascina le immagini qui o clicca per selezionare
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                JPG, PNG, WEBP — alta qualità, nessun limite di dimensione
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>

          {/* Upload progress */}
          {uploading.length > 0 && (
            <div
              className="rounded-2xl p-4 flex flex-col gap-3"
              style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
            >
              <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                Caricamento in corso…
              </p>
              {uploading.map((u) => (
                <div key={u.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs truncate max-w-xs" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
                      {u.name}
                    </span>
                    <span className="text-xs shrink-0" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                      {u.error ? '✗' : `${u.progress}%`}
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--tqf-beige-border)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${u.progress}%`,
                        background: u.error ? '#ef4444' : 'var(--tqf-bordeaux)',
                      }}
                    />
                  </div>
                  {u.error && (
                    <p className="text-xs" style={{ color: '#991b1b', fontFamily: 'var(--font-body)' }}>{u.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Uploaded images grid */}
          {images.length > 0 && (
            <div
              className="rounded-2xl p-5 flex flex-col gap-4"
              style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  Galleria ({images.length} {images.length === 1 ? 'immagine' : 'immagini'})
                </p>
                <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  ★ = copertina
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((url, idx) => {
                  const isCover = url === coverImage;
                  return (
                    <div
                      key={url}
                      className="relative group rounded-xl overflow-hidden"
                      style={{
                        aspectRatio: '1',
                        border: isCover
                          ? '2px solid var(--tqf-bordeaux)'
                          : '2px solid transparent',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Foto ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />

                      {/* Overlay on hover */}
                      <div
                        className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(26,15,10,0.55)' }}
                      >
                        {/* Set as cover */}
                        <button
                          onClick={() => {
                            setCoverImage(url);
                            updatePortfolioImages(projectId, images, url).catch(console.error);
                            toast.success('Impostata come copertina.');
                          }}
                          title="Imposta come copertina"
                          className="size-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                          style={{
                            background: isCover ? 'var(--tqf-gold)' : 'white',
                            color: isCover ? 'white' : 'var(--tqf-dark)',
                          }}
                        >
                          <Star className="size-3.5" fill={isCover ? 'currentColor' : 'none'} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteImage(url)}
                          title="Elimina immagine"
                          className="size-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                          style={{ background: '#ef4444', color: 'white' }}
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>

                      {/* Cover badge */}
                      {isCover && (
                        <div
                          className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs"
                          style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
                        >
                          <Star className="size-2.5" fill="currentColor" />
                          Copertina
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {images.length === 0 && uploading.length === 0 && (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
            >
              <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                Nessuna immagine ancora. Trascina o seleziona le foto della galleria qui sopra.
              </p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
