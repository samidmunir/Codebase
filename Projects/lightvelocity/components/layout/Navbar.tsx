"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type NavItem = {
  label: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Flights", href: "/flights" },
  { label: "My Trips", href: "/trips" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const rightLink = useMemo(() => ({ label: "Sign in", href: "/auth" }), []);

  useEffect(() => {
    // Close mobile menu on route change
    setMobileOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50">
      {/* Subtle top glow bar for brand identity */}
      <div className="h-[2px] w-full bg-gradient-to-r from-sky-500 via-cyan-400 to-violet-500" />

      <nav
        aria-label="Primary"
        className={cx(
          "border-b",
          "backdrop-blur supports-[backdrop-filter]:backdrop-blur-md",
          "bg-white/80 dark:bg-slate-950/70",
          "border-slate-200/70 dark:border-slate-800/70",
        )}
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Brand */}
            <Link
              href="/"
              className={cx(
                "group inline-flex items-center gap-2",
                "font-semibold tracking-tight",
                "text-slate-900 dark:text-slate-50",
              )}
            >
              <span className="relative grid place-items-center">
                <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-sky-500 to-violet-500 shadow-sm" />
                <span className="pointer-events-none absolute text-[10px] font-bold text-white">
                  LV
                </span>
              </span>

              <span className="text-[15px]">
                Lightvelocity
                <span className="ml-2 align-middle text-xs font-medium text-slate-500 dark:text-slate-400">
                  Airline
                </span>
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden items-center gap-2 md:flex">
              <div className="flex items-center gap-1 rounded-full border border-slate-200/70 bg-white/60 px-1 py-1 dark:border-slate-800/70 dark:bg-slate-950/40">
                {NAV_ITEMS.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cx(
                        "rounded-full px-4 py-2 text-sm font-medium transition",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950",
                        active
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900/60 dark:hover:text-white",
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              {/* CTA */}
              <Link
                href={rightLink.href}
                className={cx(
                  "ml-2 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold",
                  "bg-gradient-to-r from-sky-500 to-violet-500 text-white shadow-sm",
                  "hover:opacity-95 active:opacity-90 transition",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950",
                )}
              >
                {rightLink.label}
              </Link>
            </div>

            {/* Mobile button */}
            <button
              type="button"
              className={cx(
                "md:hidden inline-flex items-center justify-center",
                "h-10 w-10 rounded-xl border",
                "border-slate-200 bg-white/70 text-slate-900",
                "dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-100",
                "hover:bg-slate-100 dark:hover:bg-slate-900/50 transition",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950",
              )}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {/* Hamburger / X */}
              <span className="relative block h-4 w-5">
                <span
                  className={cx(
                    "absolute left-0 top-0 h-[2px] w-5 rounded bg-current transition-transform",
                    mobileOpen && "translate-y-[7px] rotate-45",
                  )}
                />
                <span
                  className={cx(
                    "absolute left-0 top-[7px] h-[2px] w-5 rounded bg-current transition-opacity",
                    mobileOpen ? "opacity-0" : "opacity-100",
                  )}
                />
                <span
                  className={cx(
                    "absolute left-0 bottom-0 h-[2px] w-5 rounded bg-current transition-transform",
                    mobileOpen && "-translate-y-[7px] -rotate-45",
                  )}
                />
              </span>
            </button>
          </div>

          {/* Mobile menu */}
          <div
            className={cx(
              "md:hidden overflow-hidden transition-[max-height,opacity] duration-200 ease-out",
              mobileOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
            )}
          >
            <div className="pb-5 pt-2">
              <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-2 dark:border-slate-800/70 dark:bg-slate-950/40">
                <div className="flex flex-col gap-1">
                  {NAV_ITEMS.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cx(
                          "rounded-xl px-3 py-3 text-sm font-semibold transition",
                          active
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                            : "text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900/60",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950",
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        {item.label}
                      </Link>
                    );
                  })}

                  <div className="my-1 h-px bg-slate-200/70 dark:bg-slate-800/70" />

                  <Link
                    href={rightLink.href}
                    className={cx(
                      "rounded-xl px-3 py-3 text-sm font-semibold text-white transition",
                      "bg-gradient-to-r from-sky-500 to-violet-500 shadow-sm",
                      "hover:opacity-95 active:opacity-90",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950",
                    )}
                  >
                    {rightLink.label}
                  </Link>
                </div>
              </div>

              <p className="mt-3 px-1 text-xs text-slate-500 dark:text-slate-400">
                Fast booking. Clean experiences. Fictional airline.
              </p>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
