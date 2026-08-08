import logo from "../../assets/images/logo/top-tier-customs_logo.jpg";
import { Link } from "react-router-dom";
import ToggleTheme from "../ui/ThemeToggle";

const Navbar = () => {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-black/10 bg-white/60 text-zinc-950 backdrop-blur-xl px-8 py-4 flex items-center justify-between dark:border-white/10 dark:bg-black/30 dark:text-white transition-all duration-300">
      {/* Logo */}
      <div className="flex items-center space-x-4">
        <img
          src={logo}
          alt="Top Tier Customs Logo"
          className="w-16 h-16 rounded-full border-3 border-sky-500 dark:border-rose-500"
        />
        <h1 className="text-3xl font-bold uppercase text-transparent bg-clip-text bg-linear-to-r from-zinc-950 to-sky-500 dark:from-red-500 dark:to-zinc-50 transition-all duration-300">
          Top Tier Customs
        </h1>
      </div>
      {/* Main Navigation Links */}
      <div className="flex items-center space-x-8 text-xl font-medium uppercase text-zinc-950 dark:text-zinc-50 transition-all duration-300">
        <Link to="/catalog">Catalog</Link>
        <Link to="/services">Services</Link>
        <Link to="/activity">Activity</Link>
        <Link to="/contact">Contact</Link>
      </div>
      {/* Auth Navigation Links */}
      <div className="flex items-center space-x-8">
        <p className="text-lg font-medium text-sky-600 dark:text-red-500 transition-all duration-300">
          samidmunir@outlook.com
        </p>
        <Link
          to="/dashboard"
          className="text-sm uppercase font-semibold border-3 p-2 rounded-lg text-green-600 dark:text-emerald-500 transition-all duration-300"
        >
          Dashboard
        </Link>
        <ToggleTheme />
      </div>
      {/* Global Controls */}
      {/* <div></div> */}
    </nav>
  );
};

export default Navbar;
