// src/components/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../contexts/Theme";
import {
  ArrowRight,
  Instagram,
  Facebook,
  Youtube,
  Mail,
  Phone,
  MapPin,
  Sparkles,
} from "lucide-react";

const Footer = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const surface = isDark
    ? "border-zinc-900 bg-zinc-950/60"
    : "border-zinc-200 bg-white/70";

  const subtle = isDark ? "text-zinc-500" : "text-zinc-600";
  const muted = isDark ? "text-zinc-300" : "text-zinc-700";
  const heading = isDark ? "text-zinc-50" : "text-zinc-950";

  const nav = [
    { label: "Home", to: "/" },
    { label: "Catalog", to: "/catalog" },
    { label: "Cart", to: "/cart" },
    { label: "Services", to: "/services" },
    { label: "Appointments", to: "/appointments" },
  ];

  const company = [
    { label: "About TTC", to: "/about" },
    { label: "Our Work", to: "/work" },
    { label: "FAQs", to: "/faq" },
    { label: "Contact", to: "/contact" },
  ];

  const legal = [
    { label: "Privacy Policy", to: "/privacy" },
    { label: "Terms of Service", to: "/terms" },
    { label: "Refund Policy", to: "/refunds" },
  ];

  return (
    <footer
      className={[
        "relative w-full px-8 overflow-hidden transition-all duration-3000",
        isDark ? "bg-zinc-950 text-zinc-50" : "bg-zinc-50 text-zinc-950",
      ].join(" ")}
      aria-label="Site footer"
    >
      {/* Ambient backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-44 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-rose-500/12 blur-3xl" />
        <div className="absolute -bottom-56 left-1/3 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-sky-500/12 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.14) 1px, transparent 0)",
            backgroundSize: "28px 28px",
            maskImage:
              "radial-gradient(ellipse at center, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 78%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 78%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-8xl px-8 pt-14 sm:pt-16 lg:pt-20 pb-10">
        {/* Top CTA strip */}
        <div
          className={[
            "rounded-3xl border p-5 sm:p-6 lg:p-7",
            surface,
            "shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]",
          ].join(" ")}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-wide border-rose-500/25 bg-rose-500/10 text-rose-200">
                <Sparkles className="h-4 w-4" />
                Build something top tier
              </div>

              <h3
                className={[
                  "mt-4 text-2xl sm:text-3xl font-extrabold",
                  heading,
                ].join(" ")}
              >
                Ready to upgrade your ride?
              </h3>
              <p
                className={[
                  "mt-2 text-sm sm:text-base leading-relaxed",
                  muted,
                ].join(" ")}
              >
                Browse the catalog for curated upgrades or book a service
                appointment — clean, precise, and premium from start to finish.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <Link
                to="/catalog"
                className={[
                  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm sm:text-base font-bold transition-all duration-300",
                  "border-2 border-sky-500",
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
                  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm sm:text-base font-bold transition-all duration-300",
                  "border-2 border-rose-500",
                  isDark
                    ? "text-zinc-50 hover:bg-rose-500/20"
                    : "text-zinc-950 hover:bg-rose-500/10",
                ].join(" ")}
              >
                Schedule Service <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Link columns */}
        <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl border border-rose-500/25 bg-rose-500/10" />
                <div>
                  <p
                    className={[
                      "text-lg font-extrabold tracking-tight",
                      heading,
                    ].join(" ")}
                  >
                    Top Tier Customs
                  </p>
                  <p
                    className={[
                      "text-xs uppercase tracking-[0.22em]",
                      subtle,
                    ].join(" ")}
                  >
                    Precision • Protection • Performance
                  </p>
                </div>
              </div>

              <p className={["text-sm leading-relaxed", muted].join(" ")}>
                Premium customization, detailing, and curated upgrades — built
                with clean installs, transparent service, and top-tier finish.
              </p>

              {/* Contact mini */}
              <div className="grid gap-2">
                <a
                  href="mailto:hello@toptiercustoms.com"
                  className={[
                    "inline-flex items-center gap-2 text-sm font-semibold",
                    isDark
                      ? "text-zinc-200 hover:text-zinc-50"
                      : "text-zinc-800 hover:text-zinc-950",
                  ].join(" ")}
                >
                  <Mail className="h-4 w-4 text-rose-400" />
                  hello@toptiercustoms.com
                </a>

                <a
                  href="tel:+10000000000"
                  className={[
                    "inline-flex items-center gap-2 text-sm font-semibold",
                    isDark
                      ? "text-zinc-200 hover:text-zinc-50"
                      : "text-zinc-800 hover:text-zinc-950",
                  ].join(" ")}
                >
                  <Phone className="h-4 w-4 text-sky-400" />
                  (000) 000-0000
                </a>

                <p
                  className={[
                    "inline-flex items-center gap-2 text-sm",
                    muted,
                  ].join(" ")}
                >
                  <MapPin className="h-4 w-4 text-emerald-400" />
                  Your City, ST
                </p>
              </div>

              {/* Socials */}
              <div className="flex items-center gap-3 pt-2">
                {[
                  { Icon: Instagram, label: "Instagram", href: "#" },
                  { Icon: Facebook, label: "Facebook", href: "#" },
                  { Icon: Youtube, label: "YouTube", href: "#" },
                ].map(({ Icon, label, href }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className={[
                      "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-300",
                      isDark
                        ? "border-zinc-900 bg-white/5 hover:bg-white/10"
                        : "border-zinc-200 bg-black/5 hover:bg-black/10",
                    ].join(" ")}
                  >
                    <Icon
                      className={[
                        "h-5 w-5",
                        isDark ? "text-zinc-100" : "text-zinc-900",
                      ].join(" ")}
                    />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Nav */}
          <div className="lg:col-span-2">
            <p
              className={[
                "text-sm font-extrabold uppercase tracking-wide",
                heading,
              ].join(" ")}
            >
              Navigate
            </p>
            <ul className="mt-4 space-y-3">
              {nav.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className={[
                      "text-sm font-semibold transition-colors",
                      isDark
                        ? "text-zinc-300 hover:text-zinc-50"
                        : "text-zinc-700 hover:text-zinc-950",
                    ].join(" ")}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="lg:col-span-3">
            <p
              className={[
                "text-sm font-extrabold uppercase tracking-wide",
                heading,
              ].join(" ")}
            >
              Company
            </p>
            <ul className="mt-4 space-y-3">
              {company.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className={[
                      "text-sm font-semibold transition-colors",
                      isDark
                        ? "text-zinc-300 hover:text-zinc-50"
                        : "text-zinc-700 hover:text-zinc-950",
                    ].join(" ")}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal + Newsletter */}
          <div className="lg:col-span-3">
            <p
              className={[
                "text-sm font-extrabold uppercase tracking-wide",
                heading,
              ].join(" ")}
            >
              Stay in the loop
            </p>

            <p className={["mt-4 text-sm leading-relaxed", muted].join(" ")}>
              New drops, featured builds, and service availability. No spam —
              just top-tier updates.
            </p>

            {/* Newsletter UI (front-end only) */}
            <form className="mt-4 flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Email address"
                className={[
                  "w-full rounded-2xl border px-4 py-3 text-sm font-semibold outline-none transition-all",
                  isDark
                    ? "border-zinc-900 bg-zinc-950/50 text-zinc-50 placeholder:text-zinc-600 focus:border-sky-500/50"
                    : "border-zinc-200 bg-white text-zinc-950 placeholder:text-zinc-500 focus:border-sky-500/60",
                ].join(" ")}
              />
              <button
                type="button"
                className={[
                  "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold transition-all duration-300",
                  "border-2 border-sky-500",
                  isDark
                    ? "text-zinc-50 hover:bg-sky-500/20"
                    : "text-zinc-950 hover:bg-sky-500/10",
                ].join(" ")}
              >
                Subscribe <ArrowRight className="h-5 w-5" />
              </button>
            </form>

            <div className="mt-6">
              <p
                className={[
                  "text-sm font-extrabold uppercase tracking-wide",
                  heading,
                ].join(" ")}
              >
                Legal
              </p>
              <ul className="mt-4 space-y-3">
                {legal.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className={[
                        "text-sm font-semibold transition-colors",
                        isDark
                          ? "text-zinc-300 hover:text-zinc-50"
                          : "text-zinc-700 hover:text-zinc-950",
                      ].join(" ")}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className={[
            "mt-12 flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between",
            isDark ? "border-zinc-900" : "border-zinc-200",
          ].join(" ")}
        >
          <p className={["text-xs sm:text-sm", subtle].join(" ")}>
            © {new Date().getFullYear()} Top Tier Customs. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className={[
                "inline-flex items-center gap-2 text-xs font-semibold",
                subtle,
              ].join(" ")}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500/80" />
              Precision
            </span>
            <span
              className={[
                "inline-flex items-center gap-2 text-xs font-semibold",
                subtle,
              ].join(" ")}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500/80" />
              Protection
            </span>
            <span
              className={[
                "inline-flex items-center gap-2 text-xs font-semibold",
                subtle,
              ].join(" ")}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
              Performance
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
