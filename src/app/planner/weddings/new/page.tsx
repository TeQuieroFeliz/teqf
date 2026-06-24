'use client';

import { createWedding, getTeqfPlanners } from '@/actions/weddings/weddings';
import { useLangContext } from '@/context/LangContext';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import AccessDenied from '@/components/planner/AccessDenied';
import { ArrowLeft, Loader2, LogOut, Save } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const TR = {
  en: {
    title: 'New Wedding', back: '← Back', weddingName: 'Wedding Name *',
    weddingNamePh: 'e.g. López & Martínez Wedding',
    location: 'Primary Location *', locationPh: 'e.g. Hacienda Santa Fe, CDMX',
    assignTeqf: 'Assign TeQF Planner', noTeqf: '— Not assigned —',
    save: 'Create Wedding', saving: 'Creating…',
    errName: 'Wedding name is required.', errLocation: 'Location is required.',
    created: 'Wedding created.', error: 'Failed to create wedding.',
  },
  es: {
    title: 'Nueva Boda', back: '← Volver', weddingName: 'Nombre de la Boda *',
    weddingNamePh: 'Ej. Boda López & Martínez',
    location: 'Ubicación Principal *', locationPh: 'Ej. Hacienda Santa Fe, CDMX',
    assignTeqf: 'Asignar Planificadora TeQF', noTeqf: '— Sin asignar —',
    save: 'Crear Boda', saving: 'Creando…',
    errName: 'El nombre de la boda es obligatorio.', errLocation: 'La ubicación es obligatoria.',
    created: 'Boda creada.', error: 'Error al crear la boda.',
  },
} as const;

const INPUT = { width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--tqf-beige-border)', borderRadius: '0.5rem', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--tqf-dark)', background: 'white', outline: 'none' } as const;
const LBL = { display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', letterSpacing: '0.04em' } as const;
const ERR = { fontSize: '0.75rem', color: '#991b1b', fontFamily: 'var(--font-body)', marginTop: '0.25rem' } as const;

export default function NewWeddingPage() {
  const { isSuperAdmin, canCreateProjects, plannerUser, adminUser, isLoading: authLoading, logout } = usePlannerAuth();
  const { lang } = useLangContext();
  const t = TR[lang as 'en' | 'es'] ?? TR.en;
  const router = useRouter();

  const canCreate = isSuperAdmin || canCreateProjects;

  const [weddingName, setWeddingName] = useState('');
  const [location, setLocation]       = useState('');
  const [teqfUser, setTeqfUser]       = useState('');
  const [teqfUserName, setTeqfUserName] = useState('');
  const [teqfPlanners, setTeqfPlanners] = useState<{ id: string; name: string }[]>([]);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    getTeqfPlanners().then(setTeqfPlanners).catch(() => {});
  }, []);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tqf-beige)' }}><Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} /></div>;
  if (!canCreate) return <AccessDenied />;

  const creatorId   = plannerUser?.id ?? adminUser?.id ?? '';
  const creatorName = plannerUser
    ? `${plannerUser.name ?? ''} ${plannerUser.lastName ?? ''}`.trim()
    : adminUser?.name ?? '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!weddingName.trim()) errs.weddingName = t.errName;
    if (!location.trim())    errs.location    = t.errLocation;
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    const res = await createWedding({
      weddingName: weddingName.trim(),
      primaryLocation: location.trim(),
      assignedTeqfUser: teqfUser || null,
      assignedTeqfUserName: teqfUserName || null,
      createdBy: creatorId,
      createdByName: creatorName,
    });
    setSaving(false);

    if (res.success) {
      toast.success(t.created);
      router.push(`/planner/weddings/${res.id}`);
    } else {
      toast.error(res.error ?? t.error);
    }
  }

  function handleTeqfSelect(id: string) {
    setTeqfUser(id);
    setTeqfUserName(teqfPlanners.find(p => p.id === id)?.name ?? '');
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      <header className="border-b px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}>
        <Link href="/planner/weddings" className="flex items-center gap-2 transition-opacity hover:opacity-75">
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
        <Link href="/planner/weddings" className="flex items-center gap-1.5 text-sm mb-5 transition-opacity hover:opacity-70"
          style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', textDecoration: 'none' }}>
          <ArrowLeft className="size-4" />{t.back}
        </Link>

        <h1 className="text-2xl mb-5" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 300 }}>
          {t.title}
        </h1>

        <div className="rounded-2xl p-5" style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={LBL}>{t.weddingName}</label>
              <input type="text" value={weddingName} placeholder={t.weddingNamePh}
                onChange={e => { setWeddingName(e.target.value); setErrors(p => ({ ...p, weddingName: '' })); }}
                style={{ ...INPUT, borderColor: errors.weddingName ? '#fca5a5' : 'var(--tqf-beige-border)' }} />
              {errors.weddingName && <p style={ERR}>{errors.weddingName}</p>}
            </div>

            <div>
              <label style={LBL}>{t.location}</label>
              <input type="text" value={location} placeholder={t.locationPh}
                onChange={e => { setLocation(e.target.value); setErrors(p => ({ ...p, location: '' })); }}
                style={{ ...INPUT, borderColor: errors.location ? '#fca5a5' : 'var(--tqf-beige-border)' }} />
              {errors.location && <p style={ERR}>{errors.location}</p>}
            </div>

            <div>
              <label style={LBL}>{t.assignTeqf}</label>
              <select value={teqfUser} onChange={e => handleTeqfSelect(e.target.value)} style={INPUT}>
                <option value="">{t.noTeqf}</option>
                {teqfPlanners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {saving ? t.saving : t.save}
              </button>
              <Link href="/planner/weddings"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
                style={{ color: 'var(--tqf-muted)', border: '1px solid var(--tqf-beige-border)', fontFamily: 'var(--font-body)', textDecoration: 'none' }}>
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
