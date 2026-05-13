import { useTheme } from "../../contexts/Theme";
import { ArrowRight, ShieldCheck, Star, Truck, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";

const trustItems = [
  {
    id: 0,
    icon: <ShieldCheck />,
    title: "Quality Parts",
    desc: "Curated brands. Fitment-first. No guesswork.",
  },
  {
    id: 1,
    icon: <Wrench />,
    title: "Pro Installs",
    desc: "Clean work, tight tolerances, serious attention.",
  },
  {
    id: 2,
    icon: <Truck />,
    title: "Fast Fullfillment",
    desc: "Quick shipping and easy pickup options.",
  },
];

const TrustStrip = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const navigate = useNavigate();

  return (
    <main
      className={`w-full px-16 py-8 transition-all duration-3000 ${
        isDark ? "bg-zinc-950/90" : "bg-zinc-50/90"
      }`}
    >
      {/* Header */}
      <header className="pb-8">
        <h1
          className={`text-3xl md:text-4xl font-bold uppercase transition-all duration-1000 ${
            isDark ? "text-zinc-50" : "text-zinc-950"
          }`}
        >
          Why are we top tier?
        </h1>
      </header>
      {/* Main content */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-16">
        {trustItems.map((item) => (
          // Trust item card
          <div
            key={item.id}
            className={`rounded-md px-4 py-4 border-3 bg-linear-to-br shadow-2xl transition-all duration-3000 ${
              isDark
                ? "from-zinc-900 to-zinc-950 border-zinc-900"
                : "from-zinc-100 to-zinc-50 border-zinc-50"
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`h-12 w-12 grid place-items-center rounded-xl transition-all duration-1000 ${
                  isDark ? "text-zinc-100" : "text-zinc-900"
                }`}
              >
                {item.icon}
              </div>
              <div>
                <h3
                  className={`text-2xl font-semibold transition-all duration-1000 ${
                    isDark ? "text-zinc-300" : "text-zinc-800"
                  }`}
                >
                  {item.title}
                </h3>
                <p
                  className={`text-xl font-medium transition-all duration-1000 ${
                    isDark ? "text-zinc-500" : "text-zinc-700"
                  }`}
                >
                  {item.desc}
                </p>
              </div>
            </div>
          </div>
        ))}
      </section>
      <section className="max-w-7xl py-8">
        <p
          className={`text-lg transition-all duration-1000 ${
            isDark ? "text-zinc-300" : "text-zinc-900"
          }`}
        >
          Because details matter. We curate proven, high-quality parts and pair
          them with precision installs that respect your build as much as you
          do. No shortcuts, no guesswork — just clean execution, transparent
          service, and results you can feel every time you drive. Whether you’re
          chasing performance, aesthetics, or both, we build with intent and
          deliver with pride. -{" "}
          <span className="italic text-rose-500 font-medium">
            CEO & Founder @TTC
          </span>
        </p>
      </section>
    </main>
  );
};

export default TrustStrip;
