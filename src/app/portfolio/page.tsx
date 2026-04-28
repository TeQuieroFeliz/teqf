"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { getPortfolioProjects, type PortfolioProject } from "@/actions/portfolio/portfolio-crud";

const content = {
  en: {
    nav: {
      tagline: "LUXURY FLORAL & EVENT DESIGN",
      planner: "Planner Area",
      links: [
        { href: "/catalog", label: "Catalog" },
        { href: "/portfolio", label: "Portfolio" },
        { href: "/#about", label: "About Us" },
      ],
    },
    hero: {
      label: "Our Work",
      headline: "Every Ceremony, a World of Its Own",
      tagline: "Conceived in Italy · Made in Mexico",
      description:
        "A curated selection of our most meaningful events — Indian, Jewish, and Persian weddings across Mexico and Italy, each designed with precision and devotion.",
    },
    filters: {
      all: "All",
      indian: "Indian Wedding",
      jewish: "Jewish Wedding",
      persian: "Persian Wedding",
      corporate: "Corporate & Other",
    },
    empty: "No projects found in this category.",
    cta: {
      label: "Start Your Journey",
      headline: "Let's Create Something Unforgettable",
      description:
        "Every event we design begins with a conversation. Tell us about your vision — we'll bring it to life.",
      button: "Get in Touch",
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
        { href: "/#about", label: "Nosotros" },
      ],
    },
    hero: {
      label: "Nuestro Trabajo",
      headline: "Cada Ceremonia, un Mundo Propio",
      tagline: "Pensado en Italia · Hecho en México",
      description:
        "Una selección curada de nuestros eventos más significativos — bodas indias, judías y persas en México e Italia, diseñadas con precisión y devoción.",
    },
    filters: {
      all: "Todos",
      indian: "Boda India",
      jewish: "Boda Judía",
      persian: "Boda Persa",
      corporate: "Corporativo & Otros",
    },
    empty: "No hay proyectos en esta categoría.",
    cta: {
      label: "Comienza Tu Viaje",
      headline: "Creemos Algo Inolvidable Juntos",
      description:
        "Cada evento que diseñamos comienza con una conversación. Cuéntanos tu visión — nosotros la haremos realidad.",
      button: "Contáctanos",
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
        { href: "/#about", label: "Chi Siamo" },
      ],
    },
    hero: {
      label: "Il Nostro Lavoro",
      headline: "Ogni Cerimonia, un Mondo a Sé",
      tagline: "Pensato in Italia · Fatto in Messico",
      description:
        "Una selezione curata dei nostri eventi più significativi — matrimoni indiani, ebraici e persiani in Messico e Italia, progettati con precisione e dedizione.",
    },
    filters: {
      all: "Tutti",
      indian: "Matrimonio Indiano",
      jewish: "Matrimonio Ebraico",
      persian: "Matrimonio Persiano",
      corporate: "Corporate & Altro",
    },
    empty: "Nessun progetto in questa categoria.",
    cta: {
      label: "Inizia il Tuo Percorso",
      headline: "Creiamo Qualcosa di Indimenticabile",
      description:
        "Ogni evento che progettiamo inizia con una conversazione. Raccontaci la tua visione — noi la daremo vita.",
      button: "Contattaci",
    },
    footer: {
      tagline: "Design Floreale di Lusso e Produzione Eventi",
      cities: ["Ciudad de México", "Cancún", "Oaxaca", "Los Cabos", "Roma"],
      copy: "© 2025 Te Quiero Feliz · Est. 2023",
    },
  },
} as const;

type Lang = keyof typeof content;
type FilterKey = "all" | "indian" | "jewish" | "persian" | "corporate";

const CATEGORY_LABELS: Record<string, Record<Lang, string>> = {
  indian:    { en: "Indian Wedding",    es: "Boda India",    it: "Matrimonio Indiano"  },
  jewish:    { en: "Jewish Wedding",    es: "Boda Judía",    it: "Matrimonio Ebraico"  },
  persian:   { en: "Persian Wedding",   es: "Boda Persa",    it: "Matrimonio Persiano" },
  corporate: { en: "Corporate & Other", es: "Corporativo",   it: "Corporate & Altro"   },
};

export default function PortfolioPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [projects, setProjects] = useState<PortfolioProject[] | null>(null);
  const t = content[lang];

  useEffect(() => {
    getPortfolioProjects().then((all) =>
      setProjects(all.filter((p) => p.published))
    );
  }, []);

  const filtered =
    projects === null
      ? null
      : activeFilter === "all"
      ? projects
      : projects.filter((p) => p.category === activeFilter);

  const filterKeys: FilterKey[] = ["all", "indian", "jewish", "persian", "corporate"];

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
          <Link href="/" className="flex items-center gap-3 shrink-0" style={{ textDecoration: "none" }}>
            <Image
              src="/logo.png"
              alt="Te Quiero Feliz"
              width={64}
              height={64}
              className="object-contain"
              style={{ filter: "invert(11%) sepia(57%) saturate(1200%) hue-rotate(314deg) brightness(80%) contrast(95%)" }}
              priority
            />
            <div className="flex flex-col leading-none">
              <span style={{ fontFamily: "var(--font-display)", color: "var(--tqf-bordeaux)", fontSize: "1.25rem", fontWeight: 600, letterSpacing: "0.02em", lineHeight: 1.1 }}>
                Te Quiero Feliz
              </span>
              <span style={{ color: "var(--tqf-muted)", fontSize: "0.52rem", letterSpacing: "0.14em", marginTop: "2px" }}>
                {t.nav.tagline}
              </span>
            </div>
          </Link>

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
                  opacity: link.href === "/portfolio" ? 1 : 0.75,
                  fontWeight: link.href === "/portfolio" ? 500 : 400,
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = link.href === "/portfolio" ? "1" : "0.75"; }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-0.5 rounded-full px-1 py-1" style={{ backgroundColor: "var(--tqf-beige-dark)", border: "1px solid var(--tqf-beige-border)" }}>
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
            <a
              href="/planner"
              className="rounded-full px-5 py-2 text-sm font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: "var(--tqf-bordeaux)", color: "var(--tqf-cipria-light)", fontFamily: "var(--font-body)", letterSpacing: "0.04em", textDecoration: "none", whiteSpace: "nowrap" }}
            >
              {t.nav.planner}
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: "var(--tqf-bordeaux)" }} className="py-24">
        <div className="max-w-7xl mx-auto px-6 text-center flex flex-col items-center gap-5">
          <span style={{ color: "var(--tqf-gold)", fontSize: "0.65rem", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "var(--font-body)" }}>
            {t.hero.label}
          </span>
          <h1 style={{ fontFamily: "var(--font-display)", color: "var(--tqf-cipria-light)", fontSize: "clamp(2.2rem, 5vw, 3.8rem)", fontWeight: 300, lineHeight: 1.1, letterSpacing: "-0.01em", maxWidth: "18ch" }}>
            {t.hero.headline}
          </h1>
          <span style={{ color: "var(--tqf-gold)", fontSize: "0.72rem", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "var(--font-body)" }}>
            {t.hero.tagline}
          </span>
          <p style={{ color: "var(--tqf-cipria)", fontSize: "0.95rem", lineHeight: 1.75, fontWeight: 300, maxWidth: "52ch", marginTop: "0.25rem" }}>
            {t.hero.description}
          </p>
        </div>
      </section>

      {/* ── Filter tabs ────────────────────────────────────────────── */}
      <section style={{ backgroundColor: "var(--tqf-bordeaux)", borderBottom: "1px solid var(--tqf-beige-border)" }} className="pb-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-2">
          {filterKeys.map((key) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className="rounded-full px-5 py-2 text-xs font-medium transition-all"
              style={{
                fontFamily: "var(--font-body)",
                letterSpacing: "0.06em",
                border: activeFilter === key ? "1px solid var(--tqf-gold)" : "1px solid rgba(232,196,180,0.25)",
                backgroundColor: activeFilter === key ? "var(--tqf-gold)" : "transparent",
                color: activeFilter === key ? "var(--tqf-beige)" : "var(--tqf-cipria)",
                cursor: "pointer",
              }}
            >
              {t.filters[key]}
            </button>
          ))}
        </div>
      </section>

      {/* ── Portfolio grid ─────────────────────────────────────────── */}
      <section style={{ backgroundColor: "var(--tqf-beige)" }} className="py-20">
        <div className="max-w-7xl mx-auto px-6">

          {/* Loading skeleton */}
          {filtered === null && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl overflow-hidden animate-pulse"
                  style={{ backgroundColor: "#fff", border: "1px solid var(--tqf-beige-border)" }}
                >
                  <div style={{ height: "200px", backgroundColor: "var(--tqf-beige-dark)" }} />
                  <div className="p-5 flex flex-col gap-3">
                    <div className="h-3 w-24 rounded-full" style={{ backgroundColor: "var(--tqf-beige-border)" }} />
                    <div className="h-5 w-3/4 rounded" style={{ backgroundColor: "var(--tqf-beige-border)" }} />
                    <div className="h-3 w-1/2 rounded" style={{ backgroundColor: "var(--tqf-beige-border)" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {filtered !== null && filtered.length === 0 && (
            <div className="text-center py-24">
              <p style={{ color: "var(--tqf-muted)", fontFamily: "var(--font-body)", fontSize: "0.9rem" }}>
                {t.empty}
              </p>
            </div>
          )}

          {/* Projects grid */}
          {filtered !== null && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((project) => (
                <Link
                  key={project.id}
                  href={`/portfolio/${project.id}`}
                  className="group rounded-2xl overflow-hidden flex flex-col"
                  style={{ backgroundColor: "#fff", border: "1px solid var(--tqf-beige-border)", transition: "transform 0.25s, box-shadow 0.25s", textDecoration: "none" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 16px 40px rgba(92,26,40,0.10)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}
                >
                  {/* Cover image */}
                  <div
                    className="relative"
                    style={{ height: "200px", overflow: "hidden", backgroundColor: "var(--tqf-bordeaux)" }}
                  >
                    {project.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={project.coverImage}
                        alt={project.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span style={{ color: "rgba(232,196,180,0.3)", fontSize: "3rem", fontFamily: "var(--font-display)" }}>✦</span>
                      </div>
                    )}
                    {/* Category badge */}
                    <span
                      style={{
                        position: "absolute",
                        top: "1rem",
                        left: "1rem",
                        backgroundColor: "rgba(184,137,74,0.18)",
                        border: "1px solid rgba(184,137,74,0.4)",
                        color: "var(--tqf-gold)",
                        fontSize: "0.58rem",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        padding: "3px 10px",
                        borderRadius: "999px",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {CATEGORY_LABELS[project.category]?.[lang] ?? project.category}
                    </span>
                    {/* Year */}
                    <span
                      style={{
                        position: "absolute",
                        top: "1rem",
                        right: "1rem",
                        color: "rgba(232,196,180,0.7)",
                        fontSize: "0.65rem",
                        letterSpacing: "0.1em",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {project.year}
                    </span>
                  </div>

                  {/* Card body */}
                  <div className="flex flex-col gap-3 p-5 flex-1">
                    <h3
                      style={{ fontFamily: "var(--font-display)", color: "var(--tqf-bordeaux)", fontSize: "1.4rem", fontWeight: 400, lineHeight: 1.15 }}
                    >
                      {project.title}
                    </h3>
                    {project.location && (
                      <div className="flex items-center gap-2">
                        <span style={{ width: "18px", height: "1px", backgroundColor: "var(--tqf-gold)", display: "inline-block", flexShrink: 0 }} />
                        <span style={{ color: "var(--tqf-muted)", fontSize: "0.72rem", letterSpacing: "0.06em", fontFamily: "var(--font-body)" }}>
                          {project.location}
                        </span>
                      </div>
                    )}
                    {project.description && (
                      <p style={{ color: "var(--tqf-dark)", fontSize: "0.85rem", lineHeight: 1.65, fontWeight: 300, flex: 1 }}>
                        {project.description}
                      </p>
                    )}
                    {project.images.length > 1 && (
                      <p style={{ color: "var(--tqf-muted)", fontSize: "0.7rem", letterSpacing: "0.06em", fontFamily: "var(--font-body)" }}>
                        {project.images.length} photos
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: "var(--tqf-bordeaux)" }} className="py-24">
        <div className="max-w-7xl mx-auto px-6 text-center flex flex-col items-center gap-6">
          <span style={{ color: "var(--tqf-gold)", fontSize: "0.65rem", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "var(--font-body)" }}>
            {t.cta.label}
          </span>
          <h2 style={{ fontFamily: "var(--font-display)", color: "var(--tqf-cipria-light)", fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 300, lineHeight: 1.15, maxWidth: "22ch" }}>
            {t.cta.headline}
          </h2>
          <p style={{ color: "var(--tqf-cipria)", fontSize: "0.95rem", lineHeight: 1.75, fontWeight: 300, maxWidth: "44ch" }}>
            {t.cta.description}
          </p>
          <Link
            href="/get-in-touch"
            className="rounded-full px-8 py-3.5 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: "var(--tqf-gold)", color: "var(--tqf-beige)", fontFamily: "var(--font-body)", letterSpacing: "0.06em", textDecoration: "none", marginTop: "0.5rem" }}
          >
            {t.cta.button}
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer style={{ backgroundColor: "var(--tqf-dark)", borderTop: "1px solid rgba(255,255,255,0.06)" }} className="py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col gap-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex flex-col gap-1">
              <span style={{ fontFamily: "var(--font-display)", color: "var(--tqf-cipria-light)", fontSize: "1.4rem", fontWeight: 400, letterSpacing: "0.02em" }}>
                Te Quiero Feliz
              </span>
              <span style={{ color: "var(--tqf-muted)", fontSize: "0.62rem", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                {t.footer.tagline}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {t.footer.cities.map((city) => (
                <a
                  key={city}
                  href="#"
                  style={{ color: "var(--tqf-muted)", fontSize: "0.8rem", letterSpacing: "0.04em", textDecoration: "none", fontFamily: "var(--font-body)", transition: "color 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--tqf-cipria)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--tqf-muted)")}
                >
                  {city}
                </a>
              ))}
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1.5rem" }}>
            <p style={{ color: "var(--tqf-muted)", fontSize: "0.72rem", letterSpacing: "0.06em", fontFamily: "var(--font-body)" }}>
              {t.footer.copy}
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
