'use client';

import {
  deleteInspirationItem,
  saveInspirationItem,
  type InspirationItem,
} from '@/actions/flowers/inspiration-crud';
import {
  renameInspirationCategory,
  deleteInspirationCategory,
} from '@/actions/flowers/inspiration-categories';
import type { PortfolioProject } from '@/actions/portfolio/portfolio-crud';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import AccessDenied from '@/components/planner/AccessDenied';
import ReadOnlyBanner from '@/components/planner/ReadOnlyBanner';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useI18n } from '@/hooks/useI18n';
import { db, storage } from '@/firebase/client';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
  ArrowLeft, Check, Flower2, FolderCog, ImagePlus, Loader2, LogOut,
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
  const { t } = useI18n();
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
                <ArrowLeft className="size-4" /> {t('flowers_weddings')}
              </button>
              <div className="h-4 w-px" style={{ background: 'var(--tqf-beige-border)' }} />
              <h3 className="text-base" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
                {selectedProject.title || t('flowers_untitled')}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
                {t('portfolio_photos', { n: images.length })}
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
                  {t('flowers_noImages')}
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
              {t('flowers_selectFromPortfolio')}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
              {t('flowers_weddingCount', { n: projects.length })}
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
                {t('flowers_noProjects')}
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
                          {t('portfolio_photos', { n: imgCount })}
                        </span>
                      </div>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-sm leading-tight"
                        style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
                        {project.title || t('flowers_untitled')}
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
  const { t } = useI18n();
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
              {t('flowers_categoryLabel')}
            </label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
              <option value="">{t('flowers_categoryPlaceholder')}</option>
              {allCats.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="__custom__">{t('flowers_newCategory')}</option>
            </select>
            {useCustom && (
              <input
                className="mt-2"
                placeholder={t('flowers_newCategoryName')}
                value={customCat}
                onChange={e => setCustomCat(e.target.value)}
                style={inputStyle}
              />
            )}
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {t('flowers_titleLabel')}
            </label>
            <input placeholder={t('flowers_examplePlaceholder')} value={titleValue}
              onChange={e => setTitleValue(e.target.value)} style={inputStyle} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-sm transition-opacity hover:opacity-70"
              style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {t('cancel')}
            </button>
            <button type="button"
              disabled={!finalCategory || saving}
              onClick={() => onSave(finalCategory, titleValue)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {t('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminFlowersPage() {
  const { adminUser, logout, canManageCatalogs, permissions, isLoading } = usePlannerAuth();
  const { t } = useI18n();

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
  const [showCatManager, setShowCatManager] = useState(false);

  // Reflect a category rename/merge/delete in local state so the board updates
  // immediately without a full reload.
  const applyCategoryReassign = (from: string, to: string) => {
    setItems(prev => prev.map(i => (i.category === from ? { ...i, category: to } : i)));
    setCatFilter(cur => (cur === from ? 'all' : cur));
  };

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

  // BUG-09 fix: replaced `return null` with proper access control.
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
      <div className="size-8 animate-spin rounded-full border-2 border-[var(--tqf-bordeaux)] border-t-transparent" />
    </div>
  );
  if (!adminUser && !canManageCatalogs) return <AccessDenied />;

  const canEdit = permissions.florals.canEdit;
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
      toast.success(t('flowers_added'));
    } else {
      toast.error(t('flowers_saveError'));
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
      toast.success(t('flowers_categoryUpdated'));
    } else {
      toast.error(t('flowers_categoryUpdateError'));
    }
    setSavingItem(false);
    setEditingItem(null);
  };

  const handleDelete = async (item: InspirationItem) => {
    if (!confirm(t('flowers_removeConfirm', { cat: item.category }))) return;
    setDeletingId(item.id);
    const result = await deleteInspirationItem(item.id);
    if (result.success) {
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast.success(t('flowers_removed'));
    } else toast.error(t('flowers_deleteError'));
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
      toast.error(t('flowers_uploadError'));
    }
    setUploading(false);
    if (uploadRef.current) uploadRef.current.value = '';
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>

      {/* PART-2: show banner when user can view but not edit */}
      {!canEdit && <ReadOnlyBanner />}

      {/* ── Header ── */}
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
              <Flower2 className="size-4" />
            </div>
            <h1 className="text-xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              {t('flowers_title')}
            </h1>
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
                {cat === 'all' ? t('flowers_allFilter', { n: items.length }) : `${cat} (${grouped[cat]?.length ?? 0})`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {canEdit && categories.length > 0 && (
              <button type="button" onClick={() => setShowCatManager(true)}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
                style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', background: 'white', fontFamily: 'var(--font-body)' }}>
                <FolderCog className="size-4" />
                <span className="hidden sm:inline">{t('flowers_manageCategories')}</span>
              </button>
            )}
            <button type="button" onClick={() => uploadRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ border: '1px solid var(--tqf-cipria)', color: 'var(--tqf-bordeaux)', background: 'var(--tqf-cipria-light)', fontFamily: 'var(--font-body)' }}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {t('flowers_uploadImage')}
            </button>
            <input ref={uploadRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => handleDirectUpload(e.target.files)} />
            <button type="button" onClick={openPicker}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
              <ImagePlus className="size-4" />
              {t('flowers_fromPortfolio')}
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
              {t('flowers_emptyTitle')}
            </h2>
            <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {t('flowers_emptyDesc')}
            </p>
            <button type="button" onClick={openPicker}
              className="inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
              <ImagePlus className="size-4" />
              {t('flowers_selectFromPortfolio')}
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
          title={t('flowers_addToInspiration')}
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
          title={t('flowers_editCategory')}
        />
      )}

      {showCatManager && (
        <CategoryManagerModal
          categories={categories}
          counts={grouped}
          onReassign={applyCategoryReassign}
          onClose={() => setShowCatManager(false)}
        />
      )}
    </div>
  );
}

// ── Category Manager Modal ────────────────────────────────────────────────────
// Rename / merge / delete inspiration categories. Adapted from furniture's
// manager to the simpler string-based model (no bilingual labels).
type CatAction = { type: 'rename' | 'merge' | 'delete'; cat: string };

function CategoryManagerModal({
  categories,
  counts,
  onReassign,
  onClose,
}: {
  categories: string[];
  counts: Record<string, InspirationItem[]>;
  onReassign: (from: string, to: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [action, setAction] = useState<CatAction | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [busy, setBusy] = useState(false);

  const countFor = (cat: string) => counts[cat]?.length ?? 0;
  const others = (cat: string) => categories.filter(c => c !== cat);

  const startRename = (cat: string) => { setAction({ type: 'rename', cat }); setRenameValue(cat); };
  const startMerge = (cat: string) => {
    const opts = others(cat);
    if (opts.length === 0) { toast.error(t('flowers_catNoOthers')); return; }
    setAction({ type: 'merge', cat }); setTargetValue(opts[0]);
  };
  const startDelete = (cat: string) => {
    const opts = others(cat);
    if (opts.length === 0) { toast.error(t('flowers_catNoOthers')); return; }
    setAction({ type: 'delete', cat }); setTargetValue(opts[0]);
  };
  const cancel = () => setAction(null);

  const confirmRename = async () => {
    if (!action) return;
    const to = renameValue.trim();
    if (!to || to === action.cat) { cancel(); return; }
    if (categories.some(c => c !== action.cat && c.toLowerCase() === to.toLowerCase())) {
      toast.error(t('flowers_catNameExists')); return;
    }
    setBusy(true);
    const res = await renameInspirationCategory(action.cat, to);
    setBusy(false);
    if (res.success) {
      onReassign(action.cat, to);
      toast.success(t('flowers_catRenamed', { name: to, n: res.moved }));
      cancel();
    } else {
      toast.error(res.error ?? t('flowers_catError'));
    }
  };

  const confirmMerge = async () => {
    if (!action) return;
    const to = targetValue;
    setBusy(true);
    const res = await renameInspirationCategory(action.cat, to);
    setBusy(false);
    if (res.success) {
      onReassign(action.cat, to);
      toast.success(t('flowers_catMerged', { name: to, n: res.moved }));
      cancel();
    } else {
      toast.error(res.error ?? t('flowers_catError'));
    }
  };

  const confirmDelete = async () => {
    if (!action) return;
    const to = targetValue;
    setBusy(true);
    const res = await deleteInspirationCategory(action.cat, to);
    setBusy(false);
    if (res.success) {
      onReassign(action.cat, to);
      toast.success(t('flowers_catDeleted', { name: to, n: res.moved }));
      cancel();
    } else {
      toast.error(res.error ?? t('flowers_catError'));
    }
  };

  const btnSm: React.CSSProperties = {
    fontSize: '0.72rem', padding: '0.2rem 0.55rem', borderRadius: '0.4rem',
    fontFamily: 'var(--font-body)', border: '1px solid var(--tqf-beige-border)',
    background: 'white', color: 'var(--tqf-muted)', cursor: 'pointer',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: 'white' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--tqf-beige-border)' }}>
          <div>
            <h2 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              {t('flowers_manageCategoriesTitle')}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {t('flowers_manageCategoriesDesc')}
            </p>
          </div>
          <button onClick={onClose} className="size-8 flex items-center justify-center rounded-lg hover:opacity-70"
            style={{ color: 'var(--tqf-muted)' }}>
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3">
          {categories.map(cat => (
            <div key={cat} className="rounded-xl mb-2" style={{ border: '1px solid var(--tqf-beige-border)' }}>
              <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm truncate" style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>{cat}</p>
                  <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                    {t('flowers_catItemCount', { n: countFor(cat) })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button style={btnSm} onClick={() => startRename(cat)}>{t('flowers_catRename')}</button>
                  <button style={btnSm} onClick={() => startMerge(cat)}>{t('flowers_catMerge')}</button>
                  <button style={{ ...btnSm, color: '#991b1b', borderColor: '#f3d0d0' }} onClick={() => startDelete(cat)}>{t('flowers_catDelete')}</button>
                </div>
              </div>

              {action?.cat === cat && (
                <div className="px-3 pb-3 pt-1" style={{ borderTop: '1px solid var(--tqf-beige-border)' }}>
                  {action.type === 'rename' && (
                    <>
                      <label className="block text-xs mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t('flowers_catRenameTitle', { cat })}</label>
                      <input type="text" value={renameValue} autoFocus
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && confirmRename()}
                        placeholder={t('flowers_catNewName')} style={inputStyle} />
                    </>
                  )}
                  {(action.type === 'merge' || action.type === 'delete') && (
                    <>
                      <label className="block text-xs mb-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                        {action.type === 'merge' ? t('flowers_catMergeTitle', { cat }) : t('flowers_catDeleteTitle', { cat })}
                      </label>
                      <select value={targetValue} onChange={e => setTargetValue(e.target.value)} style={inputStyle}>
                        {others(cat).map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={action.type === 'rename' ? confirmRename : action.type === 'merge' ? confirmMerge : confirmDelete}
                      disabled={busy}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40"
                      style={{ background: action.type === 'delete' ? '#991b1b' : 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
                      {busy ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                      {t('flowers_catSave')}
                    </button>
                    <button onClick={cancel} className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)', background: 'white', fontFamily: 'var(--font-body)' }}>
                      {t('flowers_catCancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
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
