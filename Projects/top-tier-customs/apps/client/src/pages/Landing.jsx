// Landing.jsx
import Hero from "../components/landing/Hero";
import { useTheme } from "../contexts/Theme";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Car,
  Check,
  Gauge,
  HeartHandshake,
  Lightbulb,
  Paintbrush,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Wrench,
  Zap,
} from "lucide-react";
import ProjectShowcase from "../components/landing/ProjectShowCase";

const Landing = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const accentBg = isDark ? "bg-rose-500" : "bg-sky-500";
  const accentHover = isDark ? "hover:bg-rose-500/90" : "hover:bg-sky-500/90";
  const accentText = isDark ? "text-rose-300" : "text-sky-600";
  const accentBorder = isDark ? "border-rose-500/30" : "border-sky-500/30";
  const accentSoft = isDark ? "bg-rose-500/10" : "bg-sky-500/10";

  const shellBg = isDark
    ? "bg-zinc-950/90 text-zinc-50"
    : "bg-zinc-50/90 text-zinc-950";

  const cardBg = isDark
    ? "bg-white/5 border-white/10"
    : "bg-white/70 border-black/10";

  const cardAlt = isDark
    ? "bg-black/20 border-white/10"
    : "bg-white border-black/10";

  const subtle = isDark ? "text-white/70" : "text-black/70";
  const subtle2 = isDark ? "text-white/60" : "text-black/60";
  const divider = isDark ? "bg-white/10" : "bg-black/10";

  const services = [
    {
      icon: ShieldCheck,
      title: "Protection",
      desc: "Ceramic tint, paint protection film, and surface protection packages.",
      href: "/services",
    },
    {
      icon: Gauge,
      title: "Performance",
      desc: "Intakes, brakes, suspension, exhaust upgrades, and install support.",
      href: "/services",
    },
    {
      icon: Paintbrush,
      title: "Exterior Styling",
      desc: "Splitters, spoilers, lighting, aero, wrap prep, and custom accents.",
      href: "/catalog",
    },
    {
      icon: Sparkles,
      title: "Detailing",
      desc: "Premium wash, decontamination, interior refresh, and ceramic spray.",
      href: "/services",
    },
  ];

  const steps = [
    {
      icon: Car,
      title: "Choose your goal",
      desc: "Tell us if you want more style, performance, protection, sound, or comfort.",
    },
    {
      icon: Wrench,
      title: "Build the plan",
      desc: "We recommend the right products, services, and install sequence.",
    },
    {
      icon: CalendarDays,
      title: "Book the work",
      desc: "Schedule your service and track progress from your TTC dashboard.",
    },
  ];

  const builds = [
    "Ceramic Tint Package",
    "Stage 1 Performance Bundle",
    "Lighting Upgrade Kit",
    "Detail + Protection Package",
    "Wheel & Tire Setup",
    "Audio Upgrade Bundle",
  ];

  const testimonials = [
    {
      name: "Marcus R.",
      car: "BMW 340i",
      text: "TTC made the entire build feel easy. Clean install, sharp communication, and the car looks completely different now.",
    },
    {
      name: "Daniel K.",
      car: "Audi S5",
      text: "The tint and detailing work came out flawless. The whole process felt premium from start to finish.",
    },
    {
      name: "Ari M.",
      car: "Civic Type R",
      text: "I came in with random ideas and they helped turn it into an actual build plan. Exactly what I needed.",
    },
  ];

  return (
    <main className={`${shellBg} relative overflow-hidden`}>
      <Hero />

      <AmbientGlow isDark={isDark} />

      {/* Intro / positioning */}
      <section className="relative mx-auto w-full px-16 py-8 lg:py-10">
        <div
          className={`rounded-3xl border ${cardBg} backdrop-blur-xl p-6 sm:p-8 lg:p-10`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
            <div>
              <Badge
                accentBorder={accentBorder}
                accentSoft={accentSoft}
                accentText={accentText}
              >
                <Sparkles size={16} />
                Built for enthusiasts. Finished like luxury.
              </Badge>

              <h2 className="mt-6 text-4xl sm:text-5xl font-black tracking-tight">
                Your vehicle deserves more than random parts and rushed
                installs.
              </h2>

              <p className={`mt-5 text-lg leading-relaxed ${subtle}`}>
                Top Tier Customs brings products, services, appointment booking,
                build planning, and customer tracking into one polished
                experience. Shop parts, book installs, track orders, and build
                with confidence.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => navigate("/catalog")}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 font-bold text-white ${accentBg} ${accentHover} transition`}
                >
                  Shop Catalog <ShoppingBag size={18} />
                </button>

                <button
                  onClick={() => navigate("/services")}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 font-bold border transition ${
                    isDark
                      ? "border-white/10 bg-white/5 hover:bg-white/10"
                      : "border-black/10 bg-black/5 hover:bg-black/10"
                  }`}
                >
                  Book Services <ArrowUpRight size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                ["500+", "Parts curated"],
                ["4.9", "Avg rating"],
                ["24hr", "Quote response"],
                ["100%", "Fitment-first"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className={`rounded-3xl border ${cardAlt} p-6`}
                >
                  <p className={`text-4xl font-black ${accentText}`}>{value}</p>
                  <p className={`mt-2 text-sm font-semibold ${subtle2}`}>
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <SectionHeader
        eyebrow="What TTC does"
        title="Products, installs, and protection under one roof."
        desc="From daily-driver upgrades to full custom build planning, TTC is designed to make every step feel premium."
        accentText={accentText}
        subtle={subtle}
      />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {services.map((service) => {
            const Icon = service.icon;

            return (
              <button
                key={service.title}
                onClick={() => navigate(service.href)}
                className={`group text-left rounded-3xl border ${cardBg} backdrop-blur-xl p-6 transition hover:-translate-y-1`}
              >
                <div
                  className={`h-14 w-14 rounded-2xl grid place-items-center border ${accentBorder} ${accentSoft}`}
                >
                  <Icon className={accentText} />
                </div>

                <h3 className="mt-5 text-2xl font-black">{service.title}</h3>
                <p className={`mt-3 text-sm leading-relaxed ${subtle}`}>
                  {service.desc}
                </p>

                <div
                  className={`mt-6 inline-flex items-center gap-2 font-bold ${accentText}`}
                >
                  Explore{" "}
                  <ArrowRight
                    size={17}
                    className="group-hover:translate-x-1 transition"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <ProjectShowcase />

      {/* Process */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
        <div
          className={`rounded-3xl border ${cardBg} backdrop-blur-xl overflow-hidden`}
        >
          <div className="p-6 sm:p-8 lg:p-10">
            <Badge
              accentBorder={accentBorder}
              accentSoft={accentSoft}
              accentText={accentText}
            >
              <Wrench size={16} />
              How it works
            </Badge>

            <h2 className="mt-5 text-4xl sm:text-5xl font-black">
              From idea to finished build.
            </h2>

            <p className={`mt-4 max-w-3xl text-lg leading-relaxed ${subtle}`}>
              TTC helps customers move from “I want my car to look better” to a
              clean, organized, quote-backed upgrade plan.
            </p>
          </div>

          <div className={`h-[1px] ${divider}`} />

          <div className="grid grid-cols-1 lg:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div key={step.title} className="p-6 sm:p-8 border-white/10">
                  <div className="flex items-center justify-between">
                    <div
                      className={`h-14 w-14 rounded-2xl grid place-items-center border ${accentBorder} ${accentSoft}`}
                    >
                      <Icon className={accentText} />
                    </div>

                    <p
                      className={`text-5xl font-black ${isDark ? "text-white/10" : "text-black/10"}`}
                    >
                      0{index + 1}
                    </p>
                  </div>

                  <h3 className="mt-6 text-2xl font-black">{step.title}</h3>
                  <p className={`mt-3 leading-relaxed ${subtle}`}>
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Build showcase */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-6">
          <div
            className={`rounded-3xl border ${cardBg} backdrop-blur-xl p-6 sm:p-8`}
          >
            <Badge
              accentBorder={accentBorder}
              accentSoft={accentSoft}
              accentText={accentText}
            >
              <Zap size={16} />
              Popular build paths
            </Badge>

            <h2 className="mt-5 text-4xl font-black">
              Start with a package, then make it yours.
            </h2>

            <p className={`mt-4 leading-relaxed ${subtle}`}>
              Customers can begin with curated product categories, then book TTC
              services to complete the install professionally.
            </p>

            <button
              onClick={() => navigate("/services")}
              className={`mt-7 inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 font-bold text-white ${accentBg} ${accentHover} transition`}
            >
              View services <ArrowRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {builds.map((build, index) => (
              <div
                key={build}
                className={`rounded-3xl border ${cardBg} backdrop-blur-xl p-5`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div
                    className={`h-12 w-12 rounded-2xl grid place-items-center border ${accentBorder} ${accentSoft}`}
                  >
                    {index % 3 === 0 ? (
                      <ShieldCheck className={accentText} />
                    ) : index % 3 === 1 ? (
                      <Gauge className={accentText} />
                    ) : (
                      <Lightbulb className={accentText} />
                    )}
                  </div>

                  <ArrowUpRight className="opacity-60" size={20} />
                </div>

                <h3 className="mt-5 text-xl font-black">{build}</h3>
                <p className={`mt-2 text-sm ${subtle2}`}>
                  Curated parts, service pairing, and clean upgrade planning.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why TTC */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
        <div
          className={`rounded-3xl border ${cardBg} backdrop-blur-xl p-6 sm:p-8 lg:p-10`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <Badge
                accentBorder={accentBorder}
                accentSoft={accentSoft}
                accentText={accentText}
              >
                <BadgeCheck size={16} />
                Why customers choose TTC
              </Badge>

              <h2 className="mt-5 text-4xl sm:text-5xl font-black">
                Built around trust, quality, and clean execution.
              </h2>
            </div>

            <div className="space-y-4">
              {[
                "Fitment-first products and service recommendations.",
                "Professional install flow for tint, lighting, performance, protection, and detailing.",
                "Customer dashboard for orders, bookings, favorites, billing, and support.",
                "Premium brand experience from landing page to checkout.",
              ].map((item) => (
                <div
                  key={item}
                  className={`flex gap-3 rounded-2xl border ${cardAlt} p-4`}
                >
                  <div
                    className={`h-7 w-7 shrink-0 rounded-full grid place-items-center border ${accentBorder} ${accentSoft}`}
                  >
                    <Check size={15} className={accentText} />
                  </div>
                  <p className={`font-semibold ${subtle}`}>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <SectionHeader
        eyebrow="Customer energy"
        title="A premium experience before the keys even turn."
        desc="The TTC frontend should make the business feel sharp, trustworthy, and exciting before the customer books anything."
        accentText={accentText}
        subtle={subtle}
      />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className={`rounded-3xl border ${cardBg} backdrop-blur-xl p-6`}
            >
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={18} className={accentText} />
                ))}
              </div>

              <p className={`mt-5 leading-relaxed ${subtle}`}>"{t.text}"</p>

              <div className={`mt-6 h-[1px] ${divider}`} />

              <div className="mt-5 flex items-center gap-3">
                <div
                  className={`h-12 w-12 rounded-2xl grid place-items-center border ${accentBorder} ${accentSoft}`}
                >
                  <HeartHandshake className={accentText} />
                </div>

                <div>
                  <p className="font-black">{t.name}</p>
                  <p className={`text-sm ${subtle2}`}>{t.car}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24">
        <div
          className={`relative overflow-hidden rounded-3xl border ${accentBorder} ${accentSoft} p-8 sm:p-10 lg:p-14 text-center`}
        >
          <div
            className={`absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full blur-3xl opacity-30 ${
              isDark ? "bg-rose-500" : "bg-sky-500"
            }`}
          />

          <div className="relative">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight">
              Ready to build something top tier?
            </h2>

            <p
              className={`mx-auto mt-5 max-w-2xl text-lg leading-relaxed ${subtle}`}
            >
              Shop curated parts, book premium services, and manage your full
              TTC experience from one clean platform.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={() => navigate("/catalog")}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-4 font-bold text-white ${accentBg} ${accentHover} transition`}
              >
                Start shopping <ShoppingBag size={18} />
              </button>

              <button
                onClick={() => navigate("/auth")}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-4 font-bold border transition ${
                  isDark
                    ? "border-white/10 bg-white/5 hover:bg-white/10"
                    : "border-black/10 bg-white/70 hover:bg-black/5"
                }`}
              >
                Create account <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

function Badge({ children, accentBorder, accentSoft, accentText }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 ${accentBorder} ${accentSoft}`}
    >
      <span className={accentText}>{children}</span>
    </div>
  );
}

function SectionHeader({ eyebrow, title, desc, accentText, subtle }) {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
      <p
        className={`text-sm font-black uppercase tracking-[0.25em] ${accentText}`}
      >
        {eyebrow}
      </p>
      <h2 className="mt-4 max-w-4xl text-4xl sm:text-5xl font-black tracking-tight">
        {title}
      </h2>
      <p className={`mt-4 max-w-3xl text-lg leading-relaxed ${subtle}`}>
        {desc}
      </p>
    </section>
  );
}

function AmbientGlow({ isDark }) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <div
        className={`absolute top-[700px] left-1/2 h-[620px] w-[620px] -translate-x-1/2 rounded-full blur-3xl opacity-20 ${
          isDark ? "bg-rose-500" : "bg-sky-500"
        }`}
      />
      <div
        className={`absolute top-[1500px] right-[-200px] h-[520px] w-[520px] rounded-full blur-3xl opacity-15 ${
          isDark ? "bg-rose-500" : "bg-sky-500"
        }`}
      />
    </div>
  );
}

export default Landing;
