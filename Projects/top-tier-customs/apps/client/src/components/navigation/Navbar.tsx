import logo from "../../assets/images/logo/top-tier-customs_logo.jpg";
import { Activity, CarFront, Toolbox } from "lucide-react";
import { NavLink, Link } from "react-router-dom";
import GarageStatus from "../ui/GarageStatus";
import ToggleTheme from "../ui/ThemeToggle";

const Navbar = () => {
  return (
    <nav className="w-full fixed inset-x-0 top-0 z-50 border-b border-black/10 bg-white/60 text-zinc-950 backdrop-blur-xl px-8 py-4 flex items-center justify-between dark:border-white/10 dark:bg-black/30 dark:text-white transition-all duration-300">
      <Link to="/" className="flex items-center space-x-4">
        <img
          src={logo}
          alt="Top Tier Customs Logo"
          className="w-16 h-16 rounded-full border-3 border-sky-500 dark:border-rose-500 transition-all duration-300"
        />
        <h1 className="text-3xl font-bold uppercase text-transparent bg-clip-text bg-linear-to-r from-zinc-950 to-sky-500 dark:from-red-500 dark:to-zinc-50 transition-all duration-300">
          Top Tier Customs
        </h1>
      </Link>
      <div className="flex items-center space-x-16 text-xl font-medium uppercase text-zinc-950 dark:text-zinc-50 transition-all duration-300">
        <NavLink
          to="/services"
          className={({ isActive }) =>
            `
    relative
    flex items-center gap-2
    py-2

    ${
      isActive
        ? "text-sky-500 dark:text-rose-500"
        : "hover:text-sky-500 dark:hover:text-rose-500"
    }

    after:absolute
    after:left-0
    after:-bottom-1
    after:h-0.75
    after:w-full
    after:rounded-full
    after:bg-sky-500
    after:transition-all

    dark:after:bg-rose-500

    ${
      isActive ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100"
    }

    after:origin-left
    `
          }
        >
          <Toolbox />
          Services
        </NavLink>
        <Link to="/activity" className="flex items-center gap-2">
          <Activity /> Activity
        </Link>
        <Link to="/contact" className="flex items-center gap-2">
          <CarFront /> Garage
        </Link>
      </div>
      <div className="flex items-center gap-8">
        <GarageStatus />
        <ToggleTheme />
      </div>
    </nav>
  );
};

export default Navbar;
