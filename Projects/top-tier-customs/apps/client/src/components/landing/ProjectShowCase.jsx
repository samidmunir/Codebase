import { useMemo, useState } from "react";
import { useTheme } from "../../contexts/Theme";
import {
  ArrowUpRight,
  Camera,
  ChevronLeft,
  ChevronRight,
  Play,
  Sparkles,
  Star,
  Wrench,
} from "lucide-react";

const ProjectShowcase = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const accentText = isDark ? "text-rose-300" : "text-sky-600";
  const accentBg = isDark ? "bg-rose-500" : "bg-sky-500";
  const accentBorder = isDark ? "border-rose-500/30" : "border-sky-500/30";
  const accentSoft = isDark ? "bg-rose-500/10" : "bg-sky-500/10";

  const cardBg = isDark
    ? "bg-white/5 border-white/10"
    : "bg-white/70 border-black/10";

  const cardAlt = isDark
    ? "bg-black/20 border-white/10"
    : "bg-white border-black/10";

  const subtle = isDark ? "text-white/70" : "text-black/70";
  const subtle2 = isDark ? "text-white/60" : "text-black/60";

  const projects = useMemo(
    () => [
      {
        title: "BMW 340i Shadow Build",
        category: "Tint • Lighting • Detail",
        type: "image",
        media:
          "https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=1600&auto=format&fit=crop",
        desc: "A stealth-inspired daily build with ceramic tint, gloss detail, and lighting upgrades.",
      },
      {
        title: "Audi S5 Protection Package",
        category: "PPF • Ceramic • Detail",
        type: "image",
        media:
          "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?q=80&w=1600&auto=format&fit=crop",
        desc: "Paint protection and premium finishing for a clean, long-lasting exterior.",
      },
      {
        title: "Performance Install Bay",
        category: "Intake • Exhaust • Inspection",
        type: "video",
        media:
          "https://images.unsplash.com/photo-1625047509248-ec889cbff17f?q=80&w=1600&auto=format&fit=crop",
        desc: "A behind-the-scenes look at TTC’s performance-focused install workflow.",
      },
      {
        title: "Detailing Finish",
        category: "Wash • Decon • Protection",
        type: "image",
        media:
          "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?q=80&w=1600&auto=format&fit=crop",
        desc: "Deep gloss, clean trim, protected wheels, and a showroom-ready finish.",
      },
    ],
    [],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const active = projects[activeIndex];

  const next = () => setActiveIndex((prev) => (prev + 1) % projects.length);
  const previous = () =>
    setActiveIndex((prev) => (prev - 1 + projects.length) % projects.length);

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
      <div
        className={`rounded-3xl border ${cardBg} backdrop-blur-xl overflow-hidden`}
      >
        <div className="p-6 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-8 items-center">
          {/* Text */}
          <div>
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 ${accentBorder} ${accentSoft}`}
            >
              <Camera size={16} className={accentText} />
              <span className={`text-sm font-bold ${accentText}`}>
                TTC Project Showcase
              </span>
            </div>

            <h2 className="mt-5 text-4xl sm:text-5xl font-black tracking-tight">
              Real builds. Clean installs. Top-tier finishes.
            </h2>

            <p className={`mt-5 text-lg leading-relaxed ${subtle}`}>
              Give customers a visual look into the work done at Top Tier
              Customs — tint, lighting, detailing, protection, performance
              upgrades, and full build transformations.
            </p>

            <div className="mt-7 grid grid-cols-3 gap-3">
              {[
                ["40+", "Projects"],
                ["4.9", "Rating"],
                ["100%", "Detail"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className={`rounded-2xl border ${cardAlt} p-4`}
                >
                  <p className={`text-2xl font-black ${accentText}`}>{value}</p>
                  <p className={`text-xs font-semibold ${subtle2}`}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Active media */}
          <div
            className={`relative rounded-3xl border ${cardAlt} overflow-hidden`}
          >
            <div className="relative h-[420px]">
              <img
                src={active.media}
                alt={active.title}
                className="h-full w-full object-cover transition duration-700"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {active.type === "video" && (
                <button className="absolute inset-0 m-auto h-20 w-20 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 grid place-items-center hover:scale-105 transition">
                  <Play className="text-white ml-1" size={34} />
                </button>
              )}

              <div className="absolute left-5 right-5 bottom-5">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${accentBorder} ${accentSoft} ${accentText}`}
                  >
                    {active.category}
                  </span>
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white">
                    {active.type === "video" ? "Video" : "Image"}
                  </span>
                </div>

                <h3 className="mt-4 text-3xl font-black text-white">
                  {active.title}
                </h3>

                <p className="mt-2 text-sm text-white/75 leading-relaxed">
                  {active.desc}
                </p>
              </div>

              <div className="absolute top-5 right-5 flex gap-2">
                <button
                  onClick={previous}
                  className="h-11 w-11 rounded-2xl bg-black/40 border border-white/20 backdrop-blur-xl grid place-items-center text-white hover:bg-black/60 transition"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={next}
                  className="h-11 w-11 rounded-2xl bg-black/40 border border-white/20 backdrop-blur-xl grid place-items-center text-white hover:bg-black/60 transition"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Thumbnails */}
        <div className="px-6 sm:px-8 lg:px-10 pb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {projects.map((project, index) => (
              <button
                key={project.title}
                onClick={() => setActiveIndex(index)}
                className={[
                  "group relative overflow-hidden rounded-3xl border h-44 transition hover:-translate-y-1",
                  index === activeIndex ? accentBorder : "border-white/10",
                ].join(" ")}
              >
                <img
                  src={project.media}
                  alt={project.title}
                  className="h-full w-full object-cover group-hover:scale-105 transition duration-700"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                <div className="absolute left-4 right-4 bottom-4 text-left">
                  <p className="text-white font-black leading-tight">
                    {project.title}
                  </p>
                  <p className="mt-1 text-xs text-white/70">
                    {project.category}
                  </p>
                </div>

                {project.type === "video" && (
                  <div className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/20 backdrop-blur-xl border border-white/20 grid place-items-center">
                    <Play className="text-white ml-0.5" size={16} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom strip */}
        <div
          className={`border-t ${isDark ? "border-white/10" : "border-black/10"} p-6 sm:p-8`}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: Wrench,
                title: "Install Quality",
                desc: "Clean wiring, fitment review, and professional execution.",
              },
              {
                icon: Sparkles,
                title: "Finish Focused",
                desc: "Every build should look sharp in person and online.",
              },
              {
                icon: Star,
                title: "Customer Ready",
                desc: "Perfect for showcasing completed builds and testimonials.",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className={`rounded-2xl border ${cardAlt} p-4`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-10 w-10 rounded-xl grid place-items-center border ${accentBorder} ${accentSoft}`}
                    >
                      <Icon size={18} className={accentText} />
                    </div>

                    <div>
                      <p className="font-black">{item.title}</p>
                      <p className={`mt-1 text-sm ${subtle2}`}>{item.desc}</p>
                    </div>

                    <ArrowUpRight size={18} className="ml-auto opacity-50" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProjectShowcase;
