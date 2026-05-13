import { useTheme } from "../../contexts/Theme";
import { ArrowRight } from "lucide-react";

const FeaturedCategories = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section className={`${isDark ? "bg-zinc-950/90" : "bg-zinc-50/90"}`}>
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold uppercase tracking-wide">
              Shop categories
            </h2>
            <p className="opacity-80 mt-2">
              Jump straight to what you want to upgrade.
            </p>
          </div>
          <button
            onClick={() => navigate("/catalog")}
            className="hidden md:inline-flex items-center gap-2 px-5 py-3 rounded-full font-semibold border-2 border-rose-500 hover:bg-rose-500 transition"
          >
            Browse all <ArrowRight />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              title: "Performance",
              tag: "Power + response",
              accent: "border-rose-500/50",
            },
            {
              title: "Exterior",
              tag: "Aero + styling",
              accent: "border-sky-500/50",
            },
            {
              title: "Interior",
              tag: "Comfort + detail",
              accent: "border-rose-500/50",
            },
            {
              title: "Wheels & Tires",
              tag: "Stance + grip",
              accent: "border-sky-500/50",
            },
            {
              title: "Lighting",
              tag: "Visibility + glow",
              accent: "border-rose-500/50",
            },
            {
              title: "Audio",
              tag: "Clarity + punch",
              accent: "border-sky-500/50",
            },
          ].map((c) => (
            <button
              key={c.title}
              onClick={() =>
                navigate(`/catalog?category=${encodeURIComponent(c.title)}`)
              }
              className={`text-left rounded-2xl p-6 border ${c.accent} ${
                isDark ? "bg-white/5" : "bg-black/5"
              } hover:translate-y-[-2px] transition`}
            >
              <p className="text-xl font-bold">{c.title}</p>
              <p className="opacity-80 mt-1">{c.tag}</p>
              <div className="mt-5 h-[1px] w-full bg-white/10" />
              <p className="mt-4 inline-flex items-center gap-2 font-semibold">
                Explore <ArrowRight className="opacity-80" />
              </p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCategories;
