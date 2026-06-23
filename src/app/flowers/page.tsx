'use client';

import { getPublishedInspirationItems, type InspirationItem } from '@/actions/flowers/inspiration-crud';
import { useLangContext } from '@/context/LangContext';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const content = {
  en: {
    nav: { back: 'Home', label: 'FLORAL INSPIRATION' },
    headline: 'Floral Inspiration',
    tagline: 'A visual guide to our decoration styles',
    all: 'All',
    empty: 'No images yet in this category.',
    footer: '© 2025 Te Quiero Feliz',
  },
  es: {
    nav: { back: 'Inicio', label: 'INSPIRACIÓN FLORAL' },
    headline: 'Inspiración Floral',
    tagline: 'Una guía visual de nuestros estilos de decoración',
    all: 'Todo',
    empty: 'Aún no hay imágenes en esta categoría.',
    footer: '© 2025 Te Quiero Feliz',
  },
} as const;

function Lightbox({ item, onClose, onPrev, onNext, hasPrev, hasNext }: {
  item: InspirationItem; onClose: () => void;
  onPrev: () => void; onNext: () => void;
  hasPrev: boolean; hasNext: boolean;
}) {
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext) onNext();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      onClick={onClose}>
      <button onClick={e => { e.stopPropagation(); onClose(); }}
        className="absolute top-5 right-5 size-10 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
        style={{ background: 'rgba(255,255,255,0.12)', color: 'white' }}>
        <X className="size-5" />
      </button>
      {hasPrev && (
        <button onClick={e => { e.stopPropagation(); onPrev(); }}
          className="absolute left-5 size-12 flex items-center justify-center rounded-full text-2xl transition-opacity hover:opacity-70"
          style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
          ‹
        </button>
      )}
      {hasNext && (
        <button onClick={e => { e.stopPropagation(); onNext(); }}
          className="absolute right-5 size-12 flex items-center justify-center rounded-full text-2xl transition-opacity hover:opacity-70"
          style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
          ›
        </button>
      )}
      <div className="flex flex-col items-center gap-4 px-4 sm:px-16" onClick={e => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.imageUrl} alt={item.title || item.category}
          className="rounded-xl object-contain"
          style={{ maxHeight: '80vh', maxWidth: '90vw' }} />
        <div className="text-center">
          <span className="inline-block text-xs px-3 py-1 rounded-full mb-2"
            style={{ background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)', letterSpacing: '0.06em' }}>
            {item.category}
          </span>
          {item.title && (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-body)' }}>
              {item.title}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FlowersPage() {
  const { lang, setLang } = useLangContext();
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [lightbox, setLightbox] = useState<{ item: InspirationItem; list: InspirationItem[] } | null>(null);

  const t = content[lang];

  useEffect(() => {
    getPublishedInspirationItems().then(setItems).finally(() => setLoading(false));
  }, []);

  const categories = Array.from(new Set(items.map(i => i.category))).sort();
  const filtered = activeCategory === 'all' ? items : items.filter(i => i.category === activeCategory);

  // Group items by category for display when showing all
  const grouped = categories.reduce<Record<string, InspirationItem[]>>((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat);
    return acc;
  }, {});

  const openLightbox = (item: InspirationItem, list: InspirationItem[]) =>
    setLightbox({ item, list });

  const lightboxIdx = lightbox ? lightbox.list.findIndex(i => i.id === lightbox.item.id) : -1;

  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)', background: 'var(--tqf-beige)', minHeight: '100vh' }}>

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-40 border-b"
        style={{ background: 'var(--tqf-beige)', borderColor: 'var(--tqf-beige-border)', height: '64px' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-75">
              <Image src="/logo.png" alt="Te Quiero Feliz" width={36} height={36}
                className="object-contain"
                style={{ filter: 'invert(9%) sepia(80%) saturate(900%) hue-rotate(308deg) brightness(145%)' }} />
              <div>
                <p style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontSize: '1rem', fontWeight: 300, lineHeight: 1.2 }}>
                  Te Quiero Feliz
                </p>
                <p style={{ color: 'var(--tqf-muted)', fontSize: '0.52rem', letterSpacing: '0.16em' }}>
                  {t.nav.label}
                </p>
              </div>
            </Link>
          </div>
          {/* Lang switcher */}
          <div className="flex items-center gap-0.5 rounded-full px-1 py-1"
            style={{ background: 'var(--tqf-beige-dark)', border: '1px solid var(--tqf-beige-border)' }}>
            {(['en', 'es'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className="rounded-full px-2.5 py-1 text-xs font-medium transition-all uppercase"
                style={{
                  fontFamily: 'var(--font-body)', letterSpacing: '0.08em',
                  background: lang === l ? 'var(--tqf-bordeaux)' : 'transparent',
                  color: lang === l ? 'var(--tqf-cipria-light)' : 'var(--tqf-muted)',
                  border: 'none', cursor: 'pointer',
                }}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="py-14 text-center" style={{ background: 'var(--tqf-bordeaux)' }}>
        <p style={{ color: 'var(--tqf-gold)', fontSize: '0.65rem', letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>
          Te Quiero Feliz
        </p>
        <h1 className="mt-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-cipria-light)', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 300 }}>
          {t.headline}
        </h1>
        <p className="mt-3" style={{ color: 'var(--tqf-cipria)', fontSize: '0.95rem', fontWeight: 300, letterSpacing: '0.04em' }}>
          {t.tagline}
        </p>
      </div>

      {/* ── Category filter ── */}
      <div className="sticky top-16 z-30 border-b py-3"
        style={{ background: 'var(--tqf-beige)', borderColor: 'var(--tqf-beige-border)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex gap-2 flex-wrap">
          {[{ key: 'all', label: t.all }, ...categories.map(c => ({ key: c, label: c }))].map(cat => (
            <button key={cat.key} type="button" onClick={() => setActiveCategory(cat.key)}
              className="text-sm px-4 py-1.5 rounded-full transition-all"
              style={activeCategory === cat.key
                ? { background: 'var(--tqf-bordeaux)', color: 'white', fontFamily: 'var(--font-body)' }
                : { background: 'white', color: 'var(--tqf-bordeaux)', border: '1px solid var(--tqf-cipria)', fontFamily: 'var(--font-body)' }
              }>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Gallery ── */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-10">
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="size-8 rounded-full border-2 animate-spin"
              style={{ borderColor: 'var(--tqf-cipria)', borderTopColor: 'var(--tqf-bordeaux)' }} />
          </div>
        ) : items.length === 0 ? (
          <div className="py-24 text-center">
            <p style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t.empty}</p>
          </div>
        ) : activeCategory === 'all' ? (
          /* Show all, grouped by category */
          <div className="space-y-14">
            {categories.map(cat => (
              <section key={cat}>
                <div className="flex items-center gap-4 mb-5">
                  <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontSize: '1.5rem', fontWeight: 300 }}>
                    {cat}
                  </h2>
                  <div className="flex-1 h-px" style={{ background: 'var(--tqf-beige-border)' }} />
                  <button onClick={() => setActiveCategory(cat)}
                    className="text-xs transition-opacity hover:opacity-70"
                    style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)', letterSpacing: '0.06em', background: 'none', border: 'none', cursor: 'pointer' }}>
                    {t.all} →
                  </button>
                </div>
                <MasonryGrid items={grouped[cat] ?? []} onOpen={(item) => openLightbox(item, grouped[cat] ?? [])} />
              </section>
            ))}
          </div>
        ) : (
          /* Single category */
          filtered.length === 0 ? (
            <div className="py-24 text-center">
              <p style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>{t.empty}</p>
            </div>
          ) : (
            <MasonryGrid items={filtered} onOpen={(item) => openLightbox(item, filtered)} />
          )
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t py-8 text-center"
        style={{ borderColor: 'var(--tqf-beige-border)', background: 'var(--tqf-dark)' }}>
        <p style={{ color: 'var(--tqf-muted)', fontSize: '0.75rem', letterSpacing: '0.06em', fontFamily: 'var(--font-body)' }}>
          {t.footer}
        </p>
      </footer>

      {/* ── Lightbox ── */}
      {lightbox && (
        <Lightbox
          item={lightbox.item}
          onClose={() => setLightbox(null)}
          onPrev={() => setLightbox(prev => prev ? { ...prev, item: prev.list[lightboxIdx - 1] } : null)}
          onNext={() => setLightbox(prev => prev ? { ...prev, item: prev.list[lightboxIdx + 1] } : null)}
          hasPrev={lightboxIdx > 0}
          hasNext={lightbox ? lightboxIdx < lightbox.list.length - 1 : false}
        />
      )}
    </div>
  );
}

// ── Masonry Grid ──────────────────────────────────────────────────────────────
function MasonryGrid({ items, onOpen }: { items: InspirationItem[]; onOpen: (item: InspirationItem) => void }) {
  // 3-column masonry via CSS columns
  return (
    <div className="columns-2 sm:columns-2 md:columns-3 lg:columns-4" style={{ columnGap: '12px' }}>
      {items.map(item => (
        <div key={item.id}
          className="group relative rounded-xl overflow-hidden cursor-pointer mb-3 transition-all hover:shadow-lg"
          style={{ breakInside: 'avoid' }}
          onClick={() => onOpen(item)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.imageUrl} alt={item.title || item.category}
            className="w-full block transition-transform duration-500 group-hover:scale-[1.03]" />
          {/* Hover overlay */}
          <div className="absolute inset-0 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'linear-gradient(to top, rgba(92,26,40,0.75) 0%, transparent 60%)' }}>
            <span className="text-xs px-2 py-0.5 rounded-full self-start mb-1"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white', fontFamily: 'var(--font-body)', letterSpacing: '0.06em', backdropFilter: 'blur(4px)' }}>
              {item.category}
            </span>
            {item.title && (
              <p className="text-xs leading-snug"
                style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-body)' }}>
                {item.title}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
