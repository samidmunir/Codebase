import { ArrowRight, Bookmark } from "lucide-react";
import { useTheme } from "../../contexts/Theme";
import { useNavigate } from "react-router-dom";

const Hero = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const navigate = useNavigate();

  return (
    <main
      className={`relative w-full h-screen grid grid-cols-1 md:grid-cols-2 transition-all duration-3000 ${
        isDark ? "bg-zinc-950/90 text-zinc-50" : "bg-zinc-50/90 text-zinc-950"
      }`}
    >
      {/* Left BG image */}
      <div className="relative h-full">
        <div className="absolute inset-0 bg-[url('/images/hero-left.jpg')] bg-cover bg-center"></div>
        <div
          className={`absolute inset-0 transition-all duration-3000 ${
            isDark ? "bg-black/50" : "bg-white/30"
          }`}
        />
      </div>
      {/* Right BG image */}
      <div className="relative h-full">
        <div className="absolute inset-0 bg-[url('/images/hero-right.jpg')] bg-cover bg-center"></div>
        <div
          className={`absolute inset-0 transition-all duration-3000 ${
            isDark ? "bg-black/50" : "bg-white/30"
          }`}
        />
      </div>
      {/* Overlay text */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="max-w-2xl lg:max-w-5xl text-center space-y-4 md:space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-wide leading-tight">
            Customize. Dominate. Drive.
          </h1>
          <p className="text-base md:text-lg lg:text-2xl opacity-80 max-w-md lg:max-w-lg mx-auto">
            Top-tier mods. Legendary performance. Built for your passion.
          </p>
          <div className="w-full mx-auto flex justify-center items-center gap-4 text-center">
            <button
              onClick={() => navigate("/catalog")}
              className={`text-md md:text-xl inline-flex items-center gap-1 px-2 py-2 md:px-6 md:py-3 rounded-full font-semibold border-3 border-rose-500 drop-shadow-2xl ${
                isDark ? "text-zinc-50" : "text-zinc-950"
              } transition-all duration-1000 hover:bg-rose-500`}
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
      </div>
    </main>
  );
};

export default Hero;
