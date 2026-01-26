import Link from "next/link";
import { GiCrossedAirFlows } from "react-icons/gi";
import { FaRegBell } from "react-icons/fa";
import { FiSearch } from "react-icons/fi";

const navItemsPrimary = [
  {
    id: 0,
    label: "Book",
    href: "/flights",
  },
  {
    id: 1,
    label: "Check-In",
    href: "/check-in",
  },
  {
    id: 2,
    label: "My Trips",
    href: "/my-trips",
  },
  {
    id: 3,
    label: "Flight Status",
    href: "/flights/status",
  },
];

const navItemsSecondary = [
  {
    id: 0,
    label: "Travel Info",
    href: "/travel-info",
  },
  {
    id: 1,
    label: "Velocity Miles",
    href: "/miles",
  },
  {
    id: 2,
    label: "Need Help?",
    href: "/help",
  },
];

const Navbar = () => {
  return (
    <header className="bg-zinc-950 w-full px-8 py-2 flex justify-between items-center">
      {/* Desktop Nav - Logo */}
      <div className="flex items-center gap-4">
        <GiCrossedAirFlows size={28} className="text-sky-500" />
        <Link href="/" className="text-[28px] font-bold">
          <span className="text-zinc-100">Light</span>
          <span className="text-sky-500">Velocity</span>
        </Link>
      </div>
      {/* Desktop Nav - Main Items */}
      <nav className="flex items-center gap-8 border-2">
        <div className="flex items-center gap-4">
          {navItemsPrimary.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="text-zinc-300 font-semibold uppercase text-[16px]"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4">
          {navItemsSecondary.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="text-zinc-300 font-medium text-[14px]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      {/* Desktop Nav - Right User Controls */}
      <div className="flex items-center gap-4">
        <Link
          href="/auth/signup"
          className="text-zinc-100 uppercase font-semibold px-2 py-1"
        >
          Sign Up
        </Link>
        <Link
          href="/auth/signup"
          className="text-zinc-100 uppercase font-semibold bg-red-500 px-2 py-1"
        >
          Log In
        </Link>
        <FaRegBell size={28} className="text-zinc-100" />
        <FiSearch size={28} className="text-zinc-100" />
      </div>
    </header>
  );
};

export default Navbar;
