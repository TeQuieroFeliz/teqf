'use client';

import { updatePlannerAvatar, updatePlannerProfile } from '@/actions/planner/planner-auth';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { storage } from '@/firebase/client';
import { CONTRACT_TYPES } from '@/lib/planner-types';
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage';
import { ArrowLeft, Camera, Loader2, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.875rem',
  borderRadius: '0.625rem',
  border: '1px solid var(--tqf-beige-border)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.875rem',
  color: 'var(--tqf-dark)',
  background: 'white',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.7rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.12em',
  marginBottom: '0.375rem',
  color: 'var(--tqf-muted)',
  fontFamily: 'var(--font-body)',
};

export default function PlannerProfilePage() {
  const { plannerUser, refreshPlannerUser } = usePlannerAuth();
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    lastName: '',
    birthDate: '',
    startDate: '',
    contractType: '',
    phone: '',
    contactEmail: '',
    role: '',
  });

  useEffect(() => {
    if (!plannerUser) return;
    setForm({
      name: plannerUser.name ?? '',
      lastName: plannerUser.lastName ?? '',
      birthDate: plannerUser.birthDate ?? '',
      startDate: plannerUser.startDate ?? '',
      contractType: plannerUser.contractType ?? '',
      phone: plannerUser.phone ?? '',
      contactEmail: plannerUser.contactEmail ?? '',
      role: plannerUser.role ?? '',
    });
  }, [plannerUser]);

  if (!plannerUser) return null;

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const initials = [plannerUser.name?.[0], plannerUser.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || plannerUser.name?.[0]?.toUpperCase() || '?';

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Seleziona un file immagine.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Immagine troppo grande (max 5 MB).');
      return;
    }

    setAvatarUploading(true);
    setAvatarProgress(0);

    const path = `planner-avatars/${plannerUser!.id}/avatar`;
    const sRef = storageRef(storage, path);
    const task = uploadBytesResumable(sRef, file, { contentType: file.type });

    task.on(
      'state_changed',
      (snap) => setAvatarProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      () => {
        toast.error('Errore upload foto.');
        setAvatarUploading(false);
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        const result = await updatePlannerAvatar(plannerUser!.id, url);
        if (result.success) {
          await refreshPlannerUser();
          toast.success('Foto profilo aggiornata.');
        } else {
          toast.error(result.error ?? 'Errore salvataggio foto.');
        }
        setAvatarUploading(false);
      }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Il nome è obbligatorio.');
      return;
    }
    setSaving(true);
    const result = await updatePlannerProfile(plannerUser!.id, {
      name: form.name.trim(),
      lastName: form.lastName.trim() || undefined,
      birthDate: form.birthDate || undefined,
      startDate: form.startDate || undefined,
      contractType: form.contractType || undefined,
      phone: form.phone.trim() || undefined,
      contactEmail: form.contactEmail.trim() || undefined,
      role: form.role.trim() || undefined,
    });
    if (result.success) {
      await refreshPlannerUser();
      toast.success('Profilo aggiornato.');
    } else {
      toast.error(result.error ?? 'Errore aggiornamento profilo.');
    }
    setSaving(false);
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      {/* Header */}
      <header
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}
      >
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-75">
          <Image
            src="/logo.png"
            alt="Te Quiero Feliz"
            width={36}
            height={36}
            className="object-contain"
            style={{ filter: 'invert(11%) sepia(57%) saturate(1200%) hue-rotate(314deg) brightness(80%) contrast(95%)' }}
          />
          <div>
            <p style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontSize: '1.1rem', fontWeight: 300, lineHeight: 1.2 }}>
              Te Quiero Feliz
            </p>
            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-muted)', fontSize: '0.6rem', letterSpacing: '0.18em' }}>
              AREA PLANNER
            </p>
          </div>
        </Link>
        <Link
          href="/planner"
          className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
        >
          <ArrowLeft className="size-4" />
          Dashboard
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 300 }}>
          Il mio profilo
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar */}
          <section
            className="rounded-2xl p-6 flex items-center gap-6"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
          >
            <div className="relative flex-shrink-0">
              <div
                className="size-20 rounded-full overflow-hidden flex items-center justify-center text-2xl font-medium"
                style={{ background: 'var(--tqf-cipria)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-display)' }}
              >
                {plannerUser.avatarUrl ? (
                  <Image
                    src={plannerUser.avatarUrl}
                    alt="Avatar"
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              {avatarUploading && (
                <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
                  <span className="text-white text-xs font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                    {avatarProgress}%
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-1 -right-1 size-7 rounded-full flex items-center justify-center shadow transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: 'var(--tqf-bordeaux)', color: 'white' }}
              >
                {avatarUploading ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div>
              <p className="text-base" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
                {plannerUser.name}{plannerUser.lastName ? ` ${plannerUser.lastName}` : ''}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {plannerUser.email}
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="mt-2 text-xs transition-opacity hover:opacity-70 disabled:opacity-40"
                style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}
              >
                Cambia foto profilo
              </button>
            </div>
          </section>

          {/* Dati personali */}
          <section
            className="rounded-2xl p-6"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
          >
            <div className="flex items-center gap-2 mb-5">
              <User className="size-4" style={{ color: 'var(--tqf-bordeaux)' }} />
              <h2 className="text-base" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
                Dati personali
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>Nome *</label>
                <input value={form.name} onChange={set('name')} required style={inputStyle} placeholder="Nome" />
              </div>
              <div>
                <label style={labelStyle}>Cognome</label>
                <input value={form.lastName} onChange={set('lastName')} style={inputStyle} placeholder="Cognome" />
              </div>
              <div>
                <label style={labelStyle}>Data di nascita</label>
                <input type="date" value={form.birthDate} onChange={set('birthDate')} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Numero di telefono</label>
                <input type="tel" value={form.phone} onChange={set('phone')} style={inputStyle} placeholder="+52 55 1234 5678" />
              </div>
              <div className="sm:col-span-2">
                <label style={labelStyle}>Email di contatto</label>
                <input type="email" value={form.contactEmail} onChange={set('contactEmail')} style={inputStyle} placeholder="email@esempio.com" />
                <p className="mt-1 text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                  Può essere diversa dall&apos;email di accesso
                </p>
              </div>
            </div>
          </section>

          {/* Dati lavorativi */}
          <section
            className="rounded-2xl p-6"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
          >
            <h2 className="text-base mb-5" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}>
              Dati lavorativi
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>Data di inizio lavoro</label>
                <input type="date" value={form.startDate} onChange={set('startDate')} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Tipo di contratto</label>
                <select value={form.contractType} onChange={set('contractType')} style={inputStyle}>
                  <option value="">— Seleziona —</option>
                  {CONTRACT_TYPES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label style={labelStyle}>Ruolo nel XB Team</label>
                <input
                  value={form.role}
                  onChange={set('role')}
                  style={inputStyle}
                  placeholder="es. Senior Planner, Coordinatrice eventi..."
                />
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Salva modifiche
          </button>
        </form>
      </main>
    </div>
  );
}
