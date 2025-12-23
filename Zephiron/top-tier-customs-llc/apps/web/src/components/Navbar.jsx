import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/Auth";
import { useTheme } from "../contexts/Theme";
import { useState } from "react";
import logo from "../assets/logo.jpg";

const Navbar = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { user, isAuthenticated } = useAuth();

  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      className={`w-full px-8 py-4 fixed top-0 left-0 right-0 z-999 backdrop-blur-xs shadow-2xl transition-all duration-3000 ${
        isDark ? "bg-zinc-950/90 text-zinc-50" : "bg-zinc-50/50 text-zinc-950"
      }`}
    >
      <main className="flex items-center justify-between">
        {/* Logo */}
        <div
          onClick={() => navigate("/")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <img
            src={logo}
            alt="Logo"
            className={`w-12.5 lg:w-15 rounded-full border-3 transition-all duration-1000 ${
              isDark ? "border-rose-500" : "border-sky-500"
            }`}
          />
          <h1
            className={`text-xl lg:text-2xl font-bold uppercase bg-clip-text text-transparent bg-linear-to-r transition-all duration-1000 ${
              isDark ? "from-rose-500 to-zinc-50" : "from-sky-500 to-zinc-950"
            }`}
          >
            Top-Tier Customs
          </h1>
        </div>
        {/* Desktop Nav */}
        <div></div>
        {/* Right CTA */}
        <div></div>
      </main>
      {/* Mobile Drop-down */}
      <section></section>
    </nav>
  );
};

export default Navbar;
