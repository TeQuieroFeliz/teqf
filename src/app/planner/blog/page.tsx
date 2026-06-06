'use client';
import type { Article } from '@/actions/blog/get-articles';
import { deleteArticle } from '@/actions/blog/delete-article';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import AccessDenied from '@/components/planner/AccessDenied';
import { db } from '@/firebase/client';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import {
  ArrowLeft,
  BookOpen,
  Edit2,
  Loader2,
  LogOut,
  Plus,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Flowers:     { bg: '#fdf2f4', text: '#5C1A28' },
  Color:       { bg: '#fef9ee', text: '#b45309' },
  Composition: { bg: '#eff6ff', text: '#1d4ed8' },
  Inspiration: { bg: '#f0fdf4', text: '#15803d' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function BlogListPage() {
  const { adminUser, logout } = usePlannerAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    getDocs(query(collection(db, 'articles'), orderBy('createdAt', 'desc')))
      .then((snap) =>
        setArticles(snap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            title: d.title ?? '',
            category: d.category ?? '',
            createdAt: d.createdAt?.toDate().toISOString() ?? new Date().toISOString(),
            publishedAt: d.publishedAt?.toDate().toISOString() ?? null,
            shortDescription: d.shortDescription ?? '',
            content: d.content ?? '',
            slug: d.slug ?? '',
            status: d.status ?? 'draft',
            updatedAt: d.updatedAt?.toDate().toISOString() ?? new Date().toISOString(),
            coverImage: d.coverImage ?? '',
            images: d.images ?? [],
          } as Article;
        }))
      )
      .finally(() => setLoading(false));
  }, []);

  // BUG-09 fix: replaced `return null` with AccessDenied.
  if (!adminUser) return <AccessDenied />;

  async function handleDelete(article: Article) {
    if (!confirm(`Delete "${article.title}"? This cannot be undone.`)) return;
    setDeletingId(article.id);
    const result = await deleteArticle(article.id);
    if (result.success) {
      setArticles((prev) => prev.filter((a) => a.id !== article.id));
      toast.success('Article deleted.');
    } else {
      toast.error(result.error ?? 'Failed to delete article.');
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
          <div
            className="h-4 w-px"
            style={{ background: 'var(--tqf-beige-border)' }}
          />
          <div className="flex items-center gap-2">
            <div
              className="p-1.5 rounded-lg"
              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}
            >
              <BookOpen className="size-4" />
            </div>
            <h1
              className="text-xl"
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--tqf-dark)',
                fontWeight: 400,
              }}
            >
              Blog
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/planner/blog/new"
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{
              background: 'var(--tqf-bordeaux)',
              color: 'white',
              fontFamily: 'var(--font-body)',
            }}
          >
            <Plus className="size-4" />
            New Article
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
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2
              className="size-6 animate-spin"
              style={{ color: 'var(--tqf-bordeaux)' }}
            />
          </div>
        ) : articles.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
          >
            <div
              className="mx-auto mb-4 size-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--tqf-cipria-light)', color: 'var(--tqf-bordeaux)' }}
            >
              <BookOpen className="size-6" />
            </div>
            <h2
              className="text-xl mb-2"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontWeight: 400 }}
            >
              No articles yet
            </h2>
            <p
              className="text-sm mb-6"
              style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
            >
              Start by creating your first article.
            </p>
            <Link
              href="/planner/blog/new"
              className="inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-lg transition-opacity hover:opacity-80"
              style={{
                background: 'var(--tqf-bordeaux)',
                color: 'white',
                fontFamily: 'var(--font-body)',
              }}
            >
              <Plus className="size-4" />
              New Article
            </Link>
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'white', border: '1px solid var(--tqf-beige-border)' }}
          >
            {/* Table header */}
            <div className="px-6 py-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--tqf-beige-border)' }}>
              <p
                className="text-sm"
                style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
              >
                {articles.length} {articles.length === 1 ? 'article' : 'articles'}
              </p>
            </div>

            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--tqf-beige-border)' }}>
                  {['Title', 'Category', 'Date', 'Status', 'Actions'].map((col) => (
                    <th
                      key={col}
                      className="px-6 py-3 text-left text-xs uppercase tracking-widest"
                      style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', fontWeight: 500 }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {articles.map((article, i) => {
                  const catColors = CATEGORY_COLORS[article.category] ?? { bg: '#f3f4f6', text: '#6b7280' };
                  return (
                    <tr
                      key={article.id}
                      style={{
                        borderBottom: i < articles.length - 1 ? '1px solid var(--tqf-beige-border)' : 'none',
                      }}
                    >
                      {/* Title */}
                      <td className="px-6 py-4">
                        <p
                          className="text-sm font-medium leading-snug max-w-xs truncate"
                          style={{ color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}
                        >
                          {article.title}
                        </p>
                        {article.shortDescription && (
                          <p
                            className="text-xs mt-0.5 max-w-xs truncate"
                            style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
                          >
                            {article.shortDescription}
                          </p>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4">
                        <span
                          className="inline-block text-xs px-2.5 py-1 rounded-full"
                          style={{ background: catColors.bg, color: catColors.text, fontFamily: 'var(--font-body)' }}
                        >
                          {article.category}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4">
                        <span
                          className="text-sm"
                          style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
                        >
                          {formatDate(article.createdAt)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span
                          className="inline-block text-xs px-2.5 py-1 rounded-full"
                          style={
                            article.status === 'published'
                              ? { background: '#f0fdf4', color: '#15803d', fontFamily: 'var(--font-body)' }
                              : { background: '#f3f4f6', color: '#6b7280', fontFamily: 'var(--font-body)' }
                          }
                        >
                          {article.status === 'published' ? 'Published' : 'Draft'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/blog/${article.id}`}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
                            style={{
                              color: 'var(--tqf-bordeaux)',
                              border: '1px solid var(--tqf-cipria)',
                              background: 'var(--tqf-cipria-light)',
                              fontFamily: 'var(--font-body)',
                            }}
                          >
                            <Edit2 className="size-3" />
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(article)}
                            disabled={deletingId === article.id}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70 disabled:opacity-40"
                            style={{
                              color: '#991b1b',
                              border: '1px solid #fecaca',
                              background: '#fef2f2',
                              fontFamily: 'var(--font-body)',
                            }}
                          >
                            {deletingId === article.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Trash2 className="size-3" />
                            )}
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
