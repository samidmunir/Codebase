import { useTheme } from "../../contexts/Theme";
import { Star } from "lucide-react";

const Testimonials = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section className={`${isDark ? "bg-zinc-950/90" : "bg-zinc-50/90"}`}>
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold uppercase tracking-wide">
            Built & approved
          </h2>
          <p className="opacity-80 mt-2">Real builds. Real results.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              name: "Jordan R.",
              car: "BMW 340i",
              quote:
                "Install was spotless. Fitment perfect. Car feels brand new.",
            },
            {
              name: "Mia S.",
              car: "WRX",
              quote:
                "Fast turnaround and the parts are legit. The look is insane.",
            },
            {
              name: "Chris T.",
              car: "Mustang GT",
              quote:
                "They actually care about details. Best shop experience I’ve had.",
            },
          ].map((t) => (
            <div
              key={t.name}
              className={`rounded-2xl p-6 border ${
                isDark
                  ? "bg-white/5 border-white/10"
                  : "bg-black/5 border-black/10"
              }`}
            >
              <div className="flex items-center gap-1 mb-3">
                <Star className="opacity-90" />
                <Star className="opacity-90" />
                <Star className="opacity-90" />
                <Star className="opacity-90" />
                <Star className="opacity-90" />
              </div>
              <p className="opacity-90">“{t.quote}”</p>
              <p className="mt-4 font-semibold">{t.name}</p>
              <p className="text-sm opacity-70">{t.car}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
