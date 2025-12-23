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
    <nav>
      <main>
        {/* Logo */}
        <div></div>
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
