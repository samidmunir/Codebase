// import { useLocation, useNavigate } from "react-router-dom";
// import { useAuth } from "../contexts/Auth";
// import { useTheme } from "../contexts/Theme";
// import { useState } from "react";
// import logo from "../assets/logo.jpg";
// import Cart from "../components/ui/Cart";
// import Theme from "../components/ui/Theme";
// import Logout from "../components/ui/Logout";
// import Login from "../components/ui/Login";
// import { X, Menu, Package, Wrench, Gauge, Activity } from "lucide-react";

// const navBaseItems = [
//   {
//     id: 0,
//     label: "Catalog",
//     href: "/catalog",
//     icon: <Package />,
//   },
//   {
//     id: 1,
//     label: "Services",
//     href: "/services",
//     icon: <Wrench />,
//   },
//   {
//     id: 2,
//     label: "Activity",
//     href: "/activity",
//     icon: <Activity />,
//   },
// ];

// const navAuthItems = [
//   {
//     id: 3,
//     label: "Dashboard",
//     href: "/dashboard",
//     icon: <Gauge />,
//   },
// ];

// const Navbar = () => {
//   const { theme } = useTheme();
//   const isDark = theme === "dark";

//   const { user, isAuthenticated } = useAuth();

//   const location = useLocation();
//   const navigate = useNavigate();

//   const [mobileOpen, setMobileOpen] = useState(false);

//   return (
//     <nav
//       className={`w-full px-8 py-4 fixed top-0 left-0 right-0 z-999 backdrop-blur-xs shadow-2xl transition-all duration-3000 ${
//         isDark ? "bg-zinc-950/90" : "bg-zinc-50/50"
//       }`}
//     >
//       <main className="flex items-center justify-between">
//         {/* Logo */}
//         <div
//           onClick={() => navigate("/")}
//           className="flex items-center gap-2 cursor-pointer"
//         >
//           <img
//             src={logo}
//             alt="Logo"
//             className={`w-12.5 lg:w-15 rounded-full border-3 transition-all duration-3000 ${
//               isDark ? "border-rose-500" : "border-sky-500"
//             }`}
//           />
//           <h1
//             className={`text-xl lg:text-2xl font-bold uppercase bg-clip-text text-transparent bg-linear-to-r transition-all duration-3000 ${
//               isDark ? "from-rose-500 to-zinc-50" : "from-sky-500 to-zinc-950"
//             }`}
//           >
//             Top-Tier Customs
//           </h1>
//         </div>
//         {/* Desktop Nav */}
//         <div className="hidden lg:flex items-center gap-8">
//           {navBaseItems.map((navItem) => (
//             <div
//               key={navItem.id}
//               onClick={() => navigate(navItem.href)}
//               className={`text-lg font-semibold uppercase flex items-center gap-1 cursor-pointer transition-all duration-3000 hover:scale-110 ${
//                 isDark ? "text-zinc-50" : "text-zinc-950"
//               } ${location.pathname === navItem.href && "text-rose-500"}`}
//             >
//               <p>{navItem.icon}</p>
//               <p>{navItem.label}</p>
//             </div>
//           ))}
//           {isAuthenticated &&
//             navAuthItems.map((navItem) => (
//               <div
//                 key={navItem.id}
//                 onClick={() => navigate(navItem.href)}
//                 className={`text-lg font-semibold uppercase flex items-center gap-1 cursor-pointer transition-all duration-3000 hover:scale-110 ${
//                   isDark ? "text-zinc-50" : "text-zinc-950"
//                 }`}
//               >
//                 <p>{navItem.icon}</p>
//                 <p>{navItem.label}</p>
//               </div>
//             ))}
//         </div>
//         {/* Right CTA */}
//         <div className="flex items-center gap-2 md:gap-4 lg:gap-6">
//           <Cart />
//           <Theme />
//           {isAuthenticated && <p className={``}>samidmunir@outlook.com</p>}
//           {isAuthenticated ? <Logout /> : <Login />}
//           {/* Hamburger Menu Btn */}
//           <button
//             onClick={() => setMobileOpen((prev) => !prev)}
//             className={`p-1 lg:hidden cursor-pointer transition-all duration-3000 ${
//               isDark ? "text-zinc-50" : "text-zinc-950"
//             }`}
//           >
//             {mobileOpen ? <X /> : <Menu />}
//           </button>
//         </div>
//       </main>
//       {/* Mobile Drop-down */}
//       {mobileOpen && (
//         <section className="flex flex-col gap-4 mt-4 lg:hidden">
//           {[...navBaseItems, ...(isAuthenticated ? navAuthItems : [])].map(
//             (navItem) => (
//               <div
//                 key={navItem.id}
//                 className={`flex items-center gap-1 font-semibold cursor-pointer transition-all duration-1000 ${
//                   isDark ? "text-zinc-50" : "text-zinc-950"
//                 }`}
//               >
//                 <p>{navItem.icon}</p>
//                 <p>{navItem.label}</p>
//               </div>
//             )
//           )}
//           {isAuthenticated && (
//             <div className="flex items-center justify-between">
//               <p>Sami Munir</p>
//               <p>samidmunir@outlook.com</p>
//             </div>
//           )}
//         </section>
//       )}
//     </nav>
//   );
// };

// export default Navbar;

import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/Auth";
import { useTheme } from "../contexts/Theme";
import { useEffect, useState } from "react";
import logo from "../assets/logo.jpg";
import Cart from "../components/ui/Cart";
import Theme from "../components/ui/Theme";
import Logout from "../components/ui/Logout";
import Login from "../components/ui/Login";
import { X, Menu, Package, Wrench, Gauge, Activity } from "lucide-react";

const navBaseItems = [
  { id: 0, label: "Catalog", href: "/catalog", icon: <Package /> },
  { id: 1, label: "Services", href: "/services", icon: <Wrench /> },
  { id: 2, label: "Activity", href: "/activity", icon: <Activity /> },
];

const navAuthItems = [
  { id: 3, label: "Dashboard", href: "/dashboard", icon: <Gauge /> },
];

const Navbar = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { isAuthenticated } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile menu when the route changes (nice UX)
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const mobileItems = [
    ...navBaseItems,
    ...(isAuthenticated ? navAuthItems : []),
  ];

  const handleMobileNav = (href) => {
    navigate(href);
    setMobileOpen(false);
  };

  return (
    <nav
      className={`w-full px-8 py-4 fixed top-0 left-0 right-0 z-999 backdrop-blur-xs shadow-2xl transition-all duration-3000 ${
        isDark ? "bg-zinc-950/90" : "bg-zinc-50/50"
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
            className={`w-12.5 lg:w-15 rounded-full border-3 transition-all duration-3000 ${
              isDark ? "border-rose-500" : "border-sky-500"
            }`}
          />
          <h1
            className={`text-xl lg:text-2xl font-bold uppercase bg-clip-text text-transparent bg-linear-to-r transition-all duration-3000 ${
              isDark ? "from-rose-500 to-zinc-50" : "from-sky-500 to-zinc-950"
            }`}
          >
            Top-Tier Customs
          </h1>
        </div>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-8">
          {navBaseItems.map((navItem) => (
            <div
              key={navItem.id}
              onClick={() => navigate(navItem.href)}
              className={`text-lg font-semibold uppercase flex items-center gap-1 cursor-pointer transition-all duration-3000 hover:scale-110 ${
                isDark ? "text-zinc-50" : "text-zinc-950"
              } ${location.pathname === navItem.href && "text-rose-500"}`}
            >
              <p>{navItem.icon}</p>
              <p>{navItem.label}</p>
            </div>
          ))}

          {isAuthenticated &&
            navAuthItems.map((navItem) => (
              <div
                key={navItem.id}
                onClick={() => navigate(navItem.href)}
                className={`text-lg font-semibold uppercase flex items-center gap-1 cursor-pointer transition-all duration-3000 hover:scale-110 ${
                  isDark ? "text-zinc-50" : "text-zinc-950"
                } ${location.pathname === navItem.href && "text-rose-500"}`}
              >
                <p>{navItem.icon}</p>
                <p>{navItem.label}</p>
              </div>
            ))}
        </div>

        {/* Right CTA */}
        <div className="flex items-center gap-2 md:gap-4 lg:gap-6">
          <Cart />
          <Theme />
          {isAuthenticated && (
            <p
              className={`${
                isDark ? "text-zinc-200" : "text-zinc-800"
              } hidden md:block`}
            >
              samidmunir@outlook.com
            </p>
          )}
          {isAuthenticated ? <Logout /> : <Login />}

          {/* Hamburger Menu Btn */}
          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className={`p-1 lg:hidden cursor-pointer transition-all duration-3000 ${
              isDark ? "text-zinc-50" : "text-zinc-950"
            }`}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
      </main>

      {/* Mobile Drop-down (always rendered so it can animate) */}
      <section
        className={[
          "lg:hidden overflow-hidden transition-all duration-1500 ease-out",
          // animation states
          mobileOpen
            ? "max-h-[520px] opacity-100 translate-y-0 mt-4"
            : "max-h-0 opacity-0 -translate-y-2 mt-0",
          // prevent clicks when closed
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        ].join(" ")}
      >
        <div className="flex flex-col gap-4 pb-2">
          {mobileItems.map((navItem) => (
            <div
              key={navItem.id}
              onClick={() => handleMobileNav(navItem.href)}
              className={`flex items-center gap-2 font-semibold cursor-pointer transition-all duration-300 hover:translate-x-1 ${
                isDark ? "text-zinc-50" : "text-zinc-950"
              } ${location.pathname === navItem.href && "text-rose-500"}`}
            >
              <p>{navItem.icon}</p>
              <p className="uppercase">{navItem.label}</p>
            </div>
          ))}

          {isAuthenticated && (
            <div
              className={`mt-2 rounded-xl p-3 border transition-all duration-300 ${
                isDark
                  ? "border-zinc-800 bg-zinc-950/40 text-zinc-200"
                  : "border-zinc-200 bg-zinc-50/60 text-zinc-800"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold">Sami Munir</p>
                <p className="text-sm opacity-80">samidmunir@outlook.com</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </nav>
  );
};

export default Navbar;
