import Link from "next/link";

const NAV = {
  product: [
    { label: "Flights", href: "/flights" },
    { label: "My Trips", href: "/trips" },
    { label: "Sign in", href: "/auth" },
  ],
  company: [
    { label: "About Lightvelocity", href: "/" },
    { label: "Support", href: "/support" }, // safe placeholder route
    { label: "Terms", href: "/terms" }, // safe placeholder route
  ],
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function Footer() {
  return (
    <footer className="relative mt-16 border-t border-slate-200/70 dark:border-slate-800/70">
      {/* subtle brand glow */}
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-24 bg-gradient-to-r from-sky-500/10 via-cyan-400/10 to-violet-500/10 blur-2xl" />

      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-12">
          {/* Brand */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-3">
              <span className="relative grid place-items-center">
                <span className="h-10 w-10 rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 shadow-sm" />
                <span className="pointer-events-none absolute text-[11px] font-extrabold text-white">
                  LV
                </span>
              </span>

              <div>
                <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                  Lightvelocity
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Fictional airline booking experience
                </p>
              </div>
            </div>

            <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Built to feel fast, calm, and premium — from search to
              confirmation. Supabase-powered data, Next.js UX, and a consistent
              design system.
            </p>

            {/* “status chips” / trust cues */}
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                "Secure checkout flow",
                "Modern UI",
                "Responsive",
                "Type-safe",
              ].map((tag) => (
                <span
                  key={tag}
                  className={cx(
                    "rounded-full border px-3 py-1 text-xs font-medium",
                    "border-slate-200/70 bg-white/60 text-slate-700",
                    "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200",
                  )}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="md:col-span-7">
            <div className="grid gap-8 sm:grid-cols-2">
              <FooterColumn title="Product" links={NAV.product} />
              <FooterColumn title="Company" links={NAV.company} />
            </div>

            {/* Divider + bottom row */}
            <div className="mt-10 border-t border-slate-200/70 pt-6 dark:border-slate-800/70">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  © {new Date().getFullYear()} Lightvelocity. Built with
                  Next.js.
                </p>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-400 dark:text-slate-500">
                    Theme:
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                    <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                  </span>
                </div>
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
                Lightvelocity is fictional. Any routes, fares, or branding are
                for demonstration purposes only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; href: string }>;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-50">
        {title}
      </p>
      <ul className="mt-4 space-y-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className={cx(
                "text-sm text-slate-600 transition hover:text-slate-900 hover:underline",
                "dark:text-slate-300 dark:hover:text-white",
              )}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
