'use client';
import { getArticle } from '@/actions/blog/get-article';
import { createArticle } from '@/actions/blog/create-article';
import { updateArticle } from '@/actions/blog/update-article';
import { deleteArticle } from '@/actions/blog/delete-article';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { storage } from '@/firebase/client';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Loader2,
  LogOut,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const ReactQuill = dynamic(() => import('@/components/shared/ReacQuill'), {
  ssr: false,
  loading: () => (
    <div
      className="h-64 rounded-b-lg animate-pulse"
      style={{ background: 'var(--tqf-beige)' }}
    />
  ),
});

const CATEGORIES = ['Flowers', 'Color', 'Composition', 'Inspiration'] as const;

// Static style objects outside the component so their references never change
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

// Defined outside BlogEditorPage so React never sees a new component type on re-render
function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs uppercase tracking-widest" style={LABEL_STYLE}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
          {hint}
        </p>
      )}
      {error && (
        <p className="text-xs" style={{ color: '#991b1b', fontFamily: 'var(--font-body)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image'],
    ['clean'],
  ],
};

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

type FormState = {
  title: string;
  category: string;
  shortDescription: string;
  content: string;
  slug: string;
  status: 'draft' | 'published';
};

const EMPTY_FORM: FormState = {
  title: '',
  category: 'Flowers',
  shortDescription: '',
  content: '',
  slug: '',
  status: 'draft',
};

export default function BlogEditorPage() {
  const { adminUser, logout } = useAdminAuth();
  const params = useParams();
  const router = useRouter();

  const rawId = params?.id as string;
  const isNew = rawId === 'new';
  const articleId = isNew ? null : rawId;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loadingArticle, setLoadingArticle] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [createdAt, setCreatedAt] = useState<string>(new Date().toISOString());

  const slugManuallyEdited = useRef(false);
  const [inlineUploadProgress, setInlineUploadProgress] = useState<number | null>(null);

  const handleInlineImageUpload = useCallback(async (file: File): Promise<string> => {
    if (!articleId) return '';
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return '';
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageRef = ref(storage, `articles/${articleId}/images/${Date.now()}-${safeName}`);
    const task = uploadBytesResumable(storageRef, file);

    return new Promise((resolve) => {
      setInlineUploadProgress(0);
      task.on(
        'state_changed',
        (snap) => setInlineUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        (err) => {
          toast.error('Image upload failed: ' + err.message);
          setInlineUploadProgress(null);
          resolve('');
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          setInlineUploadProgress(null);
          toast.success('Image inserted.');
          resolve(url);
        }
      );
    });
  }, [articleId]);

  useEffect(() => {
    if (isNew) return;
    getArticle(articleId!).then((article) => {
      if (!article) {
        toast.error('Article not found.');
        router.replace('/admin/blog');
        return;
      }
      setForm({
        title: article.title,
        category: article.category,
        shortDescription: article.shortDescription,
        content: article.content,
        slug: article.slug,
        status: article.status,
      });
      setCreatedAt(article.createdAt);
      slugManuallyEdited.current = true;
      setLoadingArticle(false);
    });
  }, [articleId, isNew, router]);

  if (!adminUser) return null;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleTitleChange(value: string) {
    set('title', value);
    if (!slugManuallyEdited.current) {
      set('slug', generateSlug(value));
    }
  }

  function handleSlugChange(value: string) {
    slugManuallyEdited.current = true;
    set('slug', value.replace(/\s+/g, '-').toLowerCase());
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.title.trim()) next.title = 'Title is required.';
    if (!form.slug.trim()) next.slug = 'Slug is required.';
    if (form.shortDescription.length > 150) {
      next.shortDescription = 'Max 150 characters.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      if (isNew) {
        const result = await createArticle({
          title: form.title.trim(),
          category: form.category,
          shortDescription: form.shortDescription.trim(),
          content: form.content,
          slug: form.slug.trim(),
          status: form.status,
        });
        if (!result.success) {
          toast.error(result.error ?? 'Failed to create article.');
        } else {
          toast.success('Article created.');
          router.replace('/admin/blog');
        }
      } else {
        const result = await updateArticle({
          id: articleId!,
          title: form.title.trim(),
          category: form.category,
          shortDescription: form.shortDescription.trim(),
          content: form.content,
          slug: form.slug.trim(),
          status: form.status,
        });
        if (!result.success) {
          toast.error(result.error ?? 'Failed to save article.');
        } else {
          toast.success('Article saved.');
          router.replace('/admin/blog');
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!articleId) return;
    if (!confirm(`Delete "${form.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    const result = await deleteArticle(articleId);
    if (result.success) {
      toast.success('Article deleted.');
      router.replace('/admin/blog');
    } else {
      toast.error(result.error ?? 'Failed to delete article.');
      setDeleting(false);
    }
  }

  if (loadingArticle) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--tqf-beige)' }}
      >
        <Loader2
          className="size-6 animate-spin"
          style={{ color: 'var(--tqf-bordeaux)' }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      {/* Header */}
      <header
        className="border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}
      >
        <div className="flex items-center gap-4">
          <Link
            href="/admin/blog"
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
          >
            <ArrowLeft className="size-4" />
            All Articles
          </Link>
          <div className="h-4 w-px" style={{ background: 'var(--tqf-beige-border)' }} />
          <div className="flex items-center gap-2">
            <div
              className="p-1.5 rounded-lg"
              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}
            >
              <BookOpen className="size-4" />
            </div>
            <h1
              className="text-xl truncate max-w-xs"
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--tqf-dark)',
                fontWeight: 400,
              }}
            >
              {isNew ? 'New Article' : (form.title || 'Edit Article')}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isNew && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-opacity hover:opacity-70 disabled:opacity-40"
              style={{
                color: '#991b1b',
                border: '1px solid #fecaca',
                background: '#fef2f2',
                fontFamily: 'var(--font-body)',
              }}
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{
              background: 'var(--tqf-bordeaux)',
              color: 'white',
              fontFamily: 'var(--font-body)',
            }}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {saving ? 'Saving…' : 'Save'}
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
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Top card: meta fields */}
        <div
          className="rounded-2xl p-6 space-y-5"
          style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
        >
          {/* Title */}
          <Field label="Title *" error={errors.title}>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Article title"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style={INPUT_STYLE}
              onFocus={(e) => (e.target.style.borderColor = 'var(--tqf-bordeaux)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--tqf-beige-border)')}
            />
          </Field>

          {/* Category + Status row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Category">
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors appearance-none cursor-pointer"
                style={INPUT_STYLE}
                onFocus={(e) => (e.target.style.borderColor = 'var(--tqf-bordeaux)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--tqf-beige-border)')}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <div className="flex gap-4 pt-1">
                {(['draft', 'published'] as const).map((s) => (
                  <label
                    key={s}
                    className="flex items-center gap-2 cursor-pointer select-none"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    <div
                      className="relative size-4 rounded-full border-2 flex items-center justify-center cursor-pointer"
                      style={{
                        borderColor: form.status === s ? 'var(--tqf-bordeaux)' : 'var(--tqf-beige-border)',
                        background: form.status === s ? 'var(--tqf-bordeaux)' : 'white',
                      }}
                      onClick={() => set('status', s)}
                    >
                      {form.status === s && <Check className="size-2.5 text-white" />}
                    </div>
                    <span
                      className="text-sm capitalize"
                      style={{ color: 'var(--tqf-dark)' }}
                      onClick={() => set('status', s)}
                    >
                      {s}
                    </span>
                  </label>
                ))}
              </div>
            </Field>
          </div>

          {/* Date + Slug row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Date" hint="Set automatically on creation">
              <input
                type="text"
                readOnly
                value={new Date(createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none opacity-60 cursor-default"
                style={INPUT_STYLE}
              />
            </Field>

            <Field
              label="URL Slug *"
              error={errors.slug}
              hint="Auto-generated from title, but editable"
            >
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--tqf-beige-border)' }}>
                <span
                  className="px-3 py-2.5 text-sm border-r select-none flex-shrink-0"
                  style={{
                    background: 'var(--tqf-beige-dark)',
                    color: 'var(--tqf-muted)',
                    borderColor: 'var(--tqf-beige-border)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  /blog/
                </span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="url-slug"
                  className="flex-1 px-3 py-2.5 text-sm outline-none"
                  style={{
                    background: 'var(--tqf-beige)',
                    color: 'var(--tqf-dark)',
                    fontFamily: 'var(--font-body)',
                    border: 'none',
                  }}
                  onFocus={(e) => {
                    const wrapper = e.target.closest('div') as HTMLElement;
                    if (wrapper) wrapper.style.borderColor = 'var(--tqf-bordeaux)';
                  }}
                  onBlur={(e) => {
                    const wrapper = e.target.closest('div') as HTMLElement;
                    if (wrapper) wrapper.style.borderColor = 'var(--tqf-beige-border)';
                  }}
                />
              </div>
            </Field>
          </div>

          {/* Short Description */}
          <Field
            label="Short Description"
            error={errors.shortDescription}
            hint="Shown on blog cards on the homepage. Max 150 characters."
          >
            <div className="relative">
              <textarea
                value={form.shortDescription}
                onChange={(e) => set('shortDescription', e.target.value)}
                rows={3}
                maxLength={160}
                placeholder="A brief summary of the article…"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors resize-none"
                style={INPUT_STYLE}
                onFocus={(e) => (e.target.style.borderColor = 'var(--tqf-bordeaux)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--tqf-beige-border)')}
              />
              <span
                className="absolute bottom-2 right-3 text-xs pointer-events-none"
                style={{
                  color: form.shortDescription.length > 150 ? '#991b1b' : 'var(--tqf-muted)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {form.shortDescription.length}/150
              </span>
            </div>
          </Field>
        </div>

        {/* Content card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
        >
          <div
            className="px-6 py-3 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--tqf-beige-border)' }}
          >
            <span
              className="text-xs uppercase tracking-widest"
              style={LABEL_STYLE}
            >
              Full Content
            </span>
            {inlineUploadProgress !== null && (
              <div className="flex items-center gap-2">
                <div
                  className="h-1 w-24 rounded-full overflow-hidden"
                  style={{ background: 'var(--tqf-beige-border)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{ width: `${inlineUploadProgress}%`, background: 'var(--tqf-bordeaux)' }}
                  />
                </div>
                <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  {inlineUploadProgress}%
                </span>
              </div>
            )}
          </div>
          <div className="min-h-[400px]">
            <ReactQuill
              value={form.content}
              onChange={(html) => set('content', html)}
              modules={QUILL_MODULES}
              placeholder="Write the full article content here…"
              onImageUpload={isNew ? undefined : handleInlineImageUpload}
            />
          </div>
          {isNew && (
            <p
              className="px-6 pb-4 text-xs"
              style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
            >
              Save the article first to enable image uploads in the editor.
            </p>
          )}
        </div>

        {/* Bottom save/delete */}
        <div className="flex items-center justify-between pb-8">
          <Link
            href="/admin/blog"
            className="text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
          >
            ← Back to articles
          </Link>

          <div className="flex items-center gap-3">
            {!isNew && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-70 disabled:opacity-40"
                style={{
                  color: '#991b1b',
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                Delete Article
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 text-sm px-5 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{
                background: 'var(--tqf-bordeaux)',
                color: 'white',
                fontFamily: 'var(--font-body)',
              }}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {saving ? 'Saving…' : 'Save Article'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
