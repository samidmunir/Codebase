import logo from "../../assets/images/logo/top-tier-customs_logo.jpg";
import { Activity, CarFront, Toolbox } from "lucide-react";
import { Link } from "react-router-dom";
import GarageStatus from "../ui/GarageStatus";
import ToggleTheme from "../ui/ThemeToggle";

const Navbar = () => {
  return (
    <nav className="w-full fixed inset-x-0 top-0 z-50 border-b border-black/10 bg-white/60 text-zinc-950 backdrop-blur-xl px-8 py-4 flex items-center justify-between dark:border-white/10 dark:bg-black/30 dark:text-white transition-all duration-300">
      <div className="flex items-center space-x-4">
        <img
          src={logo}
          alt="Top Tier Customs Logo"
          className="w-16 h-16 rounded-full border-3 border-sky-500 dark:border-rose-500 transition-all duration-300"
        />
        <h1 className="text-3xl font-bold uppercase text-transparent bg-clip-text bg-linear-to-r from-zinc-950 to-sky-500 dark:from-red-500 dark:to-zinc-50 transition-all duration-300">
          Top Tier Customs
        </h1>
      </div>
      <div className="flex items-center space-x-16 text-xl font-medium uppercase text-zinc-950 dark:text-zinc-50 transition-all duration-300">
        <Link to="/services" className="flex items-center gap-2">
          <Toolbox /> Services
        </Link>
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
