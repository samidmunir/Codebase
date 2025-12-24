// src/components/OurWork.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useTheme } from "../../contexts/Theme";

// Optional: use your own icons if you already have lucide installed
import { ArrowRight, X, ChevronLeft, ChevronRight } from "lucide-react";
import IMG_1 from "../../assets/IMG_1.jpg";
import IMG_2 from "../../assets/IMG_2.jpg";
import IMG_3 from "../../assets/IMG_3.jpg";
import IMG_4 from "../../assets/IMG_4.jpg";
import IMG_5 from "../../assets/IMG_5.jpg";
import IMG_6 from "../../assets/IMG_6.jpg";

/**
 * Props:
 *  - items: Array<{ id?: string|number, src: string, alt?: string, category?: string, location?: string, title?: string }>
 *  - title?: string
 *  - subtitle?: string
 */
const Works = ({
  items = [
    {
      id: 0,
      src: IMG_1,
      alt: "Image 1",
      category: "Ambiance",
      location: "Slough, UK",
      title: "BMW M140i",
    },
    {
      id: 1,
      src: IMG_2,
      alt: "Image 2",
      category: "Ambiance",
      location: "Slough, UK",
      title: "BMW M140i",
    },
    {
      id: 3,
      src: IMG_3,
      alt: "Image 3",
      category: "Ambiance",
      location: "Slough, UK",
      title: "BMW M140i",
    },
    {
      id: 4,
      src: IMG_4,
      alt: "Image 4",
      category: "Ambiance",
      location: "Slough, UK",
      title: "Audi A5 Quattro",
    },
    {
      id: 5,
      src: IMG_5,
      alt: "Image 5",
      category: "Ambiance",
      location: "Slough, UK",
      title: "Mercedes Benz CLA250",
    },
    {
      id: 6,
      src: IMG_6,
      alt: "Image 6",
      category: "Ambiance",
      location: "Slough, UK",
      title: "BMW M140i",
    },
  ],
  title = "Our Work",
  subtitle = "A peek at recent builds. Precision, finish, and detail — every time.",
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [activeCategory, setActiveCategory] = useState("All");
  const [openIndex, setOpenIndex] = useState(null);

  const categories = useMemo(() => {
    const set = new Set(["All"]);
    items.forEach((it) => it.category && set.add(it.category));
    return Array.from(set);
  }, [items]);

  const filtered = useMemo(() => {
    if (activeCategory === "All") return items;
    return items.filter((it) => it.category === activeCategory);
  }, [items, activeCategory]);

  const surface = isDark
    ? "border-zinc-900 bg-zinc-950/40"
    : "border-zinc-200 bg-white/60";

  const surfaceInner = isDark
    ? "border-zinc-900 bg-zinc-950/30"
    : "border-zinc-200 bg-white/50";

  const muted = isDark ? "text-zinc-300" : "text-zinc-700";
  const subtle = isDark ? "text-zinc-500" : "text-zinc-500";

  // Lightbox keyboard controls
  useEffect(() => {
    if (openIndex === null) return;

    const onKey = (e) => {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowLeft") setOpenIndex((i) => (i > 0 ? i - 1 : i));
      if (e.key === "ArrowRight")
        setOpenIndex((i) => (i < filtered.length - 1 ? i + 1 : i));
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, filtered.length]);

  const open = (idx) => setOpenIndex(idx);
  const close = () => setOpenIndex(null);
  const prev = () => setOpenIndex((i) => (i > 0 ? i - 1 : i));
  const next = () => setOpenIndex((i) => (i < filtered.length - 1 ? i + 1 : i));

  return (
    <section
      className={[
        "relative w-full px-8 overflow-hidden transition-all duration-3000",
        isDark ? "bg-zinc-950/90 text-zinc-50" : "bg-zinc-50/90 text-zinc-950",
      ].join(" ")}
      aria-label="Our work gallery"
    >
      {/* Ambient backdrops (matches TTC rose/sky vibe) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-rose-500/15 blur-3xl" />
        <div className="absolute -bottom-44 left-1/3 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-sky-500/15 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.14) 1px, transparent 0)",
            backgroundSize: "28px 28px",
            maskImage:
              "radial-gradient(ellipse at center, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 78%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 78%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-8xl px-8 py-12 sm:py-14 lg:py-16">
        {/* Header */}
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-wide",
                  isDark
                    ? "border-zinc-900 bg-white/5 text-zinc-100"
                    : "border-zinc-200 bg-black/5 text-zinc-800",
                ].join(" ")}
              >
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Builds
              </span>

              <span
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-wide",
                  isDark
                    ? "border-zinc-900 bg-white/5 text-zinc-100"
                    : "border-zinc-200 bg-black/5 text-zinc-800",
                ].join(" ")}
              >
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                Detailing
              </span>

              <span
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-wide",
                  isDark
                    ? "border-zinc-900 bg-white/5 text-zinc-100"
                    : "border-zinc-200 bg-black/5 text-zinc-800",
                ].join(" ")}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Performance
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold uppercase leading-tight">
              {title}{" "}
              <span className="bg-gradient-to-r from-rose-300 to-sky-200 bg-clip-text text-transparent">
                Showcase
              </span>
            </h2>

            <p
              className={["text-base sm:text-lg leading-relaxed", muted].join(
                " "
              )}
            >
              {subtitle}
            </p>
          </div>

          {/* Filters */}
          <div className="w-full lg:w-auto">
            <div className={["rounded-2xl border p-3", surface].join(" ")}>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const active = c === activeCategory;
                  return (
                    <button
                      key={c}
                      onClick={() => setActiveCategory(c)}
                      className={[
                        "rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300",
                        "border",
                        active
                          ? "border-rose-500/50 bg-rose-500/10 text-rose-200"
                          : isDark
                          ? "border-zinc-900 bg-white/5 text-zinc-200 hover:bg-white/10"
                          : "border-zinc-200 bg-black/5 text-zinc-800 hover:bg-black/10",
                      ].join(" ")}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              <p className={["mt-2 text-xs", subtle].join(" ")}>
                Tip: click any image to open a full-size preview.
              </p>
            </div>
          </div>
        </header>

        {/* Gallery */}
        <div className="mt-8">
          {filtered.length === 0 ? (
            <div
              className={["rounded-2xl border p-8 text-center", surface].join(
                " "
              )}
            >
              <p className={["text-base", muted].join(" ")}>
                No images yet for{" "}
                <span className="font-semibold">{activeCategory}</span>.
              </p>
              <p className={["mt-1 text-sm", subtle].join(" ")}>
                Add items to the{" "}
                <code className="px-1 py-0.5 rounded bg-black/10">items</code>{" "}
                prop and you’re set.
              </p>
            </div>
          ) : (
            <div
              className={[
                // responsive “stacking” layout: 1 col mobile, 2 col sm, 3 col lg
                "columns-1 sm:columns-2 lg:columns-3",
                "gap-4 [column-fill:_balance]",
              ].join(" ")}
            >
              {filtered.map((it, idx) => (
                <button
                  key={it.id ?? `${it.src}-${idx}`}
                  onClick={() => open(idx)}
                  className={[
                    "group mb-4 w-full break-inside-avoid",
                    "rounded-2xl border overflow-hidden text-left",
                    surfaceInner,
                    "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_60px_rgba(0,0,0,0.25)]",
                  ].join(" ")}
                >
                  <div className="relative">
                    <img
                      src={it.src}
                      alt={it.alt ?? it.title ?? "TTC work"}
                      className="h-auto w-full object-cover"
                      loading="lazy"
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute left-4 right-4 bottom-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">
                              {it.title ?? "Top Tier Build"}
                            </p>
                            <p className="text-xs text-white/70 truncate">
                              {it.category ?? "Work"}
                              {it.location ? ` • ${it.location}` : ""}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                            View <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Caption row (always visible) */}
                  <div className="p-4">
                    <p
                      className={[
                        "text-sm font-bold truncate",
                        isDark ? "text-zinc-50" : "text-zinc-950",
                      ].join(" ")}
                    >
                      {it.title ?? "Top Tier Build"}
                    </p>
                    <p className={["mt-1 text-xs truncate", muted].join(" ")}>
                      {it.category ?? "Work"}
                      {it.location ? ` • ${it.location}` : ""}{" "}
                      <span className="mx-2 opacity-40">•</span>{" "}
                      <span className={subtle}>Tap to expand</span>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {openIndex !== null && filtered[openIndex] ? (
        <div className="fixed inset-0 z-[999]">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={close}
            aria-hidden="true"
          />
          <div className="relative mx-auto flex h-full max-w-6xl items-center justify-center px-4 sm:px-8">
            <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
              {/* Top bar */}
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">
                    {filtered[openIndex].title ?? "TTC Work"}
                  </p>
                  <p className="truncate text-xs text-white/60">
                    {filtered[openIndex].category ?? "Work"}
                    {filtered[openIndex].location
                      ? ` • ${filtered[openIndex].location}`
                      : ""}
                  </p>
                </div>

                <button
                  onClick={close}
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Image */}
              <div className="relative">
                <img
                  src={filtered[openIndex].src}
                  alt={
                    filtered[openIndex].alt ??
                    filtered[openIndex].title ??
                    "TTC work"
                  }
                  className="max-h-[75vh] w-full object-contain bg-black"
                />

                {/* Nav buttons */}
                <button
                  onClick={prev}
                  disabled={openIndex === 0}
                  className={[
                    "absolute left-3 top-1/2 -translate-y-1/2",
                    "rounded-xl border border-white/10 bg-white/5 p-2 text-white",
                    "hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed",
                  ].join(" ")}
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                <button
                  onClick={next}
                  disabled={openIndex === filtered.length - 1}
                  className={[
                    "absolute right-3 top-1/2 -translate-y-1/2",
                    "rounded-xl border border-white/10 bg-white/5 p-2 text-white",
                    "hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed",
                  ].join(" ")}
                  aria-label="Next"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>

              {/* Footer */}
              <div className="border-t border-white/10 px-4 py-3 text-xs text-white/60">
                Use ← → keys to navigate, Esc to close.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default Works;
