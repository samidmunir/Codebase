import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/Theme";
import {
  ArrowUpRight,
  CalendarDays,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Wrench,
} from "lucide-react";
import logo from "../assets/logo.jpg";

const Footer = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const accentText = isDark ? "text-rose-300" : "text-sky-600";
  const accentBg = isDark ? "bg-rose-500" : "bg-sky-500";
  const accentHover = isDark ? "hover:bg-rose-500/90" : "hover:bg-sky-500/90";
  const accentBorder = isDark ? "border-rose-500/30" : "border-sky-500/30";
  const accentSoft = isDark ? "bg-rose-500/10" : "bg-sky-500/10";

  const footerBg = isDark
    ? "bg-zinc-950 text-zinc-50 border-white/10"
    : "bg-zinc-50 text-zinc-950 border-black/10";

  const cardBg = isDark
    ? "bg-white/5 border-white/10"
    : "bg-white/70 border-black/10";

  const subtle = isDark ? "text-white/70" : "text-black/70";
  const subtle2 = isDark ? "text-white/50" : "text-black/50";
  const divider = isDark ? "bg-white/10" : "bg-black/10";

  const links = {
    Shop: [
      { label: "Catalog", href: "/catalog" },
      { label: "Services", href: "/services" },
      { label: "Activity", href: "/activity" },
      { label: "Dashboard", href: "/dashboard" },
    ],
    Services: [
      { label: "Window Tint", href: "/services/window-tint" },
      { label: "Paint Protection", href: "/services/paint-protection" },
      { label: "Performance Installs", href: "/services/performance-install" },
      { label: "Premium Detailing", href: "/services/detailing" },
    ],
    Account: [
      { label: "Login / Register", href: "/auth" },
      { label: "Orders", href: "/dashboard" },
      { label: "Appointments", href: "/dashboard" },
      { label: "Support", href: "/dashboard" },
    ],
  };

  return (
    <footer className={`relative overflow-hidden border-t ${footerBg}`}>
      <div className="pointer-events-none absolute inset-0">
        <div
          className={`absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-3xl opacity-15 ${
            isDark ? "bg-rose-500" : "bg-sky-500"
          }`}
        />
      </div>

      <section className="relative mx-auto w-full px-16 py-8 lg:py-10">
        <div
          className={`rounded-3xl border ${cardBg} backdrop-blur-xl p-6 sm:p-8`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 ${accentBorder} ${accentSoft}`}
              >
                <Sparkles size={16} className={accentText} />
                <span className={`text-sm font-bold ${accentText}`}>
                  Ready for your next upgrade?
                </span>
              </div>

              <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight">
                Shop parts, book services, and manage your TTC build.
              </h2>

              <p className={`mt-3 max-w-2xl ${subtle}`}>
                Top Tier Customs brings curated automotive products, premium
                installations, and customer-first service into one clean
                platform.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate("/catalog")}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 font-bold text-white ${accentBg} ${accentHover} transition`}
              >
                Shop Catalog <ShoppingBag size={18} />
              </button>

              <button
                onClick={() => navigate("/services")}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 font-bold border transition ${
                  isDark
                    ? "border-white/10 bg-white/5 hover:bg-white/10"
                    : "border-black/10 bg-black/5 hover:bg-black/10"
                }`}
              >
                Book Service <CalendarDays size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1.2fr_2fr] gap-10">
          <div>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-3 text-left"
            >
              <img
                src={logo}
                alt="Top Tier Customs Logo"
                className={`h-14 w-14 rounded-full object-cover border-2 ${
                  isDark ? "border-rose-500" : "border-sky-500"
                }`}
              />

              <div>
                <h3
                  className={`text-2xl font-black uppercase bg-clip-text text-transparent bg-linear-to-r ${
                    isDark
                      ? "from-rose-500 to-zinc-50"
                      : "from-sky-500 to-zinc-950"
                  }`}
                >
                  Top-Tier Customs
                </h3>
                <p className={`text-sm ${subtle2}`}>
                  Premium automotive parts & services.
                </p>
              </div>
            </button>

            <p className={`mt-5 max-w-md leading-relaxed ${subtle}`}>
              Built for enthusiasts who care about clean fitment, premium
              execution, and a sharper ownership experience.
            </p>

            <div className="mt-6 space-y-3">
              <ContactRow icon={MapPin} text="New York / New Jersey Area" />
              <ContactRow icon={Phone} text="(000) 000-0000" />
              <ContactRow icon={Mail} text="support@toptiercustoms.com" />
            </div>

            <div className="mt-6 flex items-center gap-3">
              {[Mail].map((Icon, index) => (
                <button
                  key={index}
                  className={`h-11 w-11 rounded-2xl grid place-items-center border transition ${
                    isDark
                      ? "border-white/10 bg-white/5 hover:bg-white/10"
                      : "border-black/10 bg-black/5 hover:bg-black/10"
                  }`}
                >
                  <Icon size={19} className={accentText} />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {Object.entries(links).map(([section, items]) => (
              <div key={section}>
                <h4 className="font-black text-lg">{section}</h4>

                <div className="mt-4 space-y-3">
                  {items.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => navigate(item.href)}
                      className={`group flex items-center gap-2 text-sm font-semibold ${subtle} hover:${accentText} transition`}
                    >
                      <span>{item.label}</span>
                      <ArrowUpRight
                        size={14}
                        className="opacity-0 group-hover:opacity-100 transition"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`my-10 h-[1px] ${divider}`} />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div
            className={`flex flex-wrap items-center gap-3 text-sm ${subtle2}`}
          >
            <span>© {new Date().getFullYear()} Top Tier Customs LLC.</span>
            <span className="hidden sm:inline">•</span>
            <span>All rights reserved.</span>
          </div>

          <div
            className={`flex flex-wrap items-center gap-4 text-sm font-semibold ${subtle}`}
          >
            <span className="inline-flex items-center gap-2">
              <ShieldCheck size={16} className={accentText} />
              Secure checkout
            </span>
            <span className="inline-flex items-center gap-2">
              <Wrench size={16} className={accentText} />
              Pro install ready
            </span>
          </div>
        </div>
      </section>
    </footer>
  );
};

function ContactRow({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3 text-sm opacity-80">
      <Icon size={17} />
      <span>{text}</span>
    </div>
  );
}

export default Footer;
