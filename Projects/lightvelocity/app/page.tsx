import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="py-14 sm:py-16">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/70 p-8 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/40 sm:p-12">
        {/* Hero glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 h-56 w-195 -translate-x-1/2 rounded-full bg-linear-to-r from-sky-500/20 via-cyan-400/15 to-violet-500/20 blur-3xl" />
        </div>

        <div className="relative grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/60 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200">
              <span className="h-2 w-2 rounded-full bg-linear-to-r from-sky-500 to-violet-500" />
              Fictional airline booking experience
            </div>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
              Book flights at the speed of light.
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
              Lightvelocity is a premium flight booking demo: search routes,
              compare fares, and manage trips — with a clean, modern experience
              from start to confirmation.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/flights"
                className="inline-flex items-center justify-center rounded-full bg-linear-to-r from-sky-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 active:opacity-90"
              >
                Search flights
              </Link>

              <Link
                href="/trips"
                className="inline-flex items-center justify-center rounded-full border border-slate-200/70 bg-white/60 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-100 dark:hover:bg-slate-900/50"
              >
                View my trips
              </Link>

              <div className="text-xs text-slate-500 dark:text-slate-400 sm:ml-2">
                No account needed to search.
              </div>
            </div>

            {/* Trust row */}
            <div className="mt-8 flex flex-wrap gap-2">
              {[
                "Fast search",
                "Responsive UI",
                "Type-safe Next.js",
                "Supabase-ready",
              ].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-slate-200/70 bg-white/60 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right-side card */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-sm backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/35">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Quick start
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Jump into the flow we’re building next.
              </p>

              <div className="mt-5 space-y-3">
                <QuickStartRow
                  title="1) Search"
                  desc="Pick route, date, passengers, and cabin."
                />
                <QuickStartRow
                  title="2) Compare"
                  desc="See fares + flight details in a clean list."
                />
                <QuickStartRow
                  title="3) Book"
                  desc="Confirm traveler info and create a booking."
                />
              </div>

              <div className="mt-6 rounded-xl border border-slate-200/70 bg-white/70 p-4 text-xs text-slate-600 dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-slate-50">
                  Next up:
                </span>{" "}
                we’ll build the flight search UI + results using the same design
                system.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECONDARY SECTION */}
      <section className="mt-10 grid gap-6 md:grid-cols-3">
        <FeatureCard
          title="Consistent theme"
          desc="A single palette across header, pages, cards, and forms."
        />
        <FeatureCard
          title="Modular architecture"
          desc="UI components + service layer that stays clean as the app grows."
        />
        <FeatureCard
          title="Supabase integration"
          desc="Postgres + Auth + RLS-ready for real booking data."
        />
      </section>
    </div>
  );
}

function QuickStartRow({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white/70 p-3 dark:border-slate-800/70 dark:bg-slate-950/40">
      <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-linear-to-r from-sky-500 to-violet-500" />
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          {title}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300">{desc}</p>
      </div>
    </div>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-6 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/40">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
        {title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {desc}
      </p>
    </div>
  );
}
