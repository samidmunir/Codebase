import { useTheme } from "../context/ThemeContext";
import logo from "../assets/logo.JPG";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "./ui/ThemeToggle";

const Navbar = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const navigate = useNavigate();

  return (
    <nav className="w-full">
      <main
        className={`flex items-center justify-between px-4 py-2 ${isDark ? "bg-zinc-900" : "bg-zinc-100"} transition-all duration-3000`}
      >
        <div className="flex items-center gap-2">
          <img
            src={logo}
            alt="Top Tier Customs Logo"
            className={`w-16 h-16 rounded-full border-3 ${isDark ? "border-rose-500" : "border-sky-500"} transition-all duration-1500`}
          />
          <h1
            onClick={() => navigate("/")}
            className={`text-3xl font-bold uppercase bg-linear-to-r bg-clip-text text-transparent ${isDark ? "from-rose-500 to-zinc-50" : "from-sky-500 to-zinc-950"} transition-all duration-1500`}
          >
            Top Tier Customs
          </h1>
        </div>
        <div>
          <ul className="flex items-center gap-4">
            <li
              className={`text-lg font-medium uppercase ${isDark ? "text-zinc-50" : "text-zinc-950"} transition-all duration-1500`}
            >
              Catalog
            </li>
            <li
              className={`text-lg font-medium uppercase ${isDark ? "text-zinc-50" : "text-zinc-950"} transition-all duration-1500`}
            >
              Services
            </li>
            <li
              className={`text-lg font-medium uppercase ${isDark ? "text-zinc-50" : "text-zinc-950"} transition-all duration-1500`}
            >
              About
            </li>
            <li
              className={`text-lg font-medium uppercase ${isDark ? "text-zinc-50" : "text-zinc-950"} transition-all duration-1500`}
            >
              Contact
            </li>
          </ul>
        </div>
        <div className="flex items-center gap-4">
          <button
            className={`px-2 py-1 text-lg font-semibold uppercase border-3 rounded-md ${isDark ? "border-zinc-500 text-zinc-500 hover:bg-zinc-500 hover:text-zinc-950" : ""} transition-all duration-1500`}
          >
            Signup
          </button>
          <button
            onClick={() => navigate("/login")}
            className={`px-2 py-1 text-lg font-semibold uppercase border-3 border-gray-300 rounded-md ${isDark ? "border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-zinc-950" : ""} transition-all duration-1500`}
          >
            Login
          </button>
          <ThemeToggle />
        </div>
      </main>
    </nav>
  );
};

export default Navbar;
