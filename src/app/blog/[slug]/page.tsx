import { getArticleBySlug } from '@/actions/blog/get-article-by-slug';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) notFound();

  const dateString = new Date(article.publishedAt ?? article.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div style={{ fontFamily: 'var(--font-body)', backgroundColor: 'var(--tqf-beige)', minHeight: '100vh' }}>

      {/* ── Navbar ── */}
      <nav
        style={{
          backgroundColor: 'var(--tqf-beige)',
          borderBottom: '1px solid var(--tqf-beige-border)',
          height: '72px',
        }}
        className="sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3" style={{ textDecoration: 'none' }}>
            <Image
              src="/logo.png"
              alt="Te Quiero Feliz"
              width={48}
              height={48}
              className="object-contain"
              style={{ filter: 'invert(11%) sepia(57%) saturate(1200%) hue-rotate(314deg) brightness(80%) contrast(95%)' }}
            />
            <span
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--tqf-bordeaux)',
                fontSize: '1.15rem',
                fontWeight: 600,
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
              fontSize: '0.8rem',
              letterSpacing: '0.06em',
              textDecoration: 'none',
              fontFamily: 'var(--font-body)',
            }}
          >
            ← Back to home
          </Link>
        </div>
      </nav>

      {/* ── Article header ── */}
      <header style={{ backgroundColor: 'var(--tqf-bordeaux)' }} className="py-20">
        <div className="max-w-3xl mx-auto px-6">

          {/* Category */}
          <span
            style={{
              color: 'var(--tqf-gold)',
              fontSize: '0.65rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-body)',
              display: 'block',
              marginBottom: '1.25rem',
            }}
          >
            {article.category}
          </span>

          {/* Title */}
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--tqf-cipria-light)',
              fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
              fontWeight: 300,
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
              marginBottom: '1.5rem',
            }}
          >
            {article.title}
          </h1>

          {/* Date */}
          <p
            style={{
              color: 'var(--tqf-cipria)',
              fontSize: '0.8rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-body)',
              marginBottom: article.shortDescription ? '1.75rem' : '0',
            }}
          >
            {dateString}
          </p>

          {/* Short description / lead */}
          {article.shortDescription && (
            <>
              <div
                style={{
                  height: '1px',
                  background: 'rgba(232,196,180,0.2)',
                  marginBottom: '1.75rem',
                }}
              />
              <p
                style={{
                  color: 'var(--tqf-cipria)',
                  fontSize: '1.1rem',
                  lineHeight: 1.7,
                  fontWeight: 300,
                  fontStyle: 'italic',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {article.shortDescription}
              </p>
            </>
          )}
        </div>
      </header>

      {/* ── Article content ── */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        <div
          className="tqf-prose"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
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
