"use client";

import { useState } from "react";
import Image from "next/image";

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
      headline1: "Let's Create Something",
      headline2: "Beautiful",
      tagline: "Conceived in Italy · Made in Mexico",
    },
    form: {
      label: "Get in Touch",
      note: "Our team responds within 24 hours.",
      submit: "Send Message",
      namePlaceholder: "Full Name",
      emailPlaceholder: "Email Address",
      phonePlaceholder: "Phone (optional)",
      eventTypeLabel: "Event Type",
      eventCityLabel: "Event City",
      messagePlaceholder: "Tell us about your vision, date, and guest count…",
      eventTypes: ["Indian Wedding", "Jewish Wedding", "Persian Wedding", "Other"],
      eventCities: ["Ciudad de México", "Cancún / Riviera Maya", "Oaxaca", "Los Cabos", "Roma / Italy", "Other"],
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
      headline1: "Creemos Algo",
      headline2: "Hermoso",
      tagline: "Pensado en Italia · Hecho en México",
    },
    form: {
      label: "Contáctanos",
      note: "Nuestro equipo responderá en menos de 24 horas.",
      submit: "Enviar Mensaje",
      namePlaceholder: "Nombre Completo",
      emailPlaceholder: "Correo Electrónico",
      phonePlaceholder: "Teléfono (opcional)",
      eventTypeLabel: "Tipo de Evento",
      eventCityLabel: "Ciudad del Evento",
      messagePlaceholder: "Cuéntanos sobre tu visión, fecha y número de invitados…",
      eventTypes: ["Boda India", "Boda Judía", "Boda Persa", "Otro"],
      eventCities: ["Ciudad de México", "Cancún / Riviera Maya", "Oaxaca", "Los Cabos", "Roma / Italia", "Otro"],
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
      headline1: "Creiamo Qualcosa di",
      headline2: "Bellissimo",
      tagline: "Pensato in Italia · Fatto in Messico",
    },
    form: {
      label: "Contattaci",
      note: "Il nostro team risponderà entro 24 ore.",
      submit: "Invia Messaggio",
      namePlaceholder: "Nome Completo",
      emailPlaceholder: "Indirizzo Email",
      phonePlaceholder: "Telefono (opzionale)",
      eventTypeLabel: "Tipo di Evento",
      eventCityLabel: "Città dell'Evento",
      messagePlaceholder: "Raccontaci la tua visione, la data e il numero di ospiti…",
      eventTypes: ["Matrimonio Indiano", "Matrimonio Ebraico", "Matrimonio Persiano", "Altro"],
      eventCities: ["Ciudad de México", "Cancún / Riviera Maya", "Oaxaca", "Los Cabos", "Roma / Italia", "Altro"],
    },
    footer: {
      tagline: "Design Floreale di Lusso e Produzione Eventi",
      cities: ["Ciudad de México", "Cancún", "Oaxaca", "Los Cabos", "Roma"],
      copy: "© 2025 Te Quiero Feliz · Est. 2023",
    },
  },
} as const;

type Lang = keyof typeof content;

const inputStyle: React.CSSProperties = {
  backgroundColor: "var(--tqf-beige-dark)",
  border: "1px solid var(--tqf-beige-border)",
  borderRadius: "0.75rem",
  padding: "0.875rem 1rem",
  fontFamily: "var(--font-body)",
  fontSize: "0.875rem",
  color: "var(--tqf-dark)",
  outline: "none",
  width: "100%",
};

export default function GetInTouchPage() {
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

          {/* Logo */}
          <a href="/" style={{ textDecoration: "none" }} className="flex items-center gap-3 shrink-0">
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
          </a>

          {/* Center nav links */}
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

          {/* Right: lang switcher + CTA */}
          <div className="flex items-center gap-3 shrink-0">
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
        className="py-24 flex items-center"
      >
        <div className="max-w-7xl mx-auto px-6 w-full text-center flex flex-col items-center gap-5">
          <span
            style={{
              color: "var(--tqf-gold)",
              fontSize: "0.65rem",
              letterSpacing: "0.22em",
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
            {t.hero.headline1}{" "}
            <em
              style={{
                color: "var(--tqf-gold)",
                fontStyle: "italic",
                fontWeight: 300,
              }}
            >
              {t.hero.headline2}
            </em>
          </h1>
        </div>
      </section>

      {/* ── Contact Form ───────────────────────────────────────────── */}
      <section
        style={{ backgroundColor: "var(--tqf-beige)" }}
        className="py-24"
      >
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-12 flex flex-col gap-3">
            <span
              style={{
                color: "var(--tqf-gold)",
                fontSize: "0.65rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontFamily: "var(--font-body)",
              }}
            >
              {t.form.label}
            </span>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">

            {/* Row 1: Name + Email */}
            <div className="grid sm:grid-cols-2 gap-4">
              <input
                type="text"
                required
                placeholder={t.form.namePlaceholder}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tqf-bordeaux)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tqf-beige-border)")}
              />
              <input
                type="email"
                required
                placeholder={t.form.emailPlaceholder}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tqf-bordeaux)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tqf-beige-border)")}
              />
            </div>

            {/* Row 2: Phone */}
            <input
              type="tel"
              placeholder={t.form.phonePlaceholder}
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tqf-bordeaux)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tqf-beige-border)")}
            />

            {/* Row 3: Event Type + City */}
            <div className="grid sm:grid-cols-2 gap-4">
              <select
                required
                defaultValue=""
                style={{ ...inputStyle, cursor: "pointer", appearance: "none" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tqf-bordeaux)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tqf-beige-border)")}
              >
                <option value="" disabled>{t.form.eventTypeLabel}</option>
                {t.form.eventTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <select
                required
                defaultValue=""
                style={{ ...inputStyle, cursor: "pointer", appearance: "none" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tqf-bordeaux)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tqf-beige-border)")}
              >
                <option value="" disabled>{t.form.eventCityLabel}</option>
                {t.form.eventCities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* Row 4: Message */}
            <textarea
              required
              rows={5}
              placeholder={t.form.messagePlaceholder}
              style={{ ...inputStyle, resize: "vertical" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tqf-bordeaux)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tqf-beige-border)")}
            />

            {/* Submit */}
            <div className="flex flex-col items-center gap-3 pt-2">
              <button
                type="submit"
                className="rounded-full px-10 py-3 text-sm font-medium transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: "var(--tqf-gold)",
                  color: "var(--tqf-beige)",
                  fontFamily: "var(--font-body)",
                  letterSpacing: "0.06em",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {t.form.submit}
              </button>
              <p
                style={{
                  color: "var(--tqf-muted)",
                  fontSize: "0.72rem",
                  letterSpacing: "0.04em",
                  fontFamily: "var(--font-body)",
                }}
              >
                {t.form.note}
              </p>
            </div>

          </form>
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
