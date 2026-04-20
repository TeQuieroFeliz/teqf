"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const content = {
  en: {
    nav: {
      tagline: "LUXURY FLORAL & EVENT DESIGN",
      planner: "Planner Area",
      links: [
        { href: "/catalog", label: "Catalog" },
        { href: "/portfolio", label: "Portfolio" },
        { href: "#about", label: "About Us" },
      ],
    },
    hero: {
      headline: "Flowers That Tell Two Worlds",
      tagline: "Conceived in Italy · Made in Mexico",
      description:
        "Luxury floral design and event production for Indian, Jewish, and Persian weddings across Mexico and Italy. Where Italian refinement meets the soul of Mexican craftsmanship.",
      cta1: "Discover Our Work",
      cta2: "Get in Touch",
      stats: [
        { value: "100+", label: "Weddings" },
        { value: "5", label: "Cities" },
        { value: "10 yrs", label: "Experience" },
        { value: "2023", label: "Est." },
      ],
    },
    blog: {
      label: "From the Studio",
      articles: [
        {
          category: "Flowers",
          title: "Why Peonies Dominate Luxury Indian Weddings",
          excerpt: "Their layered petals mirror the richness of embroidered lehengas — a natural match.",
        },
        {
          category: "Color",
          title: "The Art of Jewel Tones in Persian Ceremonies",
          excerpt: "Deep sapphires and burgundies set against candlelight create an opulent intimacy.",
        },
        {
          category: "Composition",
          title: "Chuppah Design: Structure Meets Softness",
          excerpt: "How we balance architectural form with cascading blooms for Jewish ceremonies.",
        },
        {
          category: "Inspiration",
          title: "Italian Botanics in a Mexican Summer",
          excerpt: "Bringing olive branches and garden roses to Riviera Maya without losing local soul.",
        },
      ],
    },
    cities: {
      label: "We work across",
      list: ["Ciudad de México", "Cancún · Riviera Maya", "Oaxaca", "Los Cabos", "Roma · Italia"],
    },
    about: {
      label: "Our Story",
      headline: "Two Cultures, One Floral Language",
      tagline: "Conceived in Italy · Made in Mexico",
      description:
        "Luigi brings Italian precision and a deep reverence for botanical form. Xanath Bañuelos — one of Mexico's foremost wedding planners — brings cultural depth and an unmatched eye for ceremony. Together, they have built a studio that speaks fluently across Indian, Jewish, and Persian traditions.",
      stats: [
        { value: "10+", label: "Years — Xanath Bañuelos" },
        { value: "2023", label: "TQF Founded" },
        { value: "100+", label: "Destination Weddings" },
        { value: "5", label: "Cities · 2 Countries" },
      ],
    },
    footer: {
      tagline: "Luxury Floral Design & Event Production",
      cities: ["Ciudad de México", "Cancún", "Oaxaca", "Los Cabos", "Roma"],
      copy: "© 2025 Te Quiero Feliz · Est. 2023",
    },
  },
  es: {
    nav: {
      tagline: "DISEÑO FLORAL DE LUJO & PRODUCCIÓN DE EVENTOS",
      planner: "Área Planner",
      links: [
        { href: "/catalog", label: "Catálogo" },
        { href: "/portfolio", label: "Portafolio" },
        { href: "#about", label: "Nosotros" },
      ],
    },
    hero: {
      headline: "Flores que cuentan dos mundos",
      tagline: "Pensado en Italia · Hecho en México",
      description:
        "Diseño floral de lujo y producción de eventos para bodas indias, judías y persas en México e Italia. Donde la refinación italiana se une al alma de la artesanía mexicana.",
      cta1: "Descubre Nuestro Trabajo",
      cta2: "Contáctanos",
      stats: [
        { value: "100+", label: "Bodas" },
        { value: "5", label: "Ciudades" },
        { value: "10 años", label: "Experiencia" },
        { value: "2023", label: "Fundación" },
      ],
    },
    blog: {
      label: "Del Estudio",
      articles: [
        {
          category: "Flores",
          title: "Por qué las peonías dominan las bodas indias de lujo",
          excerpt: "Sus pétalos en capas reflejan la riqueza de las lehengas bordadas — una combinación natural.",
        },
        {
          category: "Color",
          title: "El arte de los tonos joya en ceremonias persas",
          excerpt: "Zafiros profundos y borgoñas junto a la luz de las velas crean una intimidad opulenta.",
        },
        {
          category: "Composición",
          title: "Diseño de Chuppah: estructura y suavidad",
          excerpt: "Cómo equilibramos la forma arquitectónica con flores en cascada para ceremonias judías.",
        },
        {
          category: "Inspiración",
          title: "Botánica italiana en un verano mexicano",
          excerpt: "Llevar ramas de olivo y rosas de jardín a la Riviera Maya sin perder el alma local.",
        },
      ],
    },
    cities: {
      label: "Trabajamos en",
      list: ["Ciudad de México", "Cancún · Riviera Maya", "Oaxaca", "Los Cabos", "Roma · Italia"],
    },
    about: {
      label: "Nuestra Historia",
      headline: "Dos culturas, un solo lenguaje floral",
      tagline: "Pensado en Italia · Hecho en México",
      description:
        "Luigi aporta la precisión italiana y una profunda reverencia por la forma botánica. Xanath Bañuelos — una de las principales wedding planners de México — aporta profundidad cultural y un ojo inigualable para la ceremonia. Juntos han construido un estudio que habla fluidamente las tradiciones india, judía y persa.",
      stats: [
        { value: "10+", label: "Años — Xanath Bañuelos" },
        { value: "2023", label: "Fundación TQF" },
        { value: "100+", label: "Bodas de Destino" },
        { value: "5", label: "Ciudades · 2 Países" },
      ],
    },
    footer: {
      tagline: "Diseño Floral de Lujo y Producción de Eventos",
      cities: ["Ciudad de México", "Cancún", "Oaxaca", "Los Cabos", "Roma"],
      copy: "© 2025 Te Quiero Feliz · Est. 2023",
    },
  },
  it: {
    nav: {
      tagline: "DESIGN FLOREALE DI LUSSO & PRODUZIONE EVENTI",
      planner: "Area Planner",
      links: [
        { href: "/catalog", label: "Catalogo" },
        { href: "/portfolio", label: "Portfolio" },
        { href: "#about", label: "Chi Siamo" },
      ],
    },
    hero: {
      headline: "Fiori che raccontano due mondi",
      tagline: "Pensato in Italia · Fatto in Messico",
      description:
        "Design floreale di lusso e produzione eventi per matrimoni indiani, ebraici e persiani in Messico e Italia. Dove la raffinatezza italiana incontra l'anima dell'artigianato messicano.",
      cta1: "Scopri il Nostro Lavoro",
      cta2: "Contattaci",
      stats: [
        { value: "100+", label: "Matrimoni" },
        { value: "5", label: "Città" },
        { value: "10 anni", label: "Esperienza" },
        { value: "2023", label: "Fondazione" },
      ],
    },
    blog: {
      label: "Dallo Studio",
      articles: [
        {
          category: "Fiori",
          title: "Perché le peonie dominano i matrimoni indiani di lusso",
          excerpt: "I loro petali stratificati rispecchiano la ricchezza delle lehenga ricamate — un abbinamento naturale.",
        },
        {
          category: "Colore",
          title: "L'arte dei toni gioiello nelle cerimonie persiane",
          excerpt: "Zaffiri profondi e bordeaux accanto alla luce delle candele creano un'intimità opulenta.",
        },
        {
          category: "Composizione",
          title: "Design della Chuppah: struttura e morbidezza",
          excerpt: "Come bilanciamo la forma architettonica con fiori a cascata per le cerimonie ebraiche.",
        },
        {
          category: "Ispirazione",
          title: "Botanica italiana in un'estate messicana",
          excerpt: "Portare rami d'ulivo e rose da giardino nella Riviera Maya senza perdere l'anima locale.",
        },
      ],
    },
    cities: {
      label: "Lavoriamo a",
      list: ["Ciudad de México", "Cancún · Riviera Maya", "Oaxaca", "Los Cabos", "Roma · Italia"],
    },
    about: {
      label: "La Nostra Storia",
      headline: "Due culture, un solo linguaggio floreale",
      tagline: "Pensato in Italia · Fatto in Messico",
      description:
        "Luigi porta la precisione italiana e un profondo rispetto per la forma botanica. Xanath Bañuelos — una delle principali wedding planner del Messico — porta profondità culturale e un occhio incomparabile per la cerimonia. Insieme hanno costruito uno studio che parla fluentemente le tradizioni indiana, ebraica e persiana.",
      stats: [
        { value: "10+", label: "Anni — Xanath Bañuelos" },
        { value: "2023", label: "Fondazione TQF" },
        { value: "100+", label: "Matrimoni di Destinazione" },
        { value: "5", label: "Città · 2 Paesi" },
      ],
    },
    footer: {
      tagline: "Design Floreale di Lusso e Produzione Eventi",
      cities: ["Ciudad de México", "Cancún", "Oaxaca", "Los Cabos", "Roma"],
      copy: "© 2025 Te Quiero Feliz · Est. 2023",
    },
  },
} as const;

type Lang = keyof typeof content;

export default function HomePage() {
  const [lang, setLang] = useState<Lang>("en");
  const t = content[lang];

  return (
    <div style={{ fontFamily: "var(--font-body)", color: "var(--tqf-dark)", backgroundColor: "var(--tqf-beige)" }}>

      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav
        style={{
          backgroundColor: "var(--tqf-beige)",
          borderBottom: "1px solid var(--tqf-beige-border)",
          height: "72px",
        }}
        className="sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between gap-8">

          {/* ── Logo ── */}
          <div className="flex items-center gap-3 shrink-0">
            <Image
              src="/logo.png"
              alt="Te Quiero Feliz"
              width={64}
              height={64}
              className="object-contain"
              style={{ filter: 'invert(11%) sepia(57%) saturate(1200%) hue-rotate(314deg) brightness(80%) contrast(95%)' }}
              priority
            />
            <div className="flex flex-col leading-none">
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--tqf-bordeaux)",
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                  lineHeight: 1.1,
                }}
              >
                Te Quiero Feliz
              </span>
              <span
                style={{
                  color: "var(--tqf-muted)",
                  fontSize: "0.52rem",
                  letterSpacing: "0.14em",
                  marginTop: "2px",
                }}
              >
                {t.nav.tagline}
              </span>
            </div>
          </div>

          {/* ── Center nav links ── */}
          <nav className="hidden md:flex items-center gap-7">
            {t.nav.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--tqf-dark)",
                  fontSize: "0.8rem",
                  letterSpacing: "0.04em",
                  textDecoration: "none",
                  opacity: 0.75,
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.75")}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* ── Right: lang switcher + CTA ── */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Language switcher */}
            <div
              className="flex items-center gap-0.5 rounded-full px-1 py-1"
              style={{
                backgroundColor: "var(--tqf-beige-dark)",
                border: "1px solid var(--tqf-beige-border)",
              }}
            >
              {(["en", "es", "it"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className="rounded-full px-2.5 py-1 text-xs font-medium transition-all"
                  style={{
                    fontFamily: "var(--font-body)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    backgroundColor: lang === l ? "var(--tqf-bordeaux)" : "transparent",
                    color: lang === l ? "var(--tqf-cipria-light)" : "var(--tqf-muted)",
                    cursor: "pointer",
                    border: "none",
                  }}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Planner CTA */}
            <a
              href="/planner"
              className="rounded-full px-5 py-2 text-sm font-medium transition-opacity hover:opacity-80"
              style={{
                backgroundColor: "var(--tqf-bordeaux)",
                color: "var(--tqf-cipria-light)",
                fontFamily: "var(--font-body)",
                letterSpacing: "0.04em",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              {t.nav.planner}
            </a>
          </div>

        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section
        style={{ backgroundColor: "var(--tqf-bordeaux)" }}
        className="min-h-screen flex items-center"
      >
        <div className="max-w-7xl mx-auto px-6 py-20 w-full grid lg:grid-cols-2 gap-16 items-center">

          {/* Left: copy */}
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <span
                style={{
                  color: "var(--tqf-gold)",
                  fontSize: "0.7rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-body)",
                }}
              >
                {t.hero.tagline}
              </span>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--tqf-cipria-light)",
                  fontSize: "clamp(2.5rem, 5vw, 4rem)",
                  fontWeight: 300,
                  lineHeight: 1.1,
                  letterSpacing: "-0.01em",
                }}
              >
                {t.hero.headline}
              </h1>
              <p
                style={{
                  color: "var(--tqf-cipria)",
                  fontSize: "1rem",
                  lineHeight: 1.7,
                  maxWidth: "44ch",
                  fontWeight: 300,
                }}
              >
                {t.hero.description}
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <a
                href="/portfolio"
                className="rounded-full px-6 py-3 text-sm font-medium transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: "var(--tqf-gold)",
                  color: "var(--tqf-beige)",
                  fontFamily: "var(--font-body)",
                  letterSpacing: "0.04em",
                  textDecoration: "none",
                }}
              >
                {t.hero.cta1}
              </a>
              <Link
                href="/get-in-touch"
                className="rounded-full px-6 py-3 text-sm font-medium transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: "transparent",
                  color: "var(--tqf-cipria-light)",
                  border: "1px solid var(--tqf-cipria)",
                  fontFamily: "var(--font-body)",
                  letterSpacing: "0.04em",
                  textDecoration: "none",
                }}
              >
                {t.hero.cta2}
              </Link>
            </div>

            {/* Stats */}
            <div
              className="grid grid-cols-4 gap-4 pt-4"
              style={{ borderTop: "1px solid rgba(232,196,180,0.2)" }}
            >
              {t.hero.stats.map((s) => (
                <div key={s.label} className="flex flex-col gap-1">
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "var(--tqf-gold)",
                      fontSize: "1.75rem",
                      fontWeight: 300,
                      lineHeight: 1,
                    }}
                  >
                    {s.value}
                  </span>
                  <span
                    style={{
                      color: "var(--tqf-cipria)",
                      fontSize: "0.7rem",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: blog preview grid */}
          <div className="flex flex-col gap-4">
            <span
              style={{
                color: "var(--tqf-gold)",
                fontSize: "0.65rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontFamily: "var(--font-body)",
              }}
            >
              {t.blog.label}
            </span>
            <div className="grid grid-cols-2 gap-4">
              {t.blog.articles.map((article, i) => (
                <a
                  key={i}
                  href="#"
                  className="group flex flex-col gap-2 rounded-2xl p-5 transition-all hover:opacity-90"
                  style={{
                    backgroundColor: "rgba(232,196,180,0.08)",
                    border: "1px solid rgba(232,196,180,0.15)",
                    textDecoration: "none",
                  }}
                >
                  <span
                    style={{
                      color: "var(--tqf-gold)",
                      fontSize: "0.6rem",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {article.category}
                  </span>
                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "var(--tqf-cipria-light)",
                      fontSize: "1rem",
                      fontWeight: 400,
                      lineHeight: 1.35,
                    }}
                  >
                    {article.title}
                  </h3>
                  <p
                    style={{
                      color: "var(--tqf-cipria)",
                      fontSize: "0.78rem",
                      lineHeight: 1.6,
                      fontWeight: 300,
                    }}
                  >
                    {article.excerpt}
                  </p>
                </a>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── Cities strip ───────────────────────────────────────────── */}
      <section
        style={{
          backgroundColor: "var(--tqf-bordeaux)",
          borderTop: "1px solid rgba(232,196,180,0.12)",
          borderBottom: "1px solid rgba(232,196,180,0.12)",
        }}
        className="py-5"
      >
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center gap-2 justify-between">
          <span
            style={{
              color: "var(--tqf-gold)",
              fontSize: "0.65rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontFamily: "var(--font-body)",
            }}
          >
            {t.cities.label}
          </span>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            {t.cities.list.map((city, i) => (
              <span key={i} className="flex items-center gap-8">
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--tqf-cipria-light)",
                    fontSize: "0.95rem",
                    fontWeight: 400,
                    letterSpacing: "0.02em",
                  }}
                >
                  {city}
                </span>
                {i < t.cities.list.length - 1 && (
                  <span style={{ color: "rgba(232,196,180,0.3)", fontSize: "0.5rem" }}>◆</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ──────────────────────────────────────────────────── */}
      <section
        id="about"
        style={{ backgroundColor: "var(--tqf-bordeaux)" }}
        className="py-28"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center mb-16 flex flex-col gap-4">
            <span
              style={{
                color: "var(--tqf-gold)",
                fontSize: "0.65rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontFamily: "var(--font-body)",
              }}
            >
              {t.about.label}
            </span>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--tqf-cipria-light)",
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: 300,
                lineHeight: 1.15,
              }}
            >
              {t.about.headline}
            </h2>
            <p
              style={{
                color: "var(--tqf-gold)",
                fontSize: "0.75rem",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontFamily: "var(--font-body)",
              }}
            >
              {t.about.tagline}
            </p>
            <p
              style={{
                color: "var(--tqf-cipria)",
                fontSize: "0.95rem",
                lineHeight: 1.8,
                fontWeight: 300,
                marginTop: "0.5rem",
              }}
            >
              {t.about.description}
            </p>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {t.about.stats.map((s, i) => (
              <div
                key={i}
                className="rounded-2xl p-6 flex flex-col gap-2 text-center"
                style={{
                  backgroundColor: "rgba(232,196,180,0.06)",
                  border: "1px solid rgba(232,196,180,0.15)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--tqf-gold)",
                    fontSize: "2.5rem",
                    fontWeight: 300,
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </span>
                <span
                  style={{
                    color: "var(--tqf-cipria)",
                    fontSize: "0.7rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    lineHeight: 1.4,
                  }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer
        style={{
          backgroundColor: "var(--tqf-dark)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
        className="py-12"
      >
        <div className="max-w-7xl mx-auto px-6 flex flex-col gap-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            {/* Brand */}
            <div className="flex flex-col gap-1">
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--tqf-cipria-light)",
                  fontSize: "1.4rem",
                  fontWeight: 400,
                  letterSpacing: "0.02em",
                }}
              >
                Te Quiero Feliz
              </span>
              <span
                style={{
                  color: "var(--tqf-muted)",
                  fontSize: "0.62rem",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                {t.footer.tagline}
              </span>
            </div>

            {/* City links */}
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {t.footer.cities.map((city) => (
                <a
                  key={city}
                  href="#"
                  style={{
                    color: "var(--tqf-muted)",
                    fontSize: "0.8rem",
                    letterSpacing: "0.04em",
                    textDecoration: "none",
                    fontFamily: "var(--font-body)",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--tqf-cipria)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--tqf-muted)")}
                >
                  {city}
                </a>
              ))}
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1.5rem" }}>
            <p
              style={{
                color: "var(--tqf-muted)",
                fontSize: "0.72rem",
                letterSpacing: "0.06em",
                fontFamily: "var(--font-body)",
              }}
            >
              {t.footer.copy}
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
