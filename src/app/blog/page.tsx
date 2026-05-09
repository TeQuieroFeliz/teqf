'use client';

import { getPublishedArticles } from '@/actions/blog/get-published-articles';
import type { Article } from '@/actions/blog/get-articles';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const CATEGORIES = ['Flowers', 'Color', 'Composition', 'Inspiration'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function BlogPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    getPublishedArticles(1000).then(setArticles).finally(() => setLoading(false));
  }, []);

  const filtered = active ? articles.filter(a => a.category === active) : articles;

  return (
    <div style={{ fontFamily: 'var(--font-body)', backgroundColor: 'var(--tqf-beige)', minHeight: '100vh' }}>

      {/* ── Nav ── */}
      <nav
        className="sticky top-0 z-50"
        style={{
          backgroundColor: 'var(--tqf-beige)',
          borderBottom: '1px solid var(--tqf-beige-border)',
          height: '72px',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3" style={{ textDecoration: 'none' }}>
            <Image
              src="/logo.png"
              alt="Te Quiero Feliz"
              width={40}
              height={40}
              className="object-contain"
              style={{
                filter:
                  'invert(9%) sepia(80%) saturate(900%) hue-rotate(308deg) brightness(145%)',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--tqf-bordeaux)',
                fontSize: '1.1rem',
                fontWeight: 400,
                letterSpacing: '0.02em',
              }}
            >
              Te Quiero Feliz
            </span>
          </Link>
          <Link
            href="/"
            style={{
              color: 'var(--tqf-muted)',
              fontSize: '0.75rem',
              letterSpacing: '0.08em',
              textDecoration: 'none',
              fontFamily: 'var(--font-body)',
            }}
          >
            ← Home
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="pt-20 pb-14 text-center px-6">
        <p
          style={{
            color: 'var(--tqf-gold)',
            fontSize: '0.6rem',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-body)',
            marginBottom: '1.25rem',
          }}
        >
          Te Quiero Feliz
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--tqf-bordeaux)',
            fontSize: 'clamp(3rem, 7vw, 5.5rem)',
            fontWeight: 300,
            lineHeight: 1.05,
            letterSpacing: '-0.01em',
            marginBottom: '1.5rem',
          }}
        >
          From The Studio
        </h1>
        <div
          style={{
            width: '48px',
            height: '1px',
            background: 'var(--tqf-gold)',
            margin: '0 auto 1.5rem',
            opacity: 0.6,
          }}
        />
        <p
          style={{
            color: 'var(--tqf-muted)',
            fontSize: '0.95rem',
            lineHeight: 1.7,
            maxWidth: '420px',
            margin: '0 auto',
            fontStyle: 'italic',
          }}
        >
          Notes on flowers, color, and the art of celebration.
        </p>
      </header>

      {/* ── Category filters ── */}
      <div
        className="sticky z-40 px-6 py-4"
        style={{
          top: '72px',
          backgroundColor: 'var(--tqf-beige)',
          borderBottom: '1px solid var(--tqf-beige-border)',
        }}
      >
        <div
          className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <FilterPill
            label="All"
            active={active === null}
            onClick={() => setActive(null)}
          />
          {CATEGORIES.map(cat => (
            <FilterPill
              key={cat}
              label={cat}
              active={active === cat}
              onClick={() => setActive(cat === active ? null : cat)}
            />
          ))}
        </div>
      </div>

      {/* ── Article grid ── */}
      <main className="max-w-7xl mx-auto px-6 py-14 pb-24">
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2
              className="size-7 animate-spin"
              style={{ color: 'var(--tqf-bordeaux)', opacity: 0.5 }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <p style={{ color: 'var(--tqf-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
              No articles in this category yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {filtered.map(article => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer
        style={{
          backgroundColor: 'var(--tqf-dark)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
        className="py-12"
      >
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
            <span
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--tqf-cipria-light)',
                fontSize: '1.3rem',
                fontWeight: 400,
              }}
            >
              Te Quiero Feliz
            </span>
            <span
              style={{
                color: 'var(--tqf-muted)',
                fontSize: '0.62rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              Luxury Floral Design & Event Production
            </span>
          </div>
          <p
            style={{
              color: 'var(--tqf-muted)',
              fontSize: '0.72rem',
              letterSpacing: '0.06em',
              fontFamily: 'var(--font-body)',
            }}
          >
            © 2025 Te Quiero Feliz · Est. 2023
          </p>
        </div>
      </footer>

    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs transition-all"
      style={{
        fontFamily: 'var(--font-body)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        border: active ? '1px solid var(--tqf-bordeaux)' : '1px solid var(--tqf-beige-border)',
        background: active ? 'var(--tqf-bordeaux)' : 'transparent',
        color: active ? 'var(--tqf-cipria-light)' : 'var(--tqf-muted)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function ArticleCard({ article }: { article: Article }) {
  const date = formatDate(article.publishedAt ?? article.createdAt);

  return (
    <Link
      href={`/blog/${article.slug}`}
      style={{ textDecoration: 'none', display: 'block' }}
      className="group"
    >
      {/* Cover image */}
      <div
        className="overflow-hidden rounded-xl mb-5"
        style={{ aspectRatio: '4/3', background: 'var(--tqf-cipria-light)' }}
      >
        {article.coverImage ? (
          <Image
            src={article.coverImage}
            alt={article.title}
            width={640}
            height={480}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div
            className="w-full h-full flex items-end p-5"
            style={{
              background:
                'linear-gradient(135deg, var(--tqf-cipria) 0%, var(--tqf-bordeaux) 100%)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                color: 'rgba(255,255,255,0.35)',
                fontSize: '2rem',
                fontWeight: 300,
                lineHeight: 1,
              }}
            >
              TQF
            </span>
          </div>
        )}
      </div>

      {/* Category */}
      <p
        style={{
          color: 'var(--tqf-gold)',
          fontSize: '0.6rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-body)',
          marginBottom: '0.6rem',
        }}
      >
        {article.category}
      </p>

      {/* Title */}
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          color: 'var(--tqf-bordeaux)',
          fontSize: 'clamp(1.3rem, 2.5vw, 1.6rem)',
          fontWeight: 300,
          lineHeight: 1.2,
          marginBottom: '0.6rem',
          transition: 'opacity 0.2s',
        }}
        className="group-hover:opacity-75"
      >
        {article.title}
      </h2>

      {/* Short description */}
      {article.shortDescription && (
        <p
          style={{
            color: 'var(--tqf-muted)',
            fontSize: '0.85rem',
            lineHeight: 1.65,
            marginBottom: '0.9rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}
        >
          {article.shortDescription}
        </p>
      )}

      {/* Date */}
      <p
        style={{
          color: 'var(--tqf-muted)',
          fontSize: '0.7rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          opacity: 0.7,
        }}
      >
        {date}
      </p>
    </Link>
  );
}
