import { useTheme } from "../../contexts/Theme";

const HowItWorks = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section className={`${isDark ? "bg-zinc-950/90" : "bg-zinc-50/90"}`}>
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold uppercase tracking-wide">
            How it works
          </h2>
          <p className="opacity-80 mt-2">
            From idea to install — fast and clean.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              n: "01",
              t: "Browse & Build",
              d: "Pick parts by category or vehicle fitment.",
            },
            {
              n: "02",
              t: "Schedule",
              d: "Choose a service date that works for you.",
            },
            {
              n: "03",
              t: "Drive Out Different",
              d: "Pickup with confidence — tuned to your style.",
            },
          ].map((s) => (
            <div
              key={s.n}
              className={`rounded-2xl p-6 border ${
                isDark
                  ? "bg-white/5 border-white/10"
                  : "bg-black/5 border-black/10"
              }`}
            >
              <p className="text-sm tracking-widest opacity-70">{s.n}</p>
              <p className="text-xl font-bold mt-2">{s.t}</p>
              <p className="opacity-80 mt-2">{s.d}</p>
              <div className="mt-5 h-[2px] w-full bg-gradient-to-r from-rose-500/0 via-rose-500/70 to-rose-500/0" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
