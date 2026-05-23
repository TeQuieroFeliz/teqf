'use client';

import {
  deleteInspirationItem,
  saveInspirationItem,
  type InspirationItem,
} from '@/actions/flowers/inspiration-crud';
import type { PortfolioProject } from '@/actions/portfolio/portfolio-crud';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { db, storage } from '@/firebase/client';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
  ArrowLeft, Check, Flower2, ImagePlus, Loader2, LogOut,
  Pencil, Sparkles, Trash2, Upload, X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const DEFAULT_CATEGORIES = [
  'Sangeet', 'Ceremony', 'Reception',
  'Gazebo', 'Centrotavola', 'Bouquet', 'Arco',
  'Tavolo Imperiale', 'Allestimento', 'Altro',
];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.45rem 0.65rem', borderRadius: '0.5rem',
  border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)',
  fontSize: '0.85rem', color: 'var(--tqf-dark)', background: 'white', outline: 'none',
};

// ── Portfolio Picker Modal ────────────────────────────────────────────────────
function PortfolioPicker({
  projects,
  onSelect,
  onClose,
}: {
  projects: PortfolioProject[];
  onSelect: (imageUrl: string) => void;
  onClose: () => void;
}) {
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null);

  if (selectedProject) {
    const images = Array.from(new Set([
      ...(selectedProject.coverImage ? [selectedProject.coverImage] : []),
      ...(selectedProject.images ?? []),
    ]));

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
        <div className="w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col"
          style={{ background: 'white', maxHeight: '88vh' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: 'var(--tqf-beige-border)' }}>
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedProject(null)}
                className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
                style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <ArrowLeft className="size-4" /> Matrimoni
              </button>
              <div className="h-4 w-px" style={{ background: 'var(--tqf-beige-border)' }} />
              <h3 className="text-base" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
                {selectedProject.title || 'Senza titolo'}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                {images.length} foto
              </span>
            </div>
            <button onClick={onClose} className="size-8 flex items-center justify-center rounded-lg hover:opacity-70"
              style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)' }}>
              <X className="size-4" />
            </button>
          </div>
          <div className="overflow-y-auto p-4">
            {images.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  Nessuna immagine in questo matrimonio
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {images.map((url, i) => (
                  <button key={i} type="button"
                    onClick={() => onSelect(url)}
                    className="group relative rounded-xl overflow-hidden transition-all hover:scale-[1.02] hover:shadow-md"
                    style={{ aspectRatio: '1', border: '2px solid transparent' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(92,26,40,0.7)' }}>
                      <Check className="size-5 text-white" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Projects list
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'white', maxHeight: '88vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--tqf-beige-border)' }}>
          <div className="flex items-center gap-2">
            <ImagePlus className="size-4" style={{ color: 'var(--tqf-bordeaux)' }} />
            <h3 className="text-base" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              Seleziona dal Portfolio
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
              {projects.length} matrimoni
            </span>
          </div>
          <button onClick={onClose} className="size-8 flex items-center justify-center rounded-lg hover:opacity-70"
            style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)' }}>
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-4">
          {projects.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                Nessun progetto nel portfolio
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {projects.map(project => {
                const cover = project.coverImage || project.images?.[0];
                const imgCount = Array.from(new Set([
                  ...(project.coverImage ? [project.coverImage] : []),
                  ...(project.images ?? []),
                ])).length;
                return (
                  <button key={project.id} type="button"
                    onClick={() => setSelectedProject(project)}
                    className="group rounded-xl overflow-hidden text-left transition-all hover:shadow-md hover:scale-[1.01]"
                    style={{ border: '1px solid var(--tqf-beige-border)', background: 'white' }}>
                    <div className="relative" style={{ aspectRatio: '4/3', overflow: 'hidden', background: 'var(--tqf-cipria-light)' }}>
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt={project.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImagePlus className="size-6" style={{ color: 'var(--tqf-cipria)' }} />
                        </div>
                      )}
                      <div className="absolute bottom-1.5 right-1.5">
                        <span className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(0,0,0,0.55)', color: 'white', fontFamily: 'var(--font-body)', backdropFilter: 'blur(4px)' }}>
                          {imgCount} foto
                        </span>
                      </div>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-sm leading-tight"
                        style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
                        {project.title || 'Senza titolo'}
                      </p>
                      {project.location && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                          {project.location}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Category Form (shared by Add and Edit) ────────────────────────────────────
function CategoryForm({
  imageUrl,
  initialCategory,
  initialTitle,
  existingCategories,
  onSave,
  onCancel,
  saving,
  title: modalTitle,
}: {
  imageUrl: string;
  initialCategory?: string;
  initialTitle?: string;
  existingCategories: string[];
  onSave: (category: string, title: string) => void;
  onCancel: () => void;
  saving: boolean;
  title: string;
}) {
  const allCats = Array.from(new Set([...DEFAULT_CATEGORIES, ...existingCategories])).sort();
  const [category, setCategory] = useState(initialCategory ?? '');
  const [customCat, setCustomCat] = useState('');
  const [titleValue, setTitleValue] = useState(initialTitle ?? '');
  const useCustom = category === '__custom__';
  const finalCategory = useCustom ? customCat.trim() : category;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--tqf-beige-border)' }}>
          <h3 className="text-base" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
            {modalTitle}
          </h3>
          <button onClick={onCancel} className="size-7 flex items-center justify-center rounded-lg hover:opacity-70"
            style={{ color: 'var(--tqf-muted)' }}>
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Categoria *
            </label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
              <option value="">Scegli categoria...</option>
              {allCats.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="__custom__">+ Nuova categoria...</option>
            </select>
            {useCustom && (
              <input
                className="mt-2"
                placeholder="Nome nuova categoria"
                value={customCat}
                onChange={e => setCustomCat(e.target.value)}
                style={inputStyle}
              />
            )}
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Titolo <span style={{ opacity: 0.5 }}>(opzionale)</span>
            </label>
            <input placeholder="es. Gazebo romantico con glicine" value={titleValue}
              onChange={e => setTitleValue(e.target.value)} style={inputStyle} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-sm transition-opacity hover:opacity-70"
              style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Annulla
            </button>
            <button type="button"
              disabled={!finalCategory || saving}
              onClick={() => onSave(finalCategory, titleValue)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminFlowersPage() {
  const { adminUser, logout } = useAdminAuth();

  const [items, setItems] = useState<InspirationItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [catFilter, setCatFilter] = useState('all');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [portfolioProjects, setPortfolioProjects] = useState<PortfolioProject[]>([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<InspirationItem | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getDocs(query(collection(db, 'floralInspiration'), orderBy('createdAt', 'desc')))
      .then((snap) =>
        setItems(snap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            imageUrl: d.imageUrl ?? '',
            category: d.category ?? '',
            title: d.title ?? '',
            published: d.published ?? false,
            createdAt: d.createdAt?.toDate?.().toISOString() ?? d.createdAt ?? '',
          } as InspirationItem;
        }))
      )
      .finally(() => setLoadingItems(false));
  }, []);

  if (!adminUser) return null;

  const categories = Array.from(new Set(items.map(i => i.category))).sort();
  const filtered = catFilter === 'all' ? items : items.filter(i => i.category === catFilter);
  const grouped = categories.reduce<Record<string, InspirationItem[]>>((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat);
    return acc;
  }, {});

  const openPicker = async () => {
    setPickerOpen(true);
    if (portfolioProjects.length === 0) {
      setLoadingPortfolio(true);
      const snap = await getDocs(query(collection(db, 'portfolioProjects'), orderBy('createdAt', 'desc')));
      const projects: PortfolioProject[] = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as PortfolioProject));
      setPortfolioProjects(projects);
      setLoadingPortfolio(false);
    }
  };

  const handleSelectImage = (imageUrl: string) => {
    setPickerOpen(false);
    setSelectedImage(imageUrl);
  };

  const handleSaveItem = async (category: string, title: string) => {
    if (!selectedImage) return;
    setSavingItem(true);
    const result = await saveInspirationItem({ imageUrl: selectedImage, category, title, published: true });
    if (result.success) {
      const newItem: InspirationItem = {
        id: result.id!,
        imageUrl: selectedImage,
        category,
        title,
        published: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setItems(prev => [newItem, ...prev]);
      toast.success('Aggiunto al catalogo ispirazione.');
    } else {
      toast.error('Errore salvataggio.');
    }
    setSavingItem(false);
    setSelectedImage(null);
  };

  const handleEditItem = async (category: string, title: string) => {
    if (!editingItem) return;
    setSavingItem(true);
    const result = await saveInspirationItem({
      id: editingItem.id,
      imageUrl: editingItem.imageUrl,
      category,
      title,
      published: editingItem.published,
    });
    if (result.success) {
      setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, category, title } : i));
      toast.success('Categoria aggiornata.');
    } else {
      toast.error('Errore aggiornamento.');
    }
    setSavingItem(false);
    setEditingItem(null);
  };

  const handleDelete = async (item: InspirationItem) => {
    if (!confirm(`Rimuovere questa foto dalla categoria "${item.category}"?`)) return;
    setDeletingId(item.id);
    const result = await deleteInspirationItem(item.id);
    if (result.success) {
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast.success('Rimosso.');
    } else toast.error('Errore eliminazione.');
    setDeletingId(null);
  };

  const handleDirectUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `flowers/inspiration/${Date.now()}_${i}_${safe}`;
        const sRef = storageRef(storage, path);
        await new Promise<void>((res, rej) => {
          const task = uploadBytesResumable(sRef, file, { contentType: file.type });
          task.on('state_changed', () => {}, rej, async () => {
            const url = await getDownloadURL(task.snapshot.ref);
            setSelectedImage(url);
            res();
          });
        });
      }
    } catch {
      toast.error('Errore upload immagine.');
    }
    setUploading(false);
    if (uploadRef.current) uploadRef.current.value = '';
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>

      {/* ── Header ── */}
      <header className="border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}>
        <div className="flex items-center gap-4">
          <Link href="/admin" className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
            <ArrowLeft className="size-4" /> Dashboard
          </Link>
          <div className="h-4 w-px" style={{ background: 'var(--tqf-beige-border)' }} />
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg" style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
              <Flower2 className="size-4" />
            </div>
            <h1 className="text-xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              Ispirazione Floreale
            </h1>
          </div>
        </div>
        <button onClick={logout}
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg hover:opacity-80"
          style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)' }}>
          <LogOut className="size-4" />
          <span className="hidden sm:inline">Esci</span>
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap gap-2">
            {['all', ...categories].map(cat => (
              <button key={cat} type="button" onClick={() => setCatFilter(cat)}
                className="text-xs px-3 py-1.5 rounded-full transition-all"
                style={catFilter === cat
                  ? { background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }
                  : { background: 'white', color: 'var(--tqf-bordeaux)', border: '1px solid var(--tqf-cipria)', fontFamily: 'var(--font-body)' }
                }>
                {cat === 'all' ? `Tutte (${items.length})` : `${cat} (${grouped[cat]?.length ?? 0})`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => uploadRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ border: '1px solid var(--tqf-cipria)', color: 'var(--tqf-bordeaux)', background: 'var(--tqf-cipria-light)', fontFamily: 'var(--font-body)' }}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Carica immagine
            </button>
            <input ref={uploadRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => handleDirectUpload(e.target.files)} />
            <button type="button" onClick={openPicker}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
              <ImagePlus className="size-4" />
              Da Portfolio
            </button>
          </div>
        </div>

        {/* Content */}
        {loadingItems ? (
          <div className="flex justify-center py-24">
            <Loader2 className="size-6 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl p-16 text-center" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
            <div className="mx-auto mb-4 size-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}>
              <Sparkles className="size-7" />
            </div>
            <h2 className="text-xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              Galleria vuota
            </h2>
            <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Seleziona foto dal portfolio o carica nuove immagini per iniziare a costruire la galleria ispirazione.
            </p>
            <button type="button" onClick={openPicker}
              className="inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
              <ImagePlus className="size-4" />
              Seleziona dal Portfolio
            </button>
          </div>
        ) : catFilter === 'all' ? (
          <div className="space-y-10">
            {categories.map(cat => (
              <div key={cat}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontWeight: 400 }}>
                    {cat}
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                    {grouped[cat]?.length ?? 0}
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'var(--tqf-beige-border)' }} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {(grouped[cat] ?? []).map(item => (
                    <InspirationCard key={item.id} item={item}
                      onDelete={() => handleDelete(item)}
                      onEdit={() => setEditingItem(item)}
                      deletingId={deletingId} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtered.map(item => (
              <InspirationCard key={item.id} item={item}
                onDelete={() => handleDelete(item)}
                onEdit={() => setEditingItem(item)}
                deletingId={deletingId} />
            ))}
          </div>
        )}
      </main>

      {/* ── Portfolio Picker Modal ── */}
      {pickerOpen && (
        loadingPortfolio ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.5)' }}>
            <Loader2 className="size-8 animate-spin text-white" />
          </div>
        ) : (
          <PortfolioPicker
            projects={portfolioProjects}
            onSelect={handleSelectImage}
            onClose={() => setPickerOpen(false)}
          />
        )
      )}

      {/* ── Add Item Form ── */}
      {selectedImage && !editingItem && (
        <CategoryForm
          imageUrl={selectedImage}
          existingCategories={categories}
          onSave={handleSaveItem}
          onCancel={() => setSelectedImage(null)}
          saving={savingItem}
          title="Aggiungi all'ispirazione"
        />
      )}

      {/* ── Edit Item Form ── */}
      {editingItem && (
        <CategoryForm
          imageUrl={editingItem.imageUrl}
          initialCategory={editingItem.category}
          initialTitle={editingItem.title}
          existingCategories={categories}
          onSave={handleEditItem}
          onCancel={() => setEditingItem(null)}
          saving={savingItem}
          title="Modifica categoria"
        />
      )}
    </div>
  );
}

// ── Inspiration Card ──────────────────────────────────────────────────────────
function InspirationCard({
  item, onDelete, onEdit, deletingId,
}: {
  item: InspirationItem;
  onDelete: () => void;
  onEdit: () => void;
  deletingId: string | null;
}) {
  return (
    <div className="group relative rounded-xl overflow-hidden"
      style={{ aspectRatio: '3/4', border: '1px solid var(--tqf-beige-border)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.imageUrl} alt={item.title || item.category}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      <div className="absolute inset-0 flex flex-col justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.6) 100%)' }}>
        <div className="flex justify-end gap-1.5">
          <button onClick={onEdit}
            className="size-7 flex items-center justify-center rounded-lg transition-opacity hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--tqf-bordeaux)' }}>
            <Pencil className="size-3" />
          </button>
          <button onClick={onDelete} disabled={deletingId === item.id}
            className="size-7 flex items-center justify-center rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.9)', color: '#991b1b' }}>
            {deletingId === item.id ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
          </button>
        </div>
        <div>
          <span className="inline-block text-xs px-2 py-0.5 rounded-full mb-1"
            style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
            {item.category}
          </span>
          {item.title && (
            <p className="text-xs leading-snug"
              style={{ color: 'white', fontFamily: 'var(--font-body)', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
              {item.title}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
