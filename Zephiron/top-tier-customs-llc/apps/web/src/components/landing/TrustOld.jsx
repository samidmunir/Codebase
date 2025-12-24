// src/components/Trust.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../contexts/Theme";

const Icon = ({ name, className = "" }) => {
  const common = "fill-none stroke-current stroke-[1.8]";

  const icons = {
    shield: (
      <svg viewBox="0 0 24 24" className={`${common} ${className}`}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3l7 4v6c0 5-3 9-7 11C8 22 5 18 5 13V7l7-4z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.25 12.5l2 2 3.5-4"
        />
      </svg>
    ),
    wrench: (
      <svg viewBox="0 0 24 24" className={`${common} ${className}`}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 6.5a6 6 0 01-8.4 5.5L7 17.6a2 2 0 01-2.8 0l-.8-.8a2 2 0 010-2.8l5.6-5.6A6 6 0 0117.5 3l-2.2 2.2 3.5 3.5L21 6.5z"
        />
      </svg>
    ),
    bolt: (
      <svg viewBox="0 0 24 24" className={`${common} ${className}`}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 2L3 14h7l-1 8 12-14h-7l-1-6z"
        />
      </svg>
    ),
    crown: (
      <svg viewBox="0 0 24 24" className={`${common} ${className}`}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 7l4.5 6L12 6l3.5 7L20 7l-1.5 12H5.5L4 7z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 21h12" />
      </svg>
    ),
    spark: (
      <svg viewBox="0 0 24 24" className={`${common} ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 12h4" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.6 4.6l2.8 2.8"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.6 16.6l2.8 2.8"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.4 4.6l-2.8 2.8"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.4 16.6l-2.8 2.8"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 7.2l1.2 2.6 2.8.3-2.1 1.8.6 2.8-2.5-1.4-2.5 1.4.6-2.8-2.1-1.8 2.8-.3L12 7.2z"
        />
      </svg>
    ),
    check: (
      <svg viewBox="0 0 24 24" className={`${common} ${className}`}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20 7L10 17l-5-5"
        />
      </svg>
    ),
    arrow: (
      <svg viewBox="0 0 24 24" className={`${common} ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 6l6 6-6 6" />
      </svg>
    ),
  };

  return icons[name] || null;
};

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

const Stat = ({ label, value, hint, isDark }) => (
  <div
    className={[
      "group relative overflow-hidden rounded-2xl border p-5 transition-colors",
      isDark
        ? "border-white/10 bg-white/[0.03]"
        : "border-black/10 bg-black/[0.03]",
      "shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]",
    ].join(" ")}
  >
    <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-rose-500/10 blur-2xl opacity-70 transition-opacity duration-500 group-hover:opacity-100" />
    <div
      className={[
        "text-2xl md:text-3xl font-semibold tracking-tight",
        isDark ? "text-white" : "text-zinc-950",
      ].join(" ")}
    >
      {value}
    </div>
    <div
      className={[
        "mt-1 text-sm",
        isDark ? "text-white/70" : "text-zinc-700",
      ].join(" ")}
    >
      {label}
    </div>
    {hint ? (
      <div
        className={[
          "mt-2 text-xs",
          isDark ? "text-white/50" : "text-zinc-600",
        ].join(" ")}
      >
        {hint}
      </div>
    ) : null}
  </div>
);

const Pill = ({ children, isDark, dot = "rose" }) => (
  <span
    className={[
      "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
      isDark
        ? "border-white/10 bg-white/5 text-white/70"
        : "border-black/10 bg-black/5 text-zinc-700",
    ].join(" ")}
  >
    <span
      className={[
        "h-1.5 w-1.5 rounded-full",
        dot === "rose"
          ? "bg-rose-500/90 shadow-[0_0_16px_rgba(244,63,94,0.35)]"
          : "bg-sky-500/90 shadow-[0_0_16px_rgba(14,165,233,0.35)]",
      ].join(" ")}
    />
    {children}
  </span>
);

const Trust = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [active, setActive] = useState(0);
  const [mx, setMx] = useState(0.5);
  const [my, setMy] = useState(0.4);

  const reasons = useMemo(
    () => [
      {
        icon: "crown",
        title: "Premium craftsmanship",
        desc: "Every build is treated like a flagship. Fitment, finish, and function are dialed until it’s perfect.",
        bullets: [
          "Tight tolerances & clean installs",
          "Detail-first approach",
          "No shortcuts, ever",
        ],
        accent: "rose",
      },
      {
        icon: "shield",
        title: "Trusted + protected",
        desc: "Transparent communication and quality guarantees come standard — your car is treated with respect.",
        bullets: [
          "Clear quotes & timelines",
          "Install checks & QA",
          "Satisfaction-backed work",
        ],
        accent: "sky",
      },
      {
        icon: "bolt",
        title: "Fast, clean turnaround",
        desc: "Efficient scheduling, pro tools, and experience mean less downtime and more drive time.",
        bullets: [
          "Streamlined intake",
          "Predictable workflow",
          "On-time delivery",
        ],
        accent: "rose",
      },
      {
        icon: "wrench",
        title: "Built by specialists",
        desc: "We measure, plan, and execute. Real expertise across customization and performance upgrades.",
        bullets: [
          "Pro-grade tooling",
          "Proven processes",
          "Repeatable quality",
        ],
        accent: "sky",
      },
    ],
    []
  );

  const guarantees = useMemo(
    () => [
      {
        icon: "check",
        title: "Quality-first installs",
        text: "Clean routing, secure mounting, and tested results.",
      },
      {
        icon: "check",
        title: "Transparent pricing",
        text: "No mystery fees — you’ll know what you’re paying for.",
      },
      {
        icon: "check",
        title: "Consistent communication",
        text: "Status updates so you’re never in the dark.",
      },
      {
        icon: "check",
        title: "Care & respect",
        text: "We treat your car like it’s ours — always.",
      },
    ],
    []
  );

  const steps = useMemo(
    () => [
      {
        k: "01",
        title: "Consult",
        text: "Tell us the goal. We’ll recommend the cleanest path to get there.",
      },
      {
        k: "02",
        title: "Plan",
        text: "We map the build: parts, timeline, and the exact deliverable.",
      },
      {
        k: "03",
        title: "Execute",
        text: "Precision install + detailing. Every piece tested and verified.",
      },
      {
        k: "04",
        title: "Deliver",
        text: "Final walkthrough. You leave confident — and top tier.",
      },
    ],
    []
  );

  useEffect(() => {
    const id = setInterval(
      () => setActive((a) => (a + 1) % reasons.length),
      6500
    );
    return () => clearInterval(id);
  }, [reasons.length]);

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMx(clamp(x, 0, 1));
    setMy(clamp(y, 0, 1));
  };

  return (
    <section
      className={[
        "relative w-full overflow-hidden transition-all duration-3000",
        isDark ? "bg-zinc-950 text-white" : "bg-zinc-50 text-zinc-950",
      ].join(" ")}
      onMouseMove={onMove}
      aria-label="Why we are top tier"
    >
      {/* “Hero-like” image backdrop + overlay (dark/light) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[url('/images/hero-left.jpg')] bg-cover bg-center opacity-40" />
        <div className="absolute inset-0 bg-[url('/images/hero-right.jpg')] bg-cover bg-center opacity-20 mix-blend-screen" />
        <div
          className={[
            "absolute inset-0 transition-all duration-3000",
            isDark ? "bg-black/50" : "bg-white/30",
          ].join(" ")}
        />
      </div>

      {/* Ambient gradients (rose/sky) that follow cursor */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-rose-500/15 blur-3xl"
          style={{
            transform: `translateX(-50%) translateY(${(my - 0.5) * 30}px)`,
          }}
        />
        <div
          className="absolute -bottom-44 left-1/3 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-sky-500/15 blur-3xl"
          style={{
            transform: `translateX(-50%) translateY(${(0.5 - my) * 30}px)`,
          }}
        />
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
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(800px 420px at ${mx * 100}% ${
              my * 100
            }%, rgba(244,63,94,0.18), transparent 55%)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(900px 460px at ${(1 - mx) * 100}% ${
              (1 - my) * 100
            }%, rgba(14,165,233,0.16), transparent 60%)`,
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Pill isDark={isDark} dot="rose">
                Precision
              </Pill>
              <Pill isDark={isDark} dot="sky">
                Protection
              </Pill>
              <Pill isDark={isDark} dot="rose">
                Performance
              </Pill>
            </div>

            <h2 className="mt-4 text-3xl md:text-5xl font-semibold tracking-tight">
              Why are we{" "}
              <span className="relative">
                <span className="bg-gradient-to-r from-rose-300 via-rose-200 to-sky-200 bg-clip-text text-transparent">
                  Top Tier
                </span>
                <span className="absolute -bottom-2 left-0 h-px w-full bg-gradient-to-r from-transparent via-rose-500/60 to-transparent" />
              </span>
              ?
            </h2>

            <p
              className={[
                "mt-4 text-base md:text-lg leading-relaxed",
                isDark ? "text-white/70" : "text-zinc-700",
              ].join(" ")}
            >
              It’s not hype — it’s process. Premium craftsmanship, transparent
              service, and a quality-first workflow so your build looks insane
              and performs even better.
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid w-full max-w-xl grid-cols-2 gap-3 md:gap-4">
            <Stat
              isDark={isDark}
              value="Top-tier QA"
              label="Every install verified"
              hint="Final checks + clean finishing"
            />
            <Stat
              isDark={isDark}
              value="Fast turnaround"
              label="Efficient scheduling"
              hint="Less downtime, more drive time"
            />
            <Stat
              isDark={isDark}
              value="Premium parts"
              label="Curated components"
              hint="Only what we’d run ourselves"
            />
            <Stat
              isDark={isDark}
              value="Clear comms"
              label="No ghosting"
              hint="Updates, walkthroughs, receipts"
            />
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:mt-14 lg:grid-cols-12">
          {/* Left: interactive reasons */}
          <div className="lg:col-span-7">
            <div
              className={[
                "rounded-3xl border p-4 md:p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]",
                isDark
                  ? "border-white/10 bg-white/[0.03]"
                  : "border-black/10 bg-black/[0.03]",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3 px-2 py-2">
                <div
                  className={[
                    "flex items-center gap-2 text-sm",
                    isDark ? "text-white/70" : "text-zinc-700",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "inline-flex h-8 w-8 items-center justify-center rounded-xl",
                      "bg-rose-500/10 text-rose-200",
                    ].join(" ")}
                  >
                    <Icon name="spark" className="h-5 w-5" />
                  </span>
                  <span>Top-tier pillars</span>
                </div>

                <div
                  className={[
                    "flex items-center gap-2 text-xs",
                    isDark ? "text-white/50" : "text-zinc-600",
                  ].join(" ")}
                >
                  <span className="hidden md:inline">Tap a card</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500/80" />
                  <span>Auto-cycles</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                {reasons.map((r, idx) => {
                  const isActive = idx === active;
                  const accentBorder =
                    r.accent === "rose"
                      ? "border-rose-500/40"
                      : "border-sky-500/40";
                  const accentGlow =
                    r.accent === "rose"
                      ? "shadow-[0_0_0_1px_rgba(244,63,94,0.25)_inset,0_0_40px_rgba(244,63,94,0.10)]"
                      : "shadow-[0_0_0_1px_rgba(14,165,233,0.25)_inset,0_0_40px_rgba(14,165,233,0.10)]";
                  const iconWrap =
                    r.accent === "rose"
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                      : "border-sky-500/30 bg-sky-500/10 text-sky-200";

                  return (
                    <button
                      key={r.title}
                      onClick={() => setActive(idx)}
                      className={[
                        "group relative text-left rounded-2xl border p-4 transition-all duration-300",
                        isDark
                          ? "bg-zinc-950/30 hover:bg-white/[0.04]"
                          : "bg-white/40 hover:bg-white/60",
                        isActive
                          ? `${accentBorder} ${accentGlow}`
                          : isDark
                          ? "border-white/10"
                          : "border-black/10",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                          r.accent === "rose"
                            ? "bg-rose-500/12"
                            : "bg-sky-500/12",
                        ].join(" ")}
                      />
                      <div className="flex items-start gap-3">
                        <div
                          className={[
                            "flex h-11 w-11 items-center justify-center rounded-2xl border",
                            isActive
                              ? iconWrap
                              : isDark
                              ? "border-white/10 bg-white/5 text-white/80"
                              : "border-black/10 bg-black/5 text-zinc-800",
                          ].join(" ")}
                        >
                          <Icon name={r.icon} className="h-6 w-6" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3
                              className={[
                                "text-base md:text-lg font-semibold",
                                isDark ? "text-white" : "text-zinc-950",
                              ].join(" ")}
                            >
                              {r.title}
                            </h3>
                            {isActive ? (
                              <span
                                className={[
                                  "rounded-full border px-2 py-0.5 text-[11px]",
                                  r.accent === "rose"
                                    ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                                    : "border-sky-500/30 bg-sky-500/10 text-sky-200",
                                ].join(" ")}
                              >
                                Active
                              </span>
                            ) : null}
                          </div>
                          <p
                            className={[
                              "mt-1 text-sm leading-relaxed",
                              isDark ? "text-white/65" : "text-zinc-700",
                            ].join(" ")}
                          >
                            {r.desc}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2">
                        {r.bullets.map((b) => (
                          <div
                            key={b}
                            className={[
                              "flex items-center gap-2 text-xs",
                              isDark ? "text-white/60" : "text-zinc-600",
                            ].join(" ")}
                          >
                            <span
                              className={[
                                "h-1.5 w-1.5 rounded-full",
                                r.accent === "rose"
                                  ? "bg-rose-500/70"
                                  : "bg-sky-500/70",
                              ].join(" ")}
                            />
                            <span className="truncate">{b}</span>
                          </div>
                        ))}
                      </div>

                      <div
                        className={[
                          "mt-4 flex items-center gap-2 text-xs",
                          isDark ? "text-white/50" : "text-zinc-600",
                        ].join(" ")}
                      >
                        <span className="inline-flex items-center gap-2">
                          Learn more <Icon name="arrow" className="h-4 w-4" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-5 space-y-6">
            {/* Guarantees */}
            <div
              className={[
                "rounded-3xl border p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]",
                isDark
                  ? "border-white/10 bg-white/[0.03]"
                  : "border-black/10 bg-black/[0.03]",
              ].join(" ")}
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-200">
                  <Icon name="spark" className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold">What you can expect</h3>
                  <p
                    className={[
                      "text-sm",
                      isDark ? "text-white/60" : "text-zinc-700",
                    ].join(" ")}
                  >
                    No fluff — just standards.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {guarantees.map((g, i) => (
                  <div
                    key={g.title}
                    className={[
                      "flex gap-3 rounded-2xl border p-3",
                      isDark
                        ? "border-white/10 bg-zinc-950/30"
                        : "border-black/10 bg-white/40",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                        i % 2 === 0
                          ? "bg-rose-500/10 text-rose-200"
                          : "bg-sky-500/10 text-sky-200",
                      ].join(" ")}
                    >
                      <Icon name={g.icon} className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div
                        className={[
                          "text-sm font-semibold",
                          isDark ? "text-white" : "text-zinc-950",
                        ].join(" ")}
                      >
                        {g.title}
                      </div>
                      <div
                        className={[
                          "text-xs leading-relaxed",
                          isDark ? "text-white/60" : "text-zinc-700",
                        ].join(" ")}
                      >
                        {g.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Process */}
            <div
              className={[
                "rounded-3xl border p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]",
                isDark
                  ? "border-white/10 bg-white/[0.03]"
                  : "border-black/10 bg-black/[0.03]",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Our process</h3>
                  <p
                    className={[
                      "text-sm",
                      isDark ? "text-white/60" : "text-zinc-700",
                    ].join(" ")}
                  >
                    Clean workflow. Predictable results.
                  </p>
                </div>
                <span
                  className={[
                    "rounded-full border px-3 py-1 text-xs",
                    isDark
                      ? "border-white/10 bg-white/5 text-white/60"
                      : "border-black/10 bg-white/60 text-zinc-700",
                  ].join(" ")}
                >
                  4 steps
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                {steps.map((s, i) => (
                  <div
                    key={s.k}
                    className={[
                      "group flex gap-3 rounded-2xl border p-3 transition-colors",
                      isDark
                        ? "border-white/10 bg-zinc-950/30 hover:bg-white/[0.04]"
                        : "border-black/10 bg-white/40 hover:bg-white/60",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                        i % 2 === 0
                          ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
                          : "border-sky-500/20 bg-sky-500/10 text-sky-200",
                      ].join(" ")}
                    >
                      <span className="text-xs font-semibold">{s.k}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div
                          className={[
                            "text-sm font-semibold",
                            isDark ? "text-white" : "text-zinc-950",
                          ].join(" ")}
                        >
                          {s.title}
                        </div>
                        <span
                          className={[
                            "h-1.5 w-1.5 rounded-full opacity-0 transition-opacity group-hover:opacity-100",
                            i % 2 === 0 ? "bg-rose-500/70" : "bg-sky-500/70",
                          ].join(" ")}
                        />
                      </div>
                      <div
                        className={[
                          "text-xs leading-relaxed",
                          isDark ? "text-white/60" : "text-zinc-700",
                        ].join(" ")}
                      >
                        {s.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTAs: match Hero button vibe (rose / sky) */}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#services"
                  className={[
                    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition-all duration-1000 drop-shadow-2xl border-3 border-sky-500",
                    isDark ? "text-zinc-50" : "text-zinc-950",
                    "hover:bg-sky-500",
                  ].join(" ")}
                >
                  Explore services <Icon name="arrow" className="h-4 w-4" />
                </a>

                <a
                  href="#contact"
                  className={[
                    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition-all duration-1000 drop-shadow-2xl border-3 border-rose-500",
                    isDark ? "text-zinc-50" : "text-zinc-950",
                    "hover:bg-rose-500",
                  ].join(" ")}
                >
                  Get a quote <Icon name="arrow" className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div
          className={[
            "mt-14 h-px w-full bg-gradient-to-r from-transparent to-transparent",
            isDark ? "via-white/10" : "via-black/10",
          ].join(" ")}
        />
      </div>
    </section>
  );
};

export default Trust;
