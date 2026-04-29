'use client';

import { getPublishedFurnitureItems } from '@/actions/furniture/furniture-crud';
import { usePlannerAuth } from '@/context/PlannerAuthContext';
import { FurnitureItem } from '@/lib/planner-types';
import {
  Armchair, Flower2, Lock, Sofa, Sparkles, Square,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// ── Category color palette ────────────────────────────────────────────────────

const PALETTE = [
  { bg: '#f0ead9', icon: '#c4b49a' },
  { bg: '#e8dded', icon: '#b09ab8' },
  { bg: '#dde8d9', icon: '#8caa84' },
  { bg: '#e8e0cf', icon: '#b8a882' },
  { bg: '#dde6e8', icon: '#84a4aa' },
  { bg: '#ecdde0', icon: '#c49aa0' },
  { bg: '#e8e8dd', icon: '#a8a884' },
];

function categoryColor(cat: string, allCats: string[]) {
  const idx = allCats.indexOf(cat);
  return PALETTE[(idx >= 0 ? idx : 0) % PALETTE.length];
}

function categoryIcon(cat: string) {
  const lower = cat.toLowerCase();
  if (lower.includes('sedi') || lower.includes('chair'))    return <Armchair className="size-10" />;
  if (lower.includes('divano') || lower.includes('sofa'))   return <Sofa className="size-10" />;
  if (lower.includes('flore') || lower.includes('flower'))  return <Flower2 className="size-10" />;
  if (lower.includes('tavol') || lower.includes('table'))   return <Square className="size-10" strokeWidth={1} />;
  return <Sparkles className="size-10" />;
}

// ── Translations ──────────────────────────────────────────────────────────────

const T = {
  en: {
    tagline: 'LUXURY FLORAL & EVENT DESIGN',
    plannerArea: 'Planner Area',
    navLinks: [
      { href: '/catalog', label: 'Catalog' },
      { href: '/portfolio', label: 'Portfolio' },
      { href: '/#about', label: 'About Us' },
    ],
    heroLabel: 'Our Catalog',
    heroHeadline: 'Elegance in Every Detail',
    heroTagline: 'Crafted in Italy · Delivered in Mexico',
    heroDesc: 'A curated selection of furniture, floral arches and décor elements — designed to transform any venue into a world of its own.',
    all: 'All',
    city: 'City',
    allCities: 'All Cities',
    lockedPrice: 'Reserved Price · Log In',
    noItems: 'No items in this category.',
    ctaLabel: 'Start Your Journey',
    ctaHeadline: "Let's Create Something Unforgettable",
    ctaDesc: 'Every event begins with a conversation. Tell us about your vision.',
    ctaButton: 'Get in Touch',
    footerTagline: 'Luxury Floral Design & Event Production',
    footerCopy: '© 2025 Te Quiero Feliz · Est. 2023',
    footerCities: ['Ciudad de México', 'Cancún', 'Oaxaca', 'Los Cabos', 'Roma'],
  },
  es: {
    tagline: 'DISEÑO FLORAL DE LUJO & PRODUCCIÓN DE EVENTOS',
    plannerArea: 'Área Planner',
    navLinks: [
      { href: '/catalog', label: 'Catálogo' },
      { href: '/portfolio', label: 'Portafolio' },
      { href: '/#about', label: 'Nosotros' },
    ],
    heroLabel: 'Nuestro Catálogo',
    heroHeadline: 'Elegancia en Cada Detalle',
    heroTagline: 'Pensado en Italia · Hecho en México',
    heroDesc: 'Una selección curada de mobiliario, arcos florales y elementos de decoración — diseñados para transformar cualquier venue.',
    all: 'Todo',
    city: 'Ciudad',
    allCities: 'Todas',
    lockedPrice: 'Precio Reservado · Acceder',
    noItems: 'No hay artículos en esta categoría.',
    ctaLabel: 'Comienza Tu Viaje',
    ctaHeadline: 'Creemos Algo Inolvidable Juntos',
    ctaDesc: 'Cada evento que diseñamos comienza con una conversación. Cuéntanos tu visión.',
    ctaButton: 'Contáctanos',
    footerTagline: 'Diseño Floral de Lujo y Producción de Eventos',
    footerCopy: '© 2025 Te Quiero Feliz · Est. 2023',
    footerCities: ['Ciudad de México', 'Cancún', 'Oaxaca', 'Los Cabos', 'Roma'],
  },
  it: {
    tagline: 'DESIGN FLOREALE DI LUSSO & PRODUZIONE EVENTI',
    plannerArea: 'Area Planner',
    navLinks: [
      { href: '/catalog', label: 'Catalogo' },
      { href: '/portfolio', label: 'Portfolio' },
      { href: '/#about', label: 'Chi Siamo' },
    ],
    heroLabel: 'Il Nostro Catalogo',
    heroHeadline: 'Eleganza in Ogni Dettaglio',
    heroTagline: 'Pensato in Italia · Fatto in Messico',
    heroDesc: 'Una selezione curata di mobili, archi floreali ed elementi decorativi — progettati per trasformare ogni venue in un mondo a sé.',
    all: 'Tutto',
    city: 'Città',
    allCities: 'Tutte',
    lockedPrice: 'Prezzo Riservato · Accedi',
    noItems: 'Nessun articolo in questa categoria.',
    ctaLabel: 'Inizia il Tuo Percorso',
    ctaHeadline: 'Creiamo Qualcosa di Indimenticabile',
    ctaDesc: 'Ogni evento che progettiamo inizia con una conversazione. Raccontaci la tua visione.',
    ctaButton: 'Contattaci',
    footerTagline: 'Design Floreale di Lusso e Produzione Eventi',
    footerCopy: '© 2025 Te Quiero Feliz · Est. 2023',
    footerCities: ['Ciudad de México', 'Cancún', 'Oaxaca', 'Los Cabos', 'Roma'],
  },
} as const;

type Lang = keyof typeof T;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CatalogPage() {
  const { plannerUser } = usePlannerAuth();
  const [lang, setLang]         = useState<Lang>('it');
  const [items, setItems]       = useState<FurnitureItem[] | null>(null);
  const [catFilter, setCatFilter]   = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  const t = T[lang];

  useEffect(() => {
    getPublishedFurnitureItems().then(setItems);
  }, []);

  const allCategories = items
    ? Array.from(new Set(items.map(i => i.category))).sort()
    : [];

  const allCities = items
    ? Array.from(new Set(items.flatMap(i => i.cities))).sort()
    : [];

  const filtered = items
    ? items.filter(item => {
        const matchCat  = catFilter  === 'all' || item.category === catFilter;
        const matchCity = cityFilter === 'all' || item.cities.includes(cityFilter);
        return matchCat && matchCity;
      })
    : null;

  const pill = (active: boolean): React.CSSProperties => ({
    fontFamily: 'var(--font-body)',
    fontSize: '0.7rem',
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
    padding: '0.45rem 1.1rem',
    borderRadius: '999px',
    border: active ? '1px solid var(--tqf-bordeaux)' : '1px solid var(--tqf-beige-border)',
    background: active ? 'var(--tqf-bordeaux)' : 'white',
    color: active ? 'white' : 'var(--tqf-dark)',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.15s',
  });

  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)', background: 'var(--tqf-beige)', minHeight: '100vh' }}>

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50"
        style={{ background: 'var(--tqf-beige)', borderBottom: '1px solid var(--tqf-beige-border)', height: '72px' }}
      >
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between gap-8">
          <Link href="/" className="flex items-center gap-3 shrink-0" style={{ textDecoration: 'none' }}>
            <Image src="/logo.png" alt="Te Quiero Feliz" width={56} height={56} className="object-contain"
              style={{ filter: 'invert(11%) sepia(57%) saturate(1200%) hue-rotate(314deg) brightness(80%) contrast(95%)' }} priority />
            <div className="flex flex-col leading-none">
              <span style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-bordeaux)', fontSize: '1.25rem', fontWeight: 600, letterSpacing: '0.02em', lineHeight: 1.1 }}>
                Te Quiero Feliz
              </span>
              <span style={{ color: 'var(--tqf-muted)', fontSize: '0.52rem', letterSpacing: '0.14em', marginTop: '2px', textTransform: 'uppercase' }}>
                {t.tagline}
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {t.navLinks.map(link => (
              <a key={link.href} href={link.href}
                style={{ fontFamily: 'var(--font-body)', color: 'var(--tqf-dark)', fontSize: '0.8rem', letterSpacing: '0.04em', textDecoration: 'none', fontWeight: link.href === '/catalog' ? 500 : 400, opacity: link.href === '/catalog' ? 1 : 0.75, transition: 'opacity 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => { e.currentTarget.style.opacity = link.href === '/catalog' ? '1' : '0.75'; }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-0.5 rounded-full px-1 py-1" style={{ background: 'var(--tqf-beige-dark)', border: '1px solid var(--tqf-beige-border)' }}>
              {(['en', 'es', 'it'] as Lang[]).map(l => (
                <button key={l} onClick={() => setLang(l)}
                  className="rounded-full px-2.5 py-1 text-xs font-medium transition-all"
                  style={{ fontFamily: 'var(--font-body)', letterSpacing: '0.08em', textTransform: 'uppercase', background: lang === l ? 'var(--tqf-bordeaux)' : 'transparent', color: lang === l ? 'var(--tqf-cipria-light)' : 'var(--tqf-muted)', cursor: 'pointer', border: 'none' }}>
                  {l}
                </button>
              ))}
            </div>
            <a href="/planner" className="rounded-full px-5 py-2 text-sm font-medium transition-opacity hover:opacity-80"
              style={{ background: 'var(--tqf-bordeaux)', color: 'var(--tqf-cipria-light)', fontFamily: 'var(--font-body)', letterSpacing: '0.04em', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              {t.plannerArea}
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section style={{ background: 'var(--tqf-bordeaux)' }} className="py-20">
        <div className="max-w-7xl mx-auto px-6 text-center flex flex-col items-center gap-4">
          <span style={{ color: 'var(--tqf-gold)', fontSize: '0.63rem', letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>
            {t.heroLabel}
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-cipria-light)', fontSize: 'clamp(2rem, 5vw, 3.6rem)', fontWeight: 300, lineHeight: 1.1, letterSpacing: '-0.01em', maxWidth: '18ch' }}>
            {t.heroHeadline}
          </h1>
          <span style={{ color: 'var(--tqf-gold)', fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>
            {t.heroTagline}
          </span>
          <p style={{ color: 'var(--tqf-cipria)', fontSize: '0.92rem', lineHeight: 1.75, fontWeight: 300, maxWidth: '50ch', marginTop: '0.25rem' }}>
            {t.heroDesc}
          </p>
        </div>
      </section>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <section style={{ background: 'white', borderBottom: '1px solid var(--tqf-beige-border)', position: 'sticky', top: '72px', zIndex: 40 }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-3">
          {/* Category pills */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setCatFilter('all')} style={pill(catFilter === 'all')}>{t.all}</button>
            {allCategories.map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)} style={pill(catFilter === cat)}>{cat}</button>
            ))}
          </div>

          {/* City pills */}
          {allCities.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', flexShrink: 0 }}>
                {t.city} :
              </span>
              <button onClick={() => setCityFilter('all')} style={pill(cityFilter === 'all')}>{t.allCities}</button>
              {allCities.map(city => (
                <button key={city} onClick={() => setCityFilter(city)} style={pill(cityFilter === city)}>{city}</button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Grid ───────────────────────────────────────────────────────── */}
      <section style={{ background: 'var(--tqf-beige)' }} className="py-16">
        <div className="max-w-7xl mx-auto px-6">

          {/* Loading skeleton */}
          {filtered === null && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ background: 'white' }}>
                  <div style={{ height: '220px', background: '#f0ead9' }} />
                  <div className="p-5 flex flex-col gap-3">
                    <div className="h-3 w-16 rounded" style={{ background: 'var(--tqf-beige-border)' }} />
                    <div className="h-5 w-3/4 rounded" style={{ background: 'var(--tqf-beige-border)' }} />
                    <div className="h-3 w-1/2 rounded" style={{ background: 'var(--tqf-beige-border)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {filtered !== null && filtered.length === 0 && (
            <div className="text-center py-24">
              <p style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>
                {t.noItems}
              </p>
            </div>
          )}

          {/* Cards */}
          {filtered !== null && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filtered.map((item, idx) => {
                const colors = categoryColor(item.category, allCategories);
                return (
                  <CatalogCard
                    key={item.id}
                    item={item}
                    colors={colors}
                    allCategories={allCategories}
                    showPrice={!!plannerUser}
                    lockedLabel={t.lockedPrice}
                    bestseller={idx === 0 && catFilter === 'all' && cityFilter === 'all'}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section style={{ background: 'var(--tqf-bordeaux)' }} className="py-24">
        <div className="max-w-7xl mx-auto px-6 text-center flex flex-col items-center gap-6">
          <span style={{ color: 'var(--tqf-gold)', fontSize: '0.63rem', letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>
            {t.ctaLabel}
          </span>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-cipria-light)', fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 300, lineHeight: 1.15, maxWidth: '22ch' }}>
            {t.ctaHeadline}
          </h2>
          <p style={{ color: 'var(--tqf-cipria)', fontSize: '0.92rem', lineHeight: 1.75, fontWeight: 300, maxWidth: '44ch' }}>
            {t.ctaDesc}
          </p>
          <Link href="/get-in-touch"
            className="rounded-full px-8 py-3.5 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: 'var(--tqf-gold)', color: 'var(--tqf-beige)', fontFamily: 'var(--font-body)', letterSpacing: '0.06em', textDecoration: 'none', marginTop: '0.5rem' }}>
            {t.ctaButton}
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer style={{ background: 'var(--tqf-dark)', borderTop: '1px solid rgba(255,255,255,0.06)' }} className="py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col gap-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex flex-col gap-1">
              <span style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-cipria-light)', fontSize: '1.4rem', fontWeight: 400, letterSpacing: '0.02em' }}>
                Te Quiero Feliz
              </span>
              <span style={{ color: 'var(--tqf-muted)', fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                {t.footerTagline}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {t.footerCities.map(city => (
                <span key={city} style={{ color: 'var(--tqf-muted)', fontSize: '0.8rem', letterSpacing: '0.04em', fontFamily: 'var(--font-body)' }}>
                  {city}
                </span>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem' }}>
            <p style={{ color: 'var(--tqf-muted)', fontSize: '0.72rem', letterSpacing: '0.06em', fontFamily: 'var(--font-body)' }}>
              {t.footerCopy}
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

function CatalogCard({
  item, colors, allCategories, showPrice, lockedLabel, bestseller,
}: {
  item: FurnitureItem;
  colors: { bg: string; icon: string };
  allCategories: string[];
  showPrice: boolean;
  lockedLabel: string;
  bestseller: boolean;
}) {
  const MAX_CITIES = 2;
  const visibleCities = item.cities.slice(0, MAX_CITIES);
  const extraCities   = item.cities.length - MAX_CITIES;

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col group"
      style={{ background: 'white', cursor: 'default', transition: 'transform 0.2s, box-shadow 0.2s' }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(92,26,40,0.08)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {/* Image area */}
      <div className="relative flex items-center justify-center" style={{ height: '220px', background: item.images?.[0] ? '#f0ead9' : colors.bg, overflow: 'hidden' }}>
        {item.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ color: colors.icon, opacity: 0.6 }}>
            {categoryIcon(item.category)}
          </span>
        )}

        {/* Bestseller badge */}
        {bestseller && (
          <span style={{
            position: 'absolute', top: '0.9rem', left: '0.9rem',
            background: 'var(--tqf-bordeaux)', color: 'white',
            fontSize: '0.56rem', letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '4px 10px', borderRadius: '4px',
            fontFamily: 'var(--font-body)', fontWeight: 600,
          }}>
            Bestseller
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Category · description */}
        <p style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', lineHeight: 1.4 }}>
          {item.category}{item.description ? ` · ${item.description}` : ''}
        </p>

        {/* Name */}
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontSize: '1.25rem', fontWeight: 400, lineHeight: 1.2 }}>
          {item.name}
        </h3>

        {/* City tags */}
        {item.cities.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {visibleCities.map(city => (
              <span key={city} style={{
                fontSize: '0.6rem', letterSpacing: '0.06em', textTransform: 'uppercase',
                padding: '2px 8px', borderRadius: '4px',
                border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)',
                fontFamily: 'var(--font-body)', background: 'var(--tqf-beige)',
              }}>
                {city}
              </span>
            ))}
            {extraCities > 0 && (
              <span style={{
                fontSize: '0.6rem', letterSpacing: '0.06em',
                padding: '2px 8px', borderRadius: '4px',
                border: '1px solid var(--tqf-beige-border)', color: 'var(--tqf-muted)',
                fontFamily: 'var(--font-body)', background: 'var(--tqf-beige)',
              }}>
                +{extraCities}
              </span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="mt-auto pt-2" style={{ borderTop: '1px solid var(--tqf-beige-border)' }}>
          {showPrice ? (
            <p style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--tqf-dark)', fontFamily: 'var(--font-body)' }}>
              {item.price.toLocaleString('es-MX')} {item.currency ?? 'MXN'}
            </p>
          ) : (
            <a href="/planner" className="flex items-center gap-1.5 transition-opacity hover:opacity-70" style={{ textDecoration: 'none' }}>
              <Lock style={{ width: '11px', height: '11px', color: 'var(--tqf-muted)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {lockedLabel}
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
