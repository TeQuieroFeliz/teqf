'use client';
import {
  getPortfolioProjects,
  deletePortfolioProject,
  type PortfolioProject,
} from '@/actions/portfolio/portfolio-crud';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import {
  ArrowLeft,
  Edit2,
  Image as ImageIcon,
  Loader2,
  LogOut,
  Plus,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  indian:    { bg: '#fef9ee', text: '#b45309' },
  jewish:    { bg: '#eff6ff', text: '#1d4ed8' },
  persian:   { bg: '#fdf2f4', text: '#5C1A28' },
  corporate: { bg: '#f3f4f6', text: '#6b7280' },
};

const CATEGORY_LABELS: Record<string, string> = {
  indian: 'Indian Wedding',
  jewish: 'Jewish Wedding',
  persian: 'Persian Wedding',
  corporate: 'Corporate & Other',
};

export default function AdminPortfolioPage() {
  const { adminUser, logout } = usePlannerAuth();
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    getPortfolioProjects()
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  if (!adminUser) return null;

  async function handleDelete(project: PortfolioProject) {
    if (!confirm(`Eliminare "${project.title}"? Questa azione è irreversibile.`)) return;
    setDeletingId(project.id);
    const result = await deletePortfolioProject(project.id);
    if (result.success) {
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      toast.success('Progetto eliminato.');
    } else {
      toast.error(result.error ?? 'Errore durante l\'eliminazione.');
    }
    setDeletingId(null);
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--tqf-beige)' }}>
      {/* Header */}
      <header
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ background: 'white', borderColor: 'var(--tqf-beige-border)' }}
      >
        <div className="flex items-center gap-4">
          <Link
            href="/planner"
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
          >
            <ArrowLeft className="size-4" />
            Dashboard
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
              Portfolio
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/planner/portfolio/new"
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
          >
            <Plus className="size-4" />
            Nuovo Progetto
          </Link>
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

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-6 animate-spin" style={{ color: 'var(--tqf-bordeaux)' }} />
          </div>
        ) : projects.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
          >
            <div
              className="mx-auto mb-4 size-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}
            >
              <ImageIcon className="size-6" />
            </div>
            <h2
              className="text-xl mb-2"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}
            >
              Nessun progetto ancora
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              Crea il primo progetto per iniziare a costruire il portfolio.
            </p>
            <Link
              href="/planner/portfolio/new"
              className="inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }}
            >
              <Plus className="size-4" />
              Nuovo Progetto
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm mb-6" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
              {projects.length} {projects.length === 1 ? 'progetto' : 'progetti'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((project) => {
                const cat = CATEGORY_COLORS[project.category] ?? { bg: '#f3f4f6', text: '#6b7280' };
                return (
                  <div
                    key={project.id}
                    className="rounded-2xl overflow-hidden flex flex-col"
                    style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
                  >
                    {/* Cover image */}
                    <div
                      className="relative flex items-center justify-center"
                      style={{
                        height: '160px',
                        background: project.coverImage
                          ? 'var(--tqf-beige-dark)'
                          : 'var(--tqf-cipria-light)',
                        overflow: 'hidden',
                      }}
                    >
                      {project.coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={project.coverImage}
                          alt={project.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <ImageIcon className="size-8" style={{ color: 'var(--tqf-cipria)' }} />
                      )}
                      {/* Published badge */}
                      <span
                        className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full"
                        style={
                          project.published
                            ? { background: '#f0fdf4', color: '#15803d', fontFamily: 'var(--font-body)' }
                            : { background: '#f3f4f6', color: '#6b7280', fontFamily: 'var(--font-body)' }
                        }
                      >
                        {project.published ? 'Pubblicato' : 'Bozza'}
                      </span>
                    </div>

                    {/* Card body */}
                    <div className="p-4 flex flex-col gap-2 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="text-xs px-2.5 py-0.5 rounded-full"
                          style={{ background: cat.bg, color: cat.text, fontFamily: 'var(--font-body)' }}
                        >
                          {CATEGORY_LABELS[project.category] ?? project.category}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                          {project.images.length} foto
                        </span>
                      </div>

                      <h3
                        className="text-base leading-snug"
                        style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}
                      >
                        {project.title || <span style={{ opacity: 0.4 }}>Senza titolo</span>}
                      </h3>

                      {project.location && (
                        <p className="text-xs" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                          {project.location} · {project.year}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div
                      className="px-4 pb-4 flex gap-2"
                    >
                      <Link
                        href={`/admin/portfolio/${project.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg transition-opacity hover:opacity-70"
                        style={{
                          color: 'var(--tqf-bordeaux)',
                          border: '1px solid var(--tqf-cipria)',
                          background: 'var(--tqf-cipria-light)',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        <Edit2 className="size-3" />
                        Modifica
                      </Link>
                      <button
                        onClick={() => handleDelete(project)}
                        disabled={deletingId === project.id}
                        className="flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-opacity hover:opacity-70 disabled:opacity-40"
                        style={{
                          color: '#991b1b',
                          border: '1px solid #fecaca',
                          background: '#fef2f2',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        {deletingId === project.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Trash2 className="size-3" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
