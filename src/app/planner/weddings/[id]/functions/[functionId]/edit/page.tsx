'use client';

import { getFunction, updateFunction, addFileToFunction, removeFileFromFunction, updateInspirationCaption } from '@/actions/weddings/functions';
import {
  FunctionForm,
  FUNCTION_TR,
  FnLangKey,
  FunctionFormData,
  initialFormData,
  validateForm,
  LBL_STYLE,
  INPUT_STYLE,
} from '@/app/planner/weddings/[id]/_FunctionForm';
import { LanguageSelector } from '@/components/LanguageSelector';
import AccessDenied from '@/components/planner/AccessDenied';
import { useLangContext } from '@/context/LangContext';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { deleteFromStorage, uploadToStorage, MIME_IMAGE, MIME_PDF_IMAGE, MAX_20MB, MAX_10MB } from '@/lib/storage-upload';
import { FileRecord, InspirationPhoto, WeddingFunction } from '@/lib/wedding-types';
import {
  ArrowLeft, Edit2, FileText, Image as ImageIcon, Loader2, LogOut, Plus, Save, Trash2, X,
} from 'lucide-react';
import NextImage from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// ── File section ──────────────────────────────────────────────────────────────

type FileArrayKey = 'layoutFiles' | 'moodboardFiles';

function FileUploadSection({
  weddingId, functionId, arrayKey, files, label, accept, allowedTypes, maxSize, lang,
  onFilesChange,
}: {
  weddingId: string; functionId: string; arrayKey: FileArrayKey;
  files: FileRecord[]; label: string; accept: string; allowedTypes: string[]; maxSize: number; lang: string;
  onFilesChange: (files: FileRecord[]) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const { v4: uuidv4 } = await import('uuid');
      const result = await uploadToStorage(file, `weddings/${weddingId}/functions/${functionId}/${arrayKey}`, {
        maxSizeBytes: maxSize, allowedMimeTypes: allowedTypes,
      });
      const record: FileRecord = { id: uuidv4(), ...result, uploadedAt: new Date().toISOString() };
      const res = await addFileToFunction(weddingId, functionId, arrayKey, record);
      if (res.success) {
        onFilesChange([...files, record]);
        toast.success(lang === 'es' ? 'Archivo subido.' : 'File uploaded.');
      } else {
        toast.error(res.error ?? 'Upload failed.');
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(f: FileRecord) {
    const res = await removeFileFromFunction(weddingId, functionId, arrayKey, f.id);
    if (res.success) {
      if (res.storagePath) await deleteFromStorage(res.storagePath);
      onFilesChange(files.filter(x => x.id !== f.id));
    } else {
      toast.error(res.error ?? 'Failed to remove.');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label style={LBL_STYLE}>{label}</label>
        <label className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg cursor-pointer transition-opacity ${uploading ? 'opacity-50 pointer-events-none' : 'hover:opacity-80'}`}
          style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
          {uploading ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
          {lang === 'es' ? 'Subir' : 'Upload'}
          <input type="file" accept={accept} className="hidden" disabled={uploading}
            onChange={e => handleUpload(e.target.files?.[0])} />
        </label>
      </div>
      {files.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
          {lang === 'es' ? 'Sin archivos.' : 'No files uploaded.'}
        </p>
      ) : (
        <div className="space-y-1.5">
          {files.map(f => (
            <div key={f.id} className="flex items-center gap-2 px-2.5 py-2 rounded-xl"
              style={{ background: '#fafafa', border: '1px solid var(--tqf-beige-border)' }}>
              <FileText className="size-4 flex-shrink-0" style={{ color: 'var(--tqf-bordeaux)' }} />
              <a href={f.url} target="_blank" rel="noopener noreferrer"
                className="flex-1 text-xs truncate hover:underline"
                style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', textDecoration: 'none' }}>
                {f.fileName}
              </a>
              <button onClick={() => handleRemove(f)}
                className="size-6 flex items-center justify-center rounded-lg transition-opacity hover:opacity-80"
                style={{ color: '#991b1b', background: '#fef2f2' }}>
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inspiration photos ────────────────────────────────────────────────────────

function InspirationSection({
  weddingId, functionId, photos, lang,
  onPhotosChange,
}: {
  weddingId: string; functionId: string; photos: InspirationPhoto[]; lang: string;
  onPhotosChange: (photos: InspirationPhoto[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [editCaption, setEditCaption] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');

  async function handleUpload(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const { v4: uuidv4 } = await import('uuid');
      const result = await uploadToStorage(file, `weddings/${weddingId}/functions/${functionId}/inspiration`, {
        maxSizeBytes: MAX_10MB, allowedMimeTypes: MIME_IMAGE,
      });
      const photo: InspirationPhoto = { id: uuidv4(), ...result, caption: '', uploadedAt: new Date().toISOString() };
      const res = await addFileToFunction(weddingId, functionId, 'inspirationPhotos', photo);
      if (res.success) {
        onPhotosChange([...photos, photo]);
        toast.success(lang === 'es' ? 'Foto subida.' : 'Photo uploaded.');
      } else {
        toast.error(res.error ?? 'Upload failed.');
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(p: InspirationPhoto) {
    const res = await removeFileFromFunction(weddingId, functionId, 'inspirationPhotos', p.id);
    if (res.success) {
      if (res.storagePath) await deleteFromStorage(res.storagePath);
      onPhotosChange(photos.filter(x => x.id !== p.id));
    } else {
      toast.error(res.error ?? 'Failed to remove.');
    }
  }

  async function handleSaveCaption(photoId: string) {
    const res = await updateInspirationCaption(weddingId, functionId, photoId, captionDraft);
    if (res.success) {
      onPhotosChange(photos.map(p => p.id === photoId ? { ...p, caption: captionDraft } : p));
      setEditCaption(null);
    } else {
      toast.error(res.error ?? 'Failed to update caption.');
    }
  }

  const lbl = lang === 'es' ? 'Fotos de Inspiración' : 'Inspiration Photos';
  const upload = lang === 'es' ? 'Subir Foto' : 'Upload Photo';

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label style={LBL_STYLE}>{lbl}</label>
        <label className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg cursor-pointer transition-opacity ${uploading ? 'opacity-50 pointer-events-none' : 'hover:opacity-80'}`}
          style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
          {uploading ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
          {upload}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploading}
            onChange={e => handleUpload(e.target.files?.[0])} />
        </label>
      </div>
      {photos.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
          {lang === 'es' ? 'Sin fotos.' : 'No photos uploaded.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photos.map(p => (
            <div key={p.id} className="relative rounded-xl overflow-hidden group"
              style={{ border: '1px solid var(--tqf-beige-border)', aspectRatio: '1' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.caption || ''} className="w-full h-full object-cover" />
              {/* Actions overlay */}
              <div className="absolute inset-0 flex items-end justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.6))' }}>
                <button onClick={() => { setEditCaption(p.id); setCaptionDraft(p.caption); }}
                  className="size-6 flex items-center justify-center rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--tqf-bordeaux)' }}>
                  <Edit2 className="size-3" />
                </button>
                <button onClick={() => handleRemove(p)}
                  className="size-6 flex items-center justify-center rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.9)', color: '#991b1b' }}>
                  <X className="size-3" />
                </button>
              </div>
              {p.caption && (
                <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1"
                  style={{ background: 'rgba(0,0,0,0.55)' }}>
                  <p className="text-white text-xs truncate">{p.caption}</p>
                </div>
              )}
              {editCaption === p.id && (
                <div className="absolute inset-0 flex items-center justify-center p-2"
                  style={{ background: 'rgba(0,0,0,0.75)' }}>
                  <div className="w-full space-y-1.5">
                    <input type="text" value={captionDraft} onChange={e => setCaptionDraft(e.target.value)}
                      autoFocus placeholder={lang === 'es' ? 'Descripción…' : 'Caption…'}
                      className="w-full text-xs px-2 py-1.5 rounded-lg outline-none"
                      style={{ background: 'white', color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }} />
                    <div className="flex gap-1">
                      <button onClick={() => handleSaveCaption(p.id)}
                        className="flex-1 text-xs py-1 rounded-lg"
                        style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
                        {lang === 'es' ? 'OK' : 'Save'}
                      </button>
                      <button onClick={() => setEditCaption(null)}
                        className="flex-1 text-xs py-1 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontFamily: 'var(--font-body)' }}>
                        {lang === 'es' ? 'Cancelar' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EditFunctionPage() {
  const { isSuperAdmin, canCreateProjects, isLoading: authLoading, logout } = usePlannerAuth();
  const { lang } = useLangContext();
  const t = FUNCTION_TR[lang as FnLangKey] ?? FUNCTION_TR.en;
  const params = useParams();
  const router = useRouter();
  const weddingId   = params.id as string;
  const functionId  = params.functionId as string;

  const canEdit = isSuperAdmin || canCreateProjects;

  const [fn, setFn]         = useState<WeddingFunction | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData]     = useState<FunctionFormData>(initialFormData());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading || !canEdit) return;
    getFunction(weddingId, functionId).then(res => {
      if (res.success && res.data) {
        setFn(res.data);
        setData(initialFormData(res.data));
      }
    }).finally(() => setLoading(false));
  }, [authLoading, canEdit, weddingId, functionId]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}>
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  if (!canEdit) return <AccessDenied />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateForm(data, t);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    const res = await updateFunction(weddingId, functionId, {
      functionType: data.functionType,
      functionName: data.functionName.trim(),
      order: data.order,
      date: data.date,
      venue: data.venue.trim(),
      setupStartTime: data.setupStartTime,
      venueEntryTime: data.venueEntryTime,
      eventStartTime: data.eventStartTime,
      eventEndTime: data.eventEndTime,
      breakdownTime: data.breakdownTime,
      colorPalette: data.colorPalette,
      generalNotes: data.generalNotes.trim(),
    });
    setSaving(false);

    if (res.success) {
      toast.success(lang === 'es' ? 'Función actualizada.' : 'Function updated.');
      router.push(`/planner/weddings/${weddingId}`);
    } else {
      toast.error(res.error ?? (lang === 'es' ? 'Error al actualizar.' : 'Failed to update.'));
    }
  }

  const backLabel = lang === 'es' ? '← Volver' : '← Back';
  const pageTitle = lang === 'es' ? 'Editar Función' : 'Edit Function';
  const filesTitle = lang === 'es' ? 'Archivos' : 'Files';
  const layoutLabel = lang === 'es' ? 'Archivos de Layout' : 'Layout Files';
  const moodLabel = lang === 'es' ? 'Moodboard' : 'Moodboard';

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      <header className="border-b px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}>
        <Link href={`/planner/weddings/${weddingId}`} className="flex items-center gap-2 transition-opacity hover:opacity-75">
          <NextImage src="/logo.png" alt="" width={28} height={28} className="object-contain"
            style={{ filter: 'invert(9%) sepia(80%) saturate(900%) hue-rotate(308deg) brightness(145%)' }} />
          <span className="hidden sm:block" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontSize: '0.9rem', fontWeight: 300 }}>Weddings</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSelector />
          <button onClick={logout} className="flex items-center gap-1.5 text-sm px-2.5 py-2 rounded-lg hover:opacity-80"
            style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)' }}>
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-6">
        <Link href={`/planner/weddings/${weddingId}`} className="flex items-center gap-1.5 text-sm mb-5 transition-opacity hover:opacity-70"
          style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', textDecoration: 'none' }}>
          <ArrowLeft className="size-4" />{backLabel}
        </Link>

        <h1 className="text-2xl mb-5" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 300 }}>
          {pageTitle}{fn ? ` — ${fn.functionName || t.functionTypes[fn.functionType]}` : ''}
        </h1>

        <form onSubmit={handleSubmit}>
          <FunctionForm
            data={data}
            onChange={patch => setData(prev => ({ ...prev, ...patch }))}
            errors={errors}
            lang={lang as FnLangKey}
            t={t}
          />

          {/* Files section (only in edit, not new) */}
          {fn && (
            <div className="rounded-2xl p-4 space-y-5 mt-4"
              style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
              <h3 className="text-sm font-medium pb-1 border-b"
                style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-bordeaux)', borderColor: 'var(--tqf-beige-border)' }}>
                {filesTitle}
              </h3>

              <FileUploadSection
                weddingId={weddingId} functionId={functionId}
                arrayKey="layoutFiles" files={fn.layoutFiles}
                label={layoutLabel} accept=".pdf,.jpg,.jpeg,.png,.webp"
                allowedTypes={MIME_PDF_IMAGE} maxSize={MAX_20MB} lang={lang}
                onFilesChange={files => setFn(prev => prev ? { ...prev, layoutFiles: files } : prev)}
              />

              <FileUploadSection
                weddingId={weddingId} functionId={functionId}
                arrayKey="moodboardFiles" files={fn.moodboardFiles}
                label={moodLabel} accept=".pdf,.jpg,.jpeg,.png,.webp"
                allowedTypes={MIME_PDF_IMAGE} maxSize={MAX_20MB} lang={lang}
                onFilesChange={files => setFn(prev => prev ? { ...prev, moodboardFiles: files } : prev)}
              />

              <InspirationSection
                weddingId={weddingId} functionId={functionId}
                photos={fn.inspirationPhotos} lang={lang}
                onPhotosChange={photos => setFn(prev => prev ? { ...prev, inspirationPhotos: photos } : prev)}
              />
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? t.saving : t.save}
            </button>
            <Link href={`/planner/weddings/${weddingId}`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
              style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)', textDecoration: 'none' }}>
              {t.cancel}
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
