import { useTheme } from "../../contexts/Theme";
import { ArrowRight } from "lucide-react";

const FinalCTA = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section className={`${isDark ? "bg-zinc-950/90" : "bg-zinc-50/90"}`}>
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div
          className={`rounded-3xl p-8 md:p-10 border ${
            isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
          }`}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wide">
                Ready to build your next upgrade?
              </h3>
              <p className="opacity-80 mt-2">
                Shop parts or book a service — we’ll get you dialed in.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/catalog")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold border-2 border-rose-500 hover:bg-rose-500 transition"
              >
                Browse Products <ArrowRight />
              </button>
              <button
                onClick={() => navigate("/services")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold border-2 border-sky-500 hover:bg-sky-500 transition"
              >
                Book Service <ArrowRight />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
