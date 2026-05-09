"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getPortfolioProject, type PortfolioProject } from "@/actions/portfolio/portfolio-crud";
import { ArrowLeft, X, ChevronLeft, ChevronRight } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  indian:    "Indian Wedding",
  jewish:    "Jewish Wedding",
  persian:   "Persian Wedding",
  corporate: "Corporate & Other",
};

export default function PortfolioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [project, setProject] = useState<PortfolioProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    getPortfolioProject(id).then((p) => {
      if (!p || !p.published) {
        router.replace("/portfolio");
        return;
      }
      setProject(p);
      setLoading(false);
    });
  }, [id, router]);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const prevImage = useCallback(() => {
    if (lightboxIndex === null || !project) return;
    setLightboxIndex((lightboxIndex - 1 + project.images.length) % project.images.length);
  }, [lightboxIndex, project]);

  const nextImage = useCallback(() => {
    if (lightboxIndex === null || !project) return;
    setLightboxIndex((lightboxIndex + 1) % project.images.length);
  }, [lightboxIndex, project]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, closeLightbox, prevImage, nextImage]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--tqf-beige)" }}
      >
        <div
          className="size-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--tqf-bordeaux)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div style={{ fontFamily: "var(--font-body)", color: "var(--tqf-dark)", backgroundColor: "var(--tqf-beige)" }}>

      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav
        style={{ backgroundColor: "var(--tqf-beige)", borderBottom: "1px solid var(--tqf-beige-border)", height: "72px" }}
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
              style={{ filter: "invert(9%) sepia(80%) saturate(900%) hue-rotate(308deg) brightness(145%)" }}
              priority
            />
            <div className="flex flex-col leading-none">
              <span style={{ fontFamily: "var(--font-display)", color: "var(--tqf-bordeaux)", fontSize: "1.25rem", fontWeight: 600, letterSpacing: "0.02em", lineHeight: 1.1 }}>
                Te Quiero Feliz
              </span>
              <span style={{ color: "var(--tqf-muted)", fontSize: "0.52rem", letterSpacing: "0.14em", marginTop: "2px" }}>
                LUXURY FLORAL & EVENT DESIGN
              </span>
            </div>
          </Link>

          <Link
            href="/portfolio"
            className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
            style={{ color: "var(--tqf-muted)", fontFamily: "var(--font-body)", textDecoration: "none" }}
          >
            <ArrowLeft className="size-4" />
            Portfolio
          </Link>
        </div>
      </nav>

      {/* ── Hero / cover ───────────────────────────────────────────── */}
      <section style={{ backgroundColor: "var(--tqf-bordeaux)" }} className="py-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-5 text-center">
          <span
            style={{ color: "var(--tqf-gold)", fontSize: "0.62rem", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "var(--font-body)" }}
          >
            {CATEGORY_LABELS[project.category] ?? project.category}
          </span>
          <h1
            style={{ fontFamily: "var(--font-display)", color: "var(--tqf-cipria-light)", fontSize: "clamp(2.2rem, 5vw, 3.8rem)", fontWeight: 300, lineHeight: 1.1, letterSpacing: "-0.01em" }}
          >
            {project.title}
          </h1>
          {(project.location || project.year) && (
            <p style={{ color: "var(--tqf-cipria)", fontSize: "0.82rem", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-body)" }}>
              {[project.location, project.year].filter(Boolean).join(" · ")}
            </p>
          )}
          {project.description && (
            <p style={{ color: "var(--tqf-cipria)", fontSize: "0.95rem", lineHeight: 1.75, fontWeight: 300, maxWidth: "52ch", marginTop: "0.25rem" }}>
              {project.description}
            </p>
          )}
        </div>
      </section>

      {/* ── Cover image full-width ─────────────────────────────────── */}
      {project.coverImage && (
        <div
          style={{ backgroundColor: "var(--tqf-bordeaux)", cursor: "pointer" }}
          onClick={() => setLightboxIndex(project.images.indexOf(project.coverImage) ?? 0)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={project.coverImage}
            alt={project.title}
            style={{ width: "100%", maxHeight: "70vh", objectFit: "cover", display: "block" }}
          />
        </div>
      )}

      {/* ── Gallery grid ───────────────────────────────────────────── */}
      {project.images.length > 0 && (
        <section style={{ backgroundColor: "var(--tqf-beige)" }} className="py-16">
          <div className="max-w-7xl mx-auto px-6">
            {project.images.length > 1 && (
              <p
                className="mb-8 text-xs uppercase tracking-widest"
                style={{ color: "var(--tqf-muted)", fontFamily: "var(--font-body)" }}
              >
                {project.images.length} photos
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {project.images.map((url, idx) => (
                <div
                  key={url}
                  className="group relative rounded-xl overflow-hidden cursor-pointer"
                  style={{ aspectRatio: "1", backgroundColor: "var(--tqf-beige-dark)" }}
                  onClick={() => setLightboxIndex(idx)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`${project.title} — foto ${idx + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.3s" }}
                    className="group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    style={{ background: "rgba(26,15,10,0.25)" }}
                  >
                    <span style={{ color: "white", fontSize: "1.5rem" }}>+</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ────────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: "var(--tqf-bordeaux)" }} className="py-20">
        <div className="max-w-7xl mx-auto px-6 text-center flex flex-col items-center gap-5">
          <span style={{ color: "var(--tqf-gold)", fontSize: "0.65rem", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "var(--font-body)" }}>
            Start Your Journey
          </span>
          <h2 style={{ fontFamily: "var(--font-display)", color: "var(--tqf-cipria-light)", fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 300, lineHeight: 1.15, maxWidth: "22ch" }}>
            Let&apos;s Create Something Unforgettable
          </h2>
          <div className="flex gap-3 mt-2 flex-wrap justify-center">
            <Link
              href="/get-in-touch"
              className="rounded-full px-8 py-3.5 text-sm font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: "var(--tqf-gold)", color: "var(--tqf-beige)", fontFamily: "var(--font-body)", letterSpacing: "0.06em", textDecoration: "none" }}
            >
              Get in Touch
            </Link>
            <Link
              href="/portfolio"
              className="rounded-full px-8 py-3.5 text-sm font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: "transparent", border: "1px solid var(--tqf-cipria)", color: "var(--tqf-cipria-light)", fontFamily: "var(--font-body)", letterSpacing: "0.06em", textDecoration: "none" }}
            >
              Back to Portfolio
            </Link>
          </div>
        </div>
      </section>

      {/* ── Lightbox ───────────────────────────────────────────────── */}
      {lightboxIndex !== null && project.images[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(26,15,10,0.95)" }}
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 size-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
            style={{ background: "rgba(255,255,255,0.1)", color: "white" }}
            onClick={closeLightbox}
          >
            <X className="size-5" />
          </button>

          {/* Prev */}
          {project.images.length > 1 && (
            <button
              className="absolute left-4 size-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ background: "rgba(255,255,255,0.1)", color: "white" }}
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
            >
              <ChevronLeft className="size-5" />
            </button>
          )}

          {/* Image */}
          <div
            className="relative max-w-5xl w-full mx-16"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.images[lightboxIndex]}
              alt={`${project.title} — foto ${lightboxIndex + 1}`}
              style={{ width: "100%", maxHeight: "85vh", objectFit: "contain", display: "block", borderRadius: "0.75rem" }}
            />
            {project.images.length > 1 && (
              <p
                className="text-center mt-3 text-xs"
                style={{ color: "rgba(232,196,180,0.5)", fontFamily: "var(--font-body)", letterSpacing: "0.1em" }}
              >
                {lightboxIndex + 1} / {project.images.length}
              </p>
            )}
          </div>

          {/* Next */}
          {project.images.length > 1 && (
            <button
              className="absolute right-4 size-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ background: "rgba(255,255,255,0.1)", color: "white" }}
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
            >
              <ChevronRight className="size-5" />
            </button>
          )}
        </div>
      )}

    </div>
  );
}
