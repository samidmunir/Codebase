import { useTheme } from "../../context/Theme";
import { ArrowRight } from "lucide-react";

const Hero = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section
      className={`relative w-full h-screen grid grid-cols-1 md:grid-cols-2 transition-all duration-3000 ${
        isDark ? "bg-zinc-950/90 text-zinc-50" : "bg-zinc-50/90 text-zinc-950"
      }`}
    >
      {/* LEFT BG IMG */}
      <div className="relative h-full">
        <div className="absolute inset-0 bg-[url('/images/hero-left.jpg')] bg-cover bg-center" />
        <div
          className={`transition-all duration-3000 absolute inset-0 ${
            isDark ? "bg-black/50" : "bg-white/50"
          }`}
        />
      </div>
      {/* RIGHT BG IMG */}
      <div className="relative h-full">
        <div className="absolute inset-0 bg-[url('/images/hero-right.jpg')] bg-cover bg-center" />
        <div
          className={`transition-all duration-3000 absolute inset-0 ${
            isDark ? "bg-black/50" : "bg-white/50"
          }`}
        />
      </div>
      <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
        <div className="max-w-2xl text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-wide leading-tight">
            Customize. Dominate. Drive.
          </h1>
          <p className="text-base md:text-lg opacity-80 max-w-md mx-auto">
            Top-tier mods. Legendary performance. Built for your passion.
          </p>
          <div className="w-full mx-auto flex justify-center items-center gap-4 text-center">
            <a
              href="/products"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-sky-500 text-zinc-100 font-semibold hover:bg-zinc-100 hover:text-zinc-950 transition-all duration-1000"
            >
              Browse Products <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/services"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-rose-500 text-zinc-100 font-semibold hover:bg-zinc-100 hover:text-zinc-950 transition-all duration-1000"
            >
              Book a Service <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
