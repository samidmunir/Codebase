// Services.jsx
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "../contexts/Theme";
import {
  Search,
  Wrench,
  Sparkles,
  ShieldCheck,
  Clock,
  CalendarDays,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  Star,
  Car,
  Paintbrush,
  Gauge,
  Lightbulb,
  Volume2,
  Droplets,
  Settings,
  Check,
  BadgeDollarSign,
  Filter,
} from "lucide-react";

export default function Services() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const { serviceId } = useParams();

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

  const services = useMemo(
    () => [
      {
        id: "window-tint",
        title: "Window Tint Installation",
        category: "Protection",
        icon: ShieldCheck,
        price: "From $249",
        duration: "2–4 hrs",
        rating: 4.9,
        reviews: 218,
        featured: true,
        summary:
          "Premium ceramic tint installation for privacy, heat rejection, UV protection, and a cleaner vehicle profile.",
        details:
          "Our tint packages are designed for daily drivers, luxury builds, and performance vehicles. We help you choose the right shade and film type while keeping the finish clean, even, and professional.",
        includes: [
          "Ceramic and carbon film options",
          "Heat and UV rejection",
          "Clean edge finishing",
          "Rear windshield and side window options",
          "Post-install care guidance",
        ],
      },
      {
        id: "paint-protection",
        title: "Paint Protection Film",
        category: "Protection",
        icon: Paintbrush,
        price: "From $699",
        duration: "1–2 days",
        rating: 4.8,
        reviews: 142,
        featured: true,
        summary:
          "Protect high-impact areas from rock chips, scratches, road debris, and daily wear.",
        details:
          "PPF is ideal for front bumpers, hoods, mirrors, side skirts, and full-body protection. This service is built for owners who want to preserve paint quality long-term.",
        includes: [
          "Front-end protection packages",
          "Self-healing film options",
          "Gloss or satin finish",
          "Edge-wrapped installation where possible",
          "Paint-safe removal guidance",
        ],
      },
      {
        id: "performance-install",
        title: "Performance Part Installation",
        category: "Performance",
        icon: Gauge,
        price: "Quote Based",
        duration: "Varies",
        rating: 4.9,
        reviews: 176,
        featured: true,
        summary:
          "Install intakes, exhaust parts, suspension upgrades, brake kits, and other performance-focused components.",
        details:
          "Bring your own parts or shop through TTC. We inspect fitment, installation requirements, and vehicle compatibility before work begins.",
        includes: [
          "Fitment review",
          "Intake and exhaust installs",
          "Brake and suspension upgrades",
          "Install documentation",
          "Post-install inspection",
        ],
      },
      {
        id: "lighting-upgrades",
        title: "Lighting Upgrades",
        category: "Lighting",
        icon: Lightbulb,
        price: "From $129",
        duration: "1–3 hrs",
        rating: 4.7,
        reviews: 94,
        featured: false,
        summary:
          "Upgrade interior, exterior, ambient, underglow, and visibility lighting with clean wiring and fitment.",
        details:
          "Lighting upgrades can completely change the feel of a build. We focus on clean placement, safe wiring, and a premium finished look.",
        includes: [
          "Interior LED conversions",
          "Ambient lighting kits",
          "Underglow installation",
          "Headlight/fog light upgrades",
          "Wire routing and inspection",
        ],
      },
      {
        id: "audio-install",
        title: "Audio System Installation",
        category: "Interior",
        icon: Volume2,
        price: "From $299",
        duration: "3–6 hrs",
        rating: 4.8,
        reviews: 81,
        featured: false,
        summary:
          "Speaker, subwoofer, amplifier, and sound system upgrades with clean wiring and tuned output.",
        details:
          "We build audio systems around your goals: clean clarity, deep bass, or balanced daily sound. Install quality matters as much as the components.",
        includes: [
          "Speaker installs",
          "Subwoofer and amp wiring",
          "Factory integration options",
          "Clean cable management",
          "Basic sound tuning",
        ],
      },
      {
        id: "detailing",
        title: "Premium Detailing",
        category: "Detail",
        icon: Droplets,
        price: "From $149",
        duration: "2–5 hrs",
        rating: 4.9,
        reviews: 304,
        featured: true,
        summary:
          "Interior and exterior detailing for a refreshed, protected, showroom-level finish.",
        details:
          "Detail packages are designed for maintenance, resale prep, and post-install cleanup. Add-ons can include clay treatment, wax, ceramic spray, and interior extraction.",
        includes: [
          "Exterior wash and decontamination",
          "Interior vacuum and wipe-down",
          "Wheel and tire cleaning",
          "Trim and glass cleaning",
          "Optional ceramic spray protection",
        ],
      },
      {
        id: "custom-build-consultation",
        title: "Custom Build Consultation",
        category: "Planning",
        icon: Sparkles,
        price: "Free",
        duration: "30 min",
        rating: 5.0,
        reviews: 63,
        featured: false,
        summary:
          "Plan your build with TTC: styling, performance, budget, parts, install phases, and long-term goals.",
        details:
          "Perfect if you know the look or performance goal you want, but need help choosing the right parts and order of upgrades.",
        includes: [
          "Vehicle goal review",
          "Budget planning",
          "Parts recommendation",
          "Install phase roadmap",
          "Quote preparation",
        ],
      },
    ],
    [],
  );

  const categories = ["All", ...new Set(services.map((s) => s.category))];

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const selectedService = services.find((s) => s.id === serviceId);

  const filteredServices = services.filter((service) => {
    const q = query.trim().toLowerCase();

    const matchesSearch =
      service.title.toLowerCase().includes(q) ||
      service.category.toLowerCase().includes(q) ||
      service.summary.toLowerCase().includes(q);

    const matchesCategory =
      activeCategory === "All" || service.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  const featuredServices = services.filter((s) => s.featured);

  const handleBook = (service) => {
    navigate(`/dashboard`);
  };

  if (selectedService) {
    const Icon = selectedService.icon;

    return (
      <main
        className={`min-h-screen pt-28 ${shellBg} relative overflow-hidden`}
      >
        <AmbientGlow isDark={isDark} />

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate("/services")}
            className={`mb-6 inline-flex items-center gap-2 rounded-2xl border px-5 py-3 font-semibold transition ${
              isDark
                ? "border-white/10 bg-white/5 hover:bg-white/10"
                : "border-black/10 bg-black/5 hover:bg-black/10"
            }`}
          >
            <ArrowLeft size={18} />
            Back to services
          </button>

          <section className={`rounded-3xl border ${cardBg} backdrop-blur-xl`}>
            <div className="p-6 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8">
              <div>
                <div
                  className={`h-16 w-16 rounded-3xl grid place-items-center border ${accentBorder} ${accentSoft}`}
                >
                  <Icon className={accentText} size={30} />
                </div>

                <p className={`mt-6 text-sm font-semibold ${accentText}`}>
                  {selectedService.category}
                </p>

                <h1 className="mt-2 text-4xl sm:text-5xl font-black tracking-tight">
                  {selectedService.title}
                </h1>

                <p className={`mt-5 text-lg leading-relaxed ${subtle}`}>
                  {selectedService.details}
                </p>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Metric
                    icon={BadgeDollarSign}
                    label="Starting Price"
                    value={selectedService.price}
                    cardAlt={cardAlt}
                  />
                  <Metric
                    icon={Clock}
                    label="Estimated Time"
                    value={selectedService.duration}
                    cardAlt={cardAlt}
                  />
                  <Metric
                    icon={Star}
                    label="Rating"
                    value={`${selectedService.rating} / 5`}
                    cardAlt={cardAlt}
                  />
                </div>
              </div>

              <aside className={`rounded-3xl border ${cardAlt} p-6`}>
                <h2 className="text-2xl font-extrabold">What’s included</h2>

                <div className="mt-5 space-y-3">
                  {selectedService.includes.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 h-6 w-6 rounded-full grid place-items-center ${accentSoft} border ${accentBorder}`}
                      >
                        <Check size={14} className={accentText} />
                      </div>
                      <p className={subtle}>{item}</p>
                    </div>
                  ))}
                </div>

                <div className={`my-6 h-[1px] ${divider}`} />

                <button
                  onClick={() => handleBook(selectedService)}
                  className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 font-bold text-white ${accentBg} ${accentHover} transition`}
                >
                  Book this service
                  <CalendarDays size={18} />
                </button>

                <button
                  onClick={() => navigate("/catalog")}
                  className={`mt-3 w-full inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 font-bold border transition ${
                    isDark
                      ? "border-white/10 bg-white/5 hover:bg-white/10"
                      : "border-black/10 bg-black/5 hover:bg-black/10"
                  }`}
                >
                  Shop related products
                  <ArrowUpRight size={18} />
                </button>
              </aside>
            </div>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className={`min-h-screen pt-16 ${shellBg} relative overflow-hidden`}>
      <AmbientGlow isDark={isDark} />

      <section className="mx-auto w-full px-16 py-8 lg:py-10">
        <header className={`rounded-3xl border ${cardBg} backdrop-blur-xl`}>
          <div className="p-6 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 items-center">
            <div>
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 ${accentBorder} ${accentSoft}`}
              >
                <Sparkles size={16} className={accentText} />
                <span className={`text-sm font-bold ${accentText}`}>
                  Top Tier Customs Services
                </span>
              </div>

              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight">
                Premium installs, protection, detailing, and custom upgrades.
              </h1>

              <p className={`mt-5 text-lg leading-relaxed ${subtle}`}>
                Explore TTC services built for clean fitment, quality installs,
                sharper styling, and a better ownership experience.
              </p>

              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => navigate("/dashboard")}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 font-bold text-white ${accentBg} ${accentHover} transition`}
                >
                  Book a service
                  <CalendarDays size={18} />
                </button>

                <button
                  onClick={() => navigate("/catalog")}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 font-bold border transition ${
                    isDark
                      ? "border-white/10 bg-white/5 hover:bg-white/10"
                      : "border-black/10 bg-black/5 hover:bg-black/10"
                  }`}
                >
                  Browse products
                  <ArrowUpRight size={18} />
                </button>
              </div>
            </div>

            <div className={`rounded-3xl border ${cardAlt} p-5`}>
              <p className={`text-sm font-semibold ${subtle2}`}>
                Featured Services
              </p>

              <div className="mt-4 space-y-3">
                {featuredServices.slice(0, 4).map((service) => {
                  const Icon = service.icon;

                  return (
                    <button
                      key={service.id}
                      onClick={() => navigate(`/services/${service.id}`)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        isDark
                          ? "border-white/10 bg-white/5 hover:bg-white/10"
                          : "border-black/10 bg-black/5 hover:bg-black/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-11 w-11 rounded-2xl grid place-items-center border ${accentBorder} ${accentSoft}`}
                        >
                          <Icon size={20} className={accentText} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-bold truncate">{service.title}</p>
                          <p className={`text-sm ${subtle2}`}>
                            {service.price} • {service.duration}
                          </p>
                        </div>

                        <ArrowRight size={18} className="opacity-70" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          <aside
            className={`rounded-3xl border ${cardBg} backdrop-blur-xl p-5 h-fit`}
          >
            <div className="flex items-center gap-2">
              <Filter size={18} className={accentText} />
              <h2 className="font-extrabold">Filter Services</h2>
            </div>

            <div className={`mt-5 h-[1px] ${divider}`} />

            <div className="mt-5 space-y-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={[
                    "w-full text-left rounded-2xl border px-4 py-3 font-semibold transition",
                    activeCategory === category
                      ? `${accentBorder} ${accentSoft}`
                      : isDark
                        ? "border-white/10 bg-white/5 hover:bg-white/10"
                        : "border-black/10 bg-black/5 hover:bg-black/10",
                  ].join(" ")}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className={`mt-6 h-[1px] ${divider}`} />

            <div className="mt-5 rounded-2xl border border-white/10 p-4">
              <p className="font-bold">Need guidance?</p>
              <p className={`mt-2 text-sm ${subtle2}`}>
                Tell us your vehicle, budget, and goal. TTC can recommend the
                right upgrade path.
              </p>
              <button
                onClick={() => navigate("/services/custom-build-consultation")}
                className={`mt-4 w-full rounded-2xl px-4 py-3 font-bold text-white ${accentBg} ${accentHover} transition`}
              >
                Start consultation
              </button>
            </div>
          </aside>

          <section>
            <div
              className={`rounded-3xl border ${cardBg} backdrop-blur-xl p-4 sm:p-5`}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div>
                  <p className={`text-sm ${subtle2}`}>Available services</p>
                  <h2 className="text-2xl font-black">
                    {filteredServices.length} service
                    {filteredServices.length === 1 ? "" : "s"} found
                  </h2>
                </div>

                <div
                  className={`flex items-center gap-2 rounded-2xl border px-4 py-3 ${cardAlt}`}
                >
                  <Search size={18} className="opacity-80" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search tint, detail, lighting..."
                    className="w-full md:w-80 bg-transparent outline-none placeholder:opacity-60"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  isDark={isDark}
                  cardBg={cardBg}
                  cardAlt={cardAlt}
                  accentText={accentText}
                  accentBg={accentBg}
                  accentHover={accentHover}
                  accentBorder={accentBorder}
                  accentSoft={accentSoft}
                  subtle={subtle}
                  subtle2={subtle2}
                  navigate={navigate}
                  handleBook={handleBook}
                />
              ))}
            </div>

            {filteredServices.length === 0 && (
              <div
                className={`mt-6 rounded-3xl border ${cardBg} p-10 text-center`}
              >
                <Wrench className={`mx-auto ${accentText}`} size={40} />
                <h3 className="mt-4 text-2xl font-black">No services found</h3>
                <p className={`mt-2 ${subtle}`}>
                  Try a different search term or category.
                </p>
              </div>
            )}
          </section>
        </section>
      </section>
    </main>
  );
}

function ServiceCard({
  service,
  isDark,
  cardBg,
  accentText,
  accentBg,
  accentHover,
  accentBorder,
  accentSoft,
  subtle,
  subtle2,
  navigate,
  handleBook,
}) {
  const Icon = service.icon;

  return (
    <article
      className={`rounded-3xl border ${cardBg} backdrop-blur-xl overflow-hidden group transition hover:-translate-y-1`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div
            className={`h-13 w-13 rounded-2xl grid place-items-center border ${accentBorder} ${accentSoft}`}
          >
            <Icon className={accentText} size={24} />
          </div>

          {service.featured && (
            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold ${accentBorder} ${accentSoft} ${accentText}`}
            >
              Featured
            </span>
          )}
        </div>

        <p className={`mt-5 text-sm font-bold ${accentText}`}>
          {service.category}
        </p>

        <h3 className="mt-2 text-xl font-black">{service.title}</h3>

        <p className={`mt-3 text-sm leading-relaxed ${subtle}`}>
          {service.summary}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <SmallStat
            icon={BadgeDollarSign}
            label={service.price}
            isDark={isDark}
          />
          <SmallStat icon={Clock} label={service.duration} isDark={isDark} />
        </div>

        <div className={`mt-5 flex items-center gap-2 text-sm ${subtle2}`}>
          <Star size={16} className={accentText} />
          <span className="font-bold">{service.rating}</span>
          <span>({service.reviews} reviews)</span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate(`/services/${service.id}`)}
            className={`rounded-2xl px-4 py-3 font-bold border transition ${
              isDark
                ? "border-white/10 bg-white/5 hover:bg-white/10"
                : "border-black/10 bg-black/5 hover:bg-black/10"
            }`}
          >
            Details
          </button>

          <button
            onClick={() => handleBook(service)}
            className={`rounded-2xl px-4 py-3 font-bold text-white ${accentBg} ${accentHover} transition`}
          >
            Book
          </button>
        </div>
      </div>
    </article>
  );
}

function SmallStat({ icon: Icon, label, isDark }) {
  return (
    <div
      className={`rounded-2xl border px-3 py-3 flex items-center gap-2 ${
        isDark ? "border-white/10 bg-black/20" : "border-black/10 bg-white"
      }`}
    >
      <Icon size={16} className="opacity-80" />
      <span className="text-sm font-bold">{label}</span>
    </div>
  );
}

function Metric({ icon: Icon, label, value, cardAlt }) {
  return (
    <div className={`rounded-2xl border ${cardAlt} p-4`}>
      <Icon size={20} className="opacity-80" />
      <p className="mt-3 text-sm opacity-70">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}

function AmbientGlow({ isDark }) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <div
        className={`absolute -top-44 left-1/2 h-[620px] w-[620px] -translate-x-1/2 rounded-full blur-3xl opacity-20 ${
          isDark ? "bg-rose-500" : "bg-sky-500"
        }`}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />
    </div>
  );
}
