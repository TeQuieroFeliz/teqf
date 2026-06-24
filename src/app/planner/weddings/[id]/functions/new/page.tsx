'use client';

import { createFunction } from '@/actions/weddings/functions';
import {
  FunctionForm,
  FUNCTION_TR,
  FnLangKey,
  FunctionFormData,
  initialFormData,
  validateForm,
  INPUT_STYLE,
} from '@/app/planner/weddings/[id]/_FunctionForm';
import { LanguageSelector } from '@/components/LanguageSelector';
import AccessDenied from '@/components/planner/AccessDenied';
import { useLangContext } from '@/context/LangContext';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { ArrowLeft, Loader2, LogOut, Save } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function NewFunctionPage() {
  const { isSuperAdmin, canCreateProjects, isLoading: authLoading, logout } = usePlannerAuth();
  const { lang } = useLangContext();
  const t = FUNCTION_TR[lang as FnLangKey] ?? FUNCTION_TR.en;
  const params = useParams();
  const router = useRouter();
  const weddingId = params.id as string;

  const canEdit = isSuperAdmin || canCreateProjects;

  const [data, setData]     = useState<FunctionFormData>(initialFormData());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  if (authLoading) {
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
    const res = await createFunction(weddingId, {
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
      toast.success(lang === 'es' ? 'Función creada.' : 'Function created.');
      router.push(`/planner/weddings/${weddingId}/functions/${res.id}/edit`);
    } else {
      toast.error(res.error ?? (lang === 'es' ? 'Error al crear la función.' : 'Failed to create function.'));
    }
  }

  const backLabel = lang === 'es' ? '← Volver' : '← Back';

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      <header className="border-b px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}>
        <Link href={`/planner/weddings/${weddingId}`} className="flex items-center gap-2 transition-opacity hover:opacity-75">
          <Image src="/logo.png" alt="" width={28} height={28} className="object-contain"
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
          {lang === 'es' ? 'Nueva Función' : 'New Function'}
        </h1>

        <form onSubmit={handleSubmit}>
          <FunctionForm
            data={data}
            onChange={patch => setData(prev => ({ ...prev, ...patch }))}
            errors={errors}
            lang={lang as FnLangKey}
            t={t}
          />

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
