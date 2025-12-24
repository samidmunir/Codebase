// src/components/Offerings.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../../contexts/Theme";
import {
  ArrowRight,
  CalendarDays,
  ShoppingBag,
  ShoppingCart,
  Wrench,
  ShieldCheck,
  Sparkles,
  BadgeCheck,
} from "lucide-react";

const Pill = ({ isDark, dot = "rose", children }) => (
  <span
    className={[
      "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-wide",
      isDark
        ? "border-zinc-900 bg-white/5 text-zinc-100"
        : "border-zinc-200 bg-black/5 text-zinc-800",
    ].join(" ")}
  >
    <span
      className={[
        "h-2 w-2 rounded-full",
        dot === "rose"
          ? "bg-rose-500"
          : dot === "sky"
          ? "bg-sky-500"
          : "bg-emerald-500",
      ].join(" ")}
    />
    {children}
  </span>
);

const Feature = ({ isDark, icon: Icon, title, text }) => (
  <div
    className={[
      "flex items-start gap-3 rounded-2xl border p-4 transition-all duration-300",
      isDark ? "border-zinc-900 bg-zinc-950/30" : "border-zinc-200 bg-white/55",
    ].join(" ")}
  >
    <span
      className={[
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
        isDark ? "border-zinc-900 bg-white/5" : "border-zinc-200 bg-black/5",
      ].join(" ")}
    >
      <Icon
        className={["h-5 w-5", isDark ? "text-rose-300" : "text-sky-600"].join(
          " "
        )}
      />
    </span>
    <div className="min-w-0">
      <p
        className={[
          "text-sm font-bold",
          isDark ? "text-zinc-50" : "text-zinc-950",
        ].join(" ")}
      >
        {title}
      </p>
      <p
        className={[
          "mt-1 text-xs leading-relaxed",
          isDark ? "text-zinc-300" : "text-zinc-700",
        ].join(" ")}
      >
        {text}
      </p>
    </div>
  </div>
);

const Step = ({ isDark, k, title, text, accent = "rose" }) => (
  <div
    className={[
      "flex items-start gap-3 rounded-2xl border p-4 transition-all duration-300",
      isDark ? "border-zinc-900 bg-zinc-950/30" : "border-zinc-200 bg-white/55",
    ].join(" ")}
  >
    <span
      className={[
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-xs font-bold",
        accent === "rose"
          ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
          : accent === "sky"
          ? "border-sky-500/30 bg-sky-500/10 text-sky-200"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
      ].join(" ")}
    >
      {k}
    </span>
    <div className="min-w-0">
      <p
        className={[
          "text-sm font-bold",
          isDark ? "text-zinc-50" : "text-zinc-950",
        ].join(" ")}
      >
        {title}
      </p>
      <p
        className={[
          "mt-1 text-xs leading-relaxed",
          isDark ? "text-zinc-300" : "text-zinc-700",
        ].join(" ")}
      >
        {text}
      </p>
    </div>
  </div>
);

const OfferCard = ({
  isDark,
  active,
  onClick,
  accent = "rose",
  icon: Icon,
  title,
  blurb,
  bullets = [],
}) => {
  const accentBorder =
    accent === "rose"
      ? "border-rose-500/40"
      : accent === "sky"
      ? "border-sky-500/40"
      : "border-emerald-500/40";

  const accentGlow =
    accent === "rose"
      ? "shadow-[0_0_0_1px_rgba(244,63,94,0.25)_inset,0_0_60px_rgba(244,63,94,0.10)]"
      : accent === "sky"
      ? "shadow-[0_0_0_1px_rgba(14,165,233,0.25)_inset,0_0_60px_rgba(14,165,233,0.10)]"
      : "shadow-[0_0_0_1px_rgba(16,185,129,0.25)_inset,0_0_60px_rgba(16,185,129,0.10)]";

  const iconWrap =
    accent === "rose"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
      : accent === "sky"
      ? "border-sky-500/30 bg-sky-500/10 text-sky-200"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";

  return (
    <button
      onClick={onClick}
      className={[
        "group relative w-full text-left rounded-3xl border p-5 transition-all duration-300",
        active
          ? `${accentBorder} ${accentGlow}`
          : isDark
          ? "border-zinc-900"
          : "border-zinc-200",
        isDark
          ? "bg-zinc-950/30 hover:bg-white/[0.04]"
          : "bg-white/55 hover:bg-white/70",
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        <span
          className={[
            "flex h-12 w-12 items-center justify-center rounded-2xl border",
            iconWrap,
          ].join(" ")}
        >
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={[
                "text-lg sm:text-xl font-extrabold",
                isDark ? "text-zinc-50" : "text-zinc-950",
              ].join(" ")}
            >
              {title}
            </h3>
            {active ? (
              <span
                className={[
                  "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                  iconWrap,
                ].join(" ")}
              >
                Active
              </span>
            ) : null}
          </div>
          <p
            className={[
              "mt-1 text-sm leading-relaxed",
              isDark ? "text-zinc-300" : "text-zinc-700",
            ].join(" ")}
          >
            {blurb}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {bullets.map((b) => (
          <div
            key={b}
            className={[
              "flex items-center gap-2 text-xs",
              isDark ? "text-zinc-300" : "text-zinc-700",
            ].join(" ")}
          >
            <span
              className={[
                "h-1.5 w-1.5 rounded-full",
                accent === "rose"
                  ? "bg-rose-500/80"
                  : accent === "sky"
                  ? "bg-sky-500/80"
                  : "bg-emerald-500/80",
              ].join(" ")}
            />
            <span className="truncate">{b}</span>
          </div>
        ))}
      </div>

      <div
        className={[
          "mt-5 inline-flex items-center gap-2 text-xs font-semibold",
          isDark ? "text-zinc-200" : "text-zinc-800",
        ].join(" ")}
      >
        Learn more <ArrowRight className="h-4 w-4" />
      </div>
    </button>
  );
};

const Offerings = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const muted = isDark ? "text-zinc-300" : "text-zinc-700";
  const subtle = isDark ? "text-zinc-500" : "text-zinc-500";

  const tabs = useMemo(
    () => [
      {
        key: "catalog",
        accent: "rose",
        icon: ShoppingBag,
        title: "Shop the Catalog",
        blurb:
          "Browse curated products and upgrades — built for clean installs and top-tier results.",
        bullets: ["Categories + filters", "Product details", "Wishlist-ready"],
        cta: { label: "Browse Products", to: "/catalog" },
        secondary: { label: "View Featured", to: "/catalog?featured=true" },
        steps: [
          {
            k: "01",
            title: "Explore",
            text: "Browse by category and find the right upgrade.",
            accent: "rose",
          },
          {
            k: "02",
            title: "Compare",
            text: "Check specs, fitment notes, and recommendations.",
            accent: "sky",
          },
          {
            k: "03",
            title: "Add to cart",
            text: "Build your setup — accessories included.",
            accent: "emerald",
          },
          {
            k: "04",
            title: "Checkout",
            text: "Secure checkout — smooth and fast.",
            accent: "rose",
          },
        ],
        features: [
          {
            icon: ShieldCheck,
            title: "Trusted selection",
            text: "Curated parts we’d run ourselves.",
          },
          {
            icon: Sparkles,
            title: "Fitment-focused",
            text: "Built around clean installs and results.",
          },
        ],
      },
      {
        key: "cart",
        accent: "sky",
        icon: ShoppingCart,
        title: "Cart + Checkout",
        blurb:
          "A frictionless checkout flow that keeps things simple: review, pay, and you’re set.",
        bullets: ["Quantity + totals", "Promo-ready", "Secure checkout"],
        cta: { label: "Go to Cart", to: "/cart" },
        secondary: { label: "Continue Shopping", to: "/catalog" },
        steps: [
          {
            k: "01",
            title: "Review",
            text: "Confirm items, quantities, and totals.",
            accent: "sky",
          },
          {
            k: "02",
            title: "Optimize",
            text: "Add extras that complete the build.",
            accent: "rose",
          },
          {
            k: "03",
            title: "Checkout",
            text: "Fast, secure payment flow.",
            accent: "emerald",
          },
          {
            k: "04",
            title: "Track",
            text: "Order confirmation and updates.",
            accent: "sky",
          },
        ],
        features: [
          {
            icon: BadgeCheck,
            title: "Secure payments",
            text: "Checkout built with best practices.",
          },
          {
            icon: ShieldCheck,
            title: "Clear totals",
            text: "No surprises — transparent pricing.",
          },
        ],
      },
      {
        key: "services",
        accent: "emerald",
        icon: Wrench,
        title: "Services + Appointments",
        blurb:
          "From detailing to custom work — browse services and schedule appointments in minutes.",
        bullets: ["Service menu", "Time slots", "Reminders + notes"],
        cta: { label: "Browse Services", to: "/services" },
        secondary: { label: "Schedule Now", to: "/appointments" },
        steps: [
          {
            k: "01",
            title: "Pick a service",
            text: "Choose from detailing, installs, and custom work.",
            accent: "emerald",
          },
          {
            k: "02",
            title: "Select a time",
            text: "Pick a slot that fits your schedule.",
            accent: "sky",
          },
          {
            k: "03",
            title: "Confirm",
            text: "Add notes + vehicle details to prep the job.",
            accent: "rose",
          },
          {
            k: "04",
            title: "Show up top tier",
            text: "We execute — clean, precise, premium.",
            accent: "emerald",
          },
        ],
        features: [
          {
            icon: CalendarDays,
            title: "Scheduling made easy",
            text: "Quick booking with clear availability.",
          },
          {
            icon: ShieldCheck,
            title: "Reliable process",
            text: "Professional workflow from intake to delivery.",
          },
        ],
      },
    ],
    []
  );

  const [activeKey, setActiveKey] = useState(tabs[0].key);
  const active = tabs.find((t) => t.key === activeKey) ?? tabs[0];

  return (
    <section
      className={[
        "relative w-full px-8 overflow-hidden transition-all duration-3000",
        isDark ? "bg-zinc-950/90 text-zinc-50" : "bg-zinc-50/90 text-zinc-950",
      ].join(" ")}
      aria-label="What we offer"
    >
      {/* Ambient backdrop (rose/sky) */}
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
            <div className="flex flex-wrap items-center gap-2">
              <Pill isDark={isDark} dot="rose">
                Catalog
              </Pill>
              <Pill isDark={isDark} dot="sky">
                Checkout
              </Pill>
              <Pill isDark={isDark} dot="emerald">
                Appointments
              </Pill>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold uppercase leading-tight">
              What We{" "}
              <span className="bg-gradient-to-r from-rose-300 to-sky-200 bg-clip-text text-transparent">
                Offer
              </span>
            </h2>

            <p
              className={["text-base sm:text-lg leading-relaxed", muted].join(
                " "
              )}
            >
              TTC is built for both sides of the experience: shop upgrades and
              checkout cleanly — or browse services and book an appointment
              fast.
            </p>
          </div>

          {/* Quick CTA (optional anchor targets) */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/catalog"
              className={[
                "inline-flex items-center justify-center gap-2 rounded-full border-2 border-sky-500 px-5 py-3 text-sm sm:text-base font-bold transition-all duration-300",
                isDark
                  ? "text-zinc-50 hover:bg-sky-500/20"
                  : "text-zinc-950 hover:bg-sky-500/10",
              ].join(" ")}
            >
              Browse Catalog <ArrowRight className="h-5 w-5" />
            </Link>

            <Link
              to="/appointments"
              className={[
                "inline-flex items-center justify-center gap-2 rounded-full border-2 border-rose-500 px-5 py-3 text-sm sm:text-base font-bold transition-all duration-300",
                isDark
                  ? "text-zinc-50 hover:bg-rose-500/20"
                  : "text-zinc-950 hover:bg-rose-500/10",
              ].join(" ")}
            >
              Schedule Appointment <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </header>

        {/* Body */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
          {/* Left: selectable offerings */}
          <div className="lg:col-span-7 space-y-4">
            <div
              className={[
                "rounded-3xl border p-4 sm:p-5",
                isDark
                  ? "border-zinc-900 bg-zinc-950/40"
                  : "border-zinc-200 bg-white/60",
              ].join(" ")}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles
                    className={[
                      "h-5 w-5",
                      isDark ? "text-rose-300" : "text-sky-600",
                    ].join(" ")}
                  />
                  <p
                    className={[
                      "text-sm font-bold uppercase tracking-wide",
                      isDark ? "text-zinc-200" : "text-zinc-800",
                    ].join(" ")}
                  >
                    Choose a lane
                  </p>
                </div>
                <p className={["text-xs sm:text-sm", subtle].join(" ")}>
                  Tap a card to preview flow + features.
                </p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4">
                {tabs.map((t) => (
                  <OfferCard
                    key={t.key}
                    isDark={isDark}
                    active={t.key === activeKey}
                    onClick={() => setActiveKey(t.key)}
                    accent={t.accent}
                    icon={t.icon}
                    title={t.title}
                    blurb={t.blurb}
                    bullets={t.bullets}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right: details panel */}
          <div className="lg:col-span-5 space-y-5 lg:space-y-6">
            {/* Active summary */}
            <div
              className={[
                "rounded-3xl border p-5",
                isDark
                  ? "border-zinc-900 bg-zinc-950/40"
                  : "border-zinc-200 bg-white/60",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className={[
                      "text-xs font-semibold uppercase tracking-wide",
                      subtle,
                    ].join(" ")}
                  >
                    Currently viewing
                  </p>
                  <h3 className="mt-1 text-xl sm:text-2xl font-extrabold">
                    {active.title}
                  </h3>
                  <p
                    className={["mt-2 text-sm leading-relaxed", muted].join(
                      " "
                    )}
                  >
                    {active.blurb}
                  </p>
                </div>
                <span
                  className={[
                    "hidden sm:inline-flex h-12 w-12 items-center justify-center rounded-2xl border",
                    active.accent === "rose"
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                      : active.accent === "sky"
                      ? "border-sky-500/30 bg-sky-500/10 text-sky-200"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
                  ].join(" ")}
                >
                  <active.icon className="h-6 w-6" />
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                {active.features.map((f) => (
                  <Feature
                    key={f.title}
                    isDark={isDark}
                    icon={f.icon}
                    title={f.title}
                    text={f.text}
                  />
                ))}
              </div>

              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <Link
                  to={active.cta.to}
                  className={[
                    "w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm sm:text-base font-bold transition-all duration-300",
                    active.accent === "rose"
                      ? "border-2 border-rose-500 hover:bg-rose-500/15"
                      : active.accent === "sky"
                      ? "border-2 border-sky-500 hover:bg-sky-500/15"
                      : "border-2 border-emerald-500 hover:bg-emerald-500/15",
                    isDark ? "text-zinc-50" : "text-zinc-950",
                  ].join(" ")}
                >
                  {active.cta.label} <ArrowRight className="h-5 w-5" />
                </Link>

                <Link
                  to={active.secondary.to}
                  className={[
                    "w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm sm:text-base font-bold transition-all duration-300",
                    isDark
                      ? "border-2 border-zinc-900 bg-white/5 text-zinc-50 hover:bg-white/10"
                      : "border-2 border-zinc-200 bg-black/5 text-zinc-950 hover:bg-black/10",
                  ].join(" ")}
                >
                  {active.secondary.label} <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>

            {/* Steps */}
            <div
              className={[
                "rounded-3xl border p-5",
                isDark
                  ? "border-zinc-900 bg-zinc-950/40"
                  : "border-zinc-200 bg-white/60",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-lg font-extrabold">How it works</h4>
                  <p className={["text-sm", muted].join(" ")}>
                    The flow is designed to be fast, clear, and premium.
                  </p>
                </div>
                <span
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-semibold",
                    isDark
                      ? "border-zinc-900 bg-white/5 text-zinc-200"
                      : "border-zinc-200 bg-black/5 text-zinc-800",
                  ].join(" ")}
                >
                  4 steps
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                {active.steps.map((s) => (
                  <Step
                    key={s.k}
                    isDark={isDark}
                    k={s.k}
                    title={s.title}
                    text={s.text}
                    accent={s.accent}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          className={[
            "mt-12 h-px w-full bg-gradient-to-r from-transparent to-transparent",
            isDark ? "via-white/10" : "via-black/10",
          ].join(" ")}
        />
      </div>
    </section>
  );
};

export default Offerings;
