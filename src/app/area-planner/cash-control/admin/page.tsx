'use client';

import { useAdminAuth } from '@/context/AdminAuthContext';
import { useCashControlAuth } from '@/context/CashControlAuthContext';
import { isCashControlAdmin } from '@/lib/cash-control/permissions';
import { getAllEvents, getTeamProfiles } from '@/lib/cash-control/firestore';
import { CashControlEvent, CashControlProfile } from '@/lib/cash-control/types';
import {
  Loader2,
  Plus,
  Calendar,
  ArrowRight,
  ArrowLeft,
  Users,
  LogOut,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { auth } from '@/firebase/client';

type CreateForm = {
  eventCode: string;
  eventName: string;
  eventDate: string;
  location: string;
};

const EMPTY_FORM: CreateForm = { eventCode: '', eventName: '', eventDate: '', location: '' };

export default function AdminCashControlPage() {
  const { cashControlRole, uid, displayName, email, isLoading: authLoading } = useCashControlAuth();
  const { adminUser } = useAdminAuth();
  const isAdmin = isCashControlAdmin(cashControlRole) || adminUser?.role === 'superadmin';
  const router = useRouter();

  const [events, setEvents] = useState<CashControlEvent[]>([]);
  const [teamProfiles, setTeamProfiles] = useState<CashControlProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      router.replace('/area-planner/cash-control');
      return;
    }
    Promise.all([getAllEvents(), getTeamProfiles()])
      .then(([evs, profiles]) => {
        setEvents(evs);
        setTeamProfiles(profiles);
      })
      .finally(() => setLoading(false));
  }, [authLoading, isAdmin, router]);

  function toggleUser(uid: string) {
    setSelectedUserIds(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.eventCode.trim()) {
      toast.error('El código del evento es obligatorio.');
      return;
    }
    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) throw new Error('Sin sesión activa.');

      const res = await fetch('/api/cash-control/create-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...form, assignedUserIds: selectedUserIds }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al crear el evento.');

      toast.success('Evento creado.');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setSelectedUserIds([]);
      getAllEvents().then(setEvents);
      router.push(`/area-planner/cash-control/admin/eventos/${data.eventId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEvent(ev: CashControlEvent) {
    if (!confirm(`Eliminare l'evento "${ev.eventCode || ev.eventName}"?\n\nSaranno eliminati tutti i movimenti, chiusure e assegnazioni.`)) return;
    try {
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) throw new Error('Sin sesión activa.');
      const res = await fetch('/api/cash-control/delete-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventId: ev.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al eliminar.');
      setEvents(prev => prev.filter(e => e.id !== ev.id));
      toast.success('Evento eliminato.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error inesperado.');
    }
  }

  async function handleLogout() {
    await auth.signOut();
    router.replace('/login');
  }

  const initials = displayName
    ? displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : (email?.[0]?.toUpperCase() ?? '?');

  const activeEvents = events.filter(e => e.status === 'active');
  const closedEvents = events.filter(e => e.status === 'closed');

  if (authLoading || loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--tqf-beige)' }}
      >
        <Loader2 className="size-8 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      {/* Header */}
      <header
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex items-center justify-center size-9 rounded-lg"
            style={{ border: '1px solid var(--tqf-beige-border)' }}
          >
            <ArrowLeft className="size-4" style={{ color: 'var(--tqf-muted)' }} />
          </Link>
          <div>
            <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Pannello Admin
            </p>
            <h1 className="text-xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontWeight: 300 }}>
              Cash Control
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/cash-control/users"
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{
              color: 'var(--tqf-bordeaux)',
              border: '1px solid var(--tqf-cipria)',
              background: 'var(--tqf-cipria-light)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <Users className="size-4" />
            <span className="hidden sm:inline">Usuarios</span>
          </Link>
          <div
            className="size-8 rounded-full flex items-center justify-center text-xs font-medium"
            style={{ background: 'var(--tqf-cipria)', color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-display)' }}
          >
            {initials}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{
              color: 'var(--tqf-muted)',
              border: '1px solid var(--tqf-beige-border)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-3xl"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 300 }}
            >
              Eventos
            </h1>
            <p
              className="text-sm mt-0.5"
              style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
            >
              {activeEvents.length} activo{activeEvents.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl transition-opacity hover:opacity-80"
            style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
          >
            <Plus className="size-4" />
            Nuevo evento
          </button>
        </div>

        {/* Create form (inline card) */}
        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="rounded-2xl p-5 mb-6 space-y-3"
            style={{ background: 'white', border: '2px solid var(--tqf-bordeaux)' }}
          >
            <h2
              className="text-lg mb-1"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}
            >
              Nuevo evento
            </h2>

            {[
              { label: 'Código del evento *', key: 'eventCode', placeholder: 'Ej: BOD-2026-001', type: 'text' },
              { label: 'Nombre del evento', key: 'eventName', placeholder: 'Ej: Boda González-Reyes', type: 'text' },
              { label: 'Fecha', key: 'eventDate', placeholder: '', type: 'date' },
              { label: 'Lugar / Venue', key: 'location', placeholder: 'Ej: Hacienda La Trinidad', type: 'text' },
            ].map(({ label, key, placeholder, type }) => (
              <div key={key}>
                <label
                  className="block text-xs mb-1"
                  style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
                >
                  {label}
                </label>
                <input
                  type={type}
                  value={form[key as keyof CreateForm]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{
                    border: '1px solid var(--tqf-beige-border)',
                    background: 'var(--tqf-beige)',
                    fontFamily: 'var(--font-body)',
                    color: 'var(--tqf-dark)',
                  }}
                />
              </div>
            ))}

            {/* User selection */}
            {teamProfiles.length > 0 && (
              <div>
                <p
                  className="text-xs mb-2"
                  style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
                >
                  Asignar usuarios
                </p>
                <div className="space-y-1.5">
                  {teamProfiles.map(profile => (
                    <label
                      key={profile.uid}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-colors"
                      style={{
                        border: selectedUserIds.includes(profile.uid)
                          ? '1.5px solid var(--tqf-bordeaux)'
                          : '1px solid var(--tqf-beige-border)',
                        background: selectedUserIds.includes(profile.uid)
                          ? 'var(--tqf-cipria-light)'
                          : 'var(--tqf-beige)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(profile.uid)}
                        onChange={() => toggleUser(profile.uid)}
                        className="rounded accent-[var(--tqf-bordeaux)]"
                      />
                      <div className="min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}
                        >
                          {profile.fullName || profile.email}
                        </p>
                        {profile.fullName && (
                          <p
                            className="text-xs truncate"
                            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
                          >
                            {profile.email}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                {selectedUserIds.length > 0 && (
                  <p
                    className="text-xs mt-1.5"
                    style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}
                  >
                    {selectedUserIds.length} usuario{selectedUserIds.length !== 1 ? 's' : ''} seleccionado{selectedUserIds.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); setSelectedUserIds([]); }}
                className="flex-1 py-2.5 rounded-xl text-sm"
                style={{
                  border: '1px solid var(--tqf-beige-border)',
                  color: 'var(--tqf-muted)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
                style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : 'Crear evento'}
              </button>
            </div>
          </form>
        )}

        {/* Active events */}
        {activeEvents.length > 0 && (
          <section className="mb-8">
            <p
              className="text-xs uppercase tracking-widest mb-3"
              style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
            >
              Activos
            </p>
            <div className="space-y-3">
              {activeEvents.map(ev => (
                <EventCard key={ev.id} event={ev} onDelete={() => handleDeleteEvent(ev)} />
              ))}
            </div>
          </section>
        )}

        {/* Closed events */}
        {closedEvents.length > 0 && (
          <section>
            <p
              className="text-xs uppercase tracking-widest mb-3"
              style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
            >
              Cerrados
            </p>
            <div className="space-y-3">
              {closedEvents.map(ev => (
                <EventCard key={ev.id} event={ev} onDelete={() => handleDeleteEvent(ev)} />
              ))}
            </div>
          </section>
        )}

        {events.length === 0 && (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
          >
            <div
              className="mx-auto mb-4 size-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}
            >
              <Calendar className="size-7" />
            </div>
            <h2
              className="text-xl mb-2"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}
            >
              Sin eventos
            </h2>
            <p
              className="text-sm"
              style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
            >
              Crea el primer evento con el botón de arriba.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function EventCard({ event, onDelete }: { event: CashControlEvent; onDelete: () => void }) {
  return (
    <div
      className="flex items-center justify-between rounded-2xl p-5"
      style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
    >
      <Link
        href={`/area-planner/cash-control/admin/eventos/${event.id}`}
        className="flex-1 min-w-0 transition-opacity hover:opacity-70"
      >
        <p
          className="font-medium truncate"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontSize: '1.05rem', fontWeight: 400 }}
        >
          {event.eventCode || event.eventName}
        </p>
        {(event.eventDate || event.location) && (
          <p
            className="text-sm mt-0.5 truncate"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
          >
            {event.eventDate}
            {event.eventDate && event.location ? ' · ' : ''}
            {event.location}
          </p>
        )}
      </Link>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        <span
          className="text-xs px-2.5 py-1 rounded-full"
          style={
            event.status === 'active'
              ? { background: '#f0fdf4', color: '#166534', fontFamily: 'var(--font-body)' }
              : { background: '#f3f4f6', color: '#6b7280', fontFamily: 'var(--font-body)' }
          }
        >
          {event.status === 'active' ? 'Activo' : 'Cerrado'}
        </span>
        <button
          onClick={onDelete}
          className="flex items-center justify-center size-8 rounded-lg transition-opacity hover:opacity-80"
          style={{ border: '1px solid #fca5a5', color: '#991b1b' }}
        >
          <Trash2 className="size-3.5" />
        </button>
        <ArrowRight className="size-4" style={{ color: 'var(--tqf-muted)' }} />
      </div>
    </div>
  );
}
