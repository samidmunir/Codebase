import hero_left from "../assets/images/hero/hero-left.jpg";
import hero_right from "../assets/images/hero/hero-right.jpg";

const Hero = () => {
  return (
    <main className="bg-zinc-100 dark:bg-zinc-900 transition-all duration-300">
      {/* Hero */}
      <section className="relative min-h-screen overflow-hidden">
        {/* 2-column background images container */}
        <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-2">
          <div className="relative">
            <img
              src={hero_left}
              alt="Custom automotive work"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="relative">
            <img
              src={hero_right}
              alt="Custom automotive work"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-white/30 dark:bg-black/50 transition-all duration-300" />
        {/* Foreground Content */}
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6 pt-20">
          <div className="mx-auto max-w-4xl text-center text-zinc-950 dark:text-zinc-50 transition-all duration-300">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em]">
              Premium Automotive Customization
            </p>
            <h1 className="text-5xl font-bold leading-tight md:text-7xl lg:text-8xl">
              Built Different.
              <span className="block">Designed for You.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-zinc-300 md:text-lg">
              Transform your vehicle with premium customization, detailing,
              performance upgrades, and expert craftsmanship.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button className="rounded-full bg-zinc-50 px-7 py-3 font-semibold text-zinc-950">
                Explore Services
              </button>

              <button className="rounded-full border border-white/50 dark:border-white/50 bg-white/10 dark:bg-white/10 px-7 py-3 font-semibold backdrop-blur-md">
                View Our Work
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Hero;
