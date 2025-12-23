import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/Theme";
import { ArrowRight, Bookmark } from "lucide-react";

const Hero = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const navigate = useNavigate();

  return (
    <main
      className={`relative w-full h-screen grid grid-cols-1 md:grid-cols-2 transition-all duration-3000`}
    >
      {/* Left BG Image */}
      <section className="relative h-full">
        <div className="absolute inset-0 bg-[url('/images/hero-left.jpg')] bg-cover bg-center"></div>
        <div
          className={`absolute inset-0 transition-all duration-3000 ${
            isDark ? "bg-black/50" : "bg-white/30"
          }`}
        />
      </section>
      {/* Right BG Image */}
      <section className="relative h-full">
        <div className="absolute inset-0 bg-[url('/images/hero-right.jpg')] bg-cover bg-center"></div>
        <div
          className={`absolute inset-0 transition-all duration-3000 ${
            isDark ? "bg-black/50" : "bg-white/30"
          }`}
        />
      </section>
      {/* Overlay Content */}
      <section className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="max-w-2xl lg:max-w-5xl text-center space-y-4 md:space-y-6">
          <h1
            className={`text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-wide leading-tight`}
          >
            Customize. Dominate. Drive.
          </h1>
          <p
            className={`text-base md:text-lg lg:text-2xl opacity-80 max-w-md lg:max-w-lg mx-auto`}
          >
            Top-tier modes. Legendary performance. Built for your passion.
          </p>
          {/* CTA Buttons */}
          <div className="w-full mx-auto flex justify-center items-center gap-4 text-center">
            <button
              onClick={() => navigate("/catalog")}
              className={`text-md md:text-xl inline-flex items-center gap-1 px-2 py-2 md:px-6 md:py-3 rounded-full font-semibold border-3 border-rose-500 drop-shadow-2xl transition-all duration-1000 ${
                isDark ? "text-zinc-50" : "text-zinc-950"
              } hover:bg-rose-500`}
            >
              Browse Products <ArrowRight />
            </button>
            <button
              onClick={() => navigate("/services")}
              className={`text-md md:text-xl inline-flex items-center gap-1 px-2 py-2 md:px-6 md:py-3 rounded-full font-semibold border-3 border-sky-500 drop-shadow-2xl transition-all duration-1000 ${
                isDark ? "text-zinc-50" : "text-zinc-950"
              } hover:bg-sky-500`}
            >
              Schedule a Service <Bookmark />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Hero;
