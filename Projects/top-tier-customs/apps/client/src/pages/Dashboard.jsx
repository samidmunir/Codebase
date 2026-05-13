// Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../contexts/Theme";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingBag,
  Wrench,
  User,
  Bell,
  Settings,
  CreditCard,
  Receipt,
  Heart,
  LifeBuoy,
  LogOut,
  Search,
  ArrowUpRight,
  ArrowRight,
  Plus,
  CalendarDays,
  MapPin,
  Truck,
  ShieldCheck,
  Star,
  Filter,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Sparkles,
} from "lucide-react";

/**
 * Stunning, professional, responsive customer dashboard
 * - Sidebar with tabs toggling main content
 * - Responsive mobile drawer sidebar
 * - Theme-aware accent: dark -> rose, light -> sky
 * - Complex layout: KPIs, orders, appointments, favorites, profile, notifications, settings
 */
export default function Dashboard() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const accent = isDark ? "rose" : "sky";
  const accentBg = isDark ? "bg-rose-500" : "bg-sky-500";
  const accentBgSoft = isDark ? "bg-rose-500/10" : "bg-sky-500/10";
  const accentBorder = isDark ? "border-rose-500/30" : "border-sky-500/30";
  const accentText = isDark ? "text-rose-300" : "text-sky-600";
  const accentHover = isDark ? "hover:bg-rose-500/90" : "hover:bg-sky-500/90";

  const shellBg = isDark
    ? "bg-zinc-950/90 text-zinc-50"
    : "bg-zinc-50/90 text-zinc-950";
  const cardBg = isDark
    ? "bg-white/5 border-white/10"
    : "bg-white/70 border-black/10";
  const cardBgAlt = isDark
    ? "bg-black/20 border-white/10"
    : "bg-white border-black/10";
  const subtleText = isDark ? "text-white/70" : "text-black/70";
  const subtleText2 = isDark ? "text-white/60" : "text-black/60";
  const divider = isDark ? "bg-white/10" : "bg-black/10";

  const tabs = useMemo(
    () => [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "orders", label: "Orders", icon: ShoppingBag },
      { id: "services", label: "Appointments", icon: Wrench },
      { id: "favorites", label: "Favorites", icon: Heart },
      { id: "billing", label: "Billing", icon: CreditCard },
      { id: "profile", label: "Profile", icon: User },
      { id: "alerts", label: "Notifications", icon: Bell },
      { id: "settings", label: "Settings", icon: Settings },
      { id: "support", label: "Support", icon: LifeBuoy },
    ],
    []
  );

  const [activeTab, setActiveTab] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [orderFilter, setOrderFilter] = useState("All");
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Demo user + data (replace with real API data)
  const user = {
    name: "Sami",
    email: "sami@example.com",
    tier: "Member",
    vehicle: "BMW 340i",
    location: "New York, NY",
    avatarInitials: "SA",
  };

  const kpis = [
    {
      label: "Active Orders",
      value: "2",
      delta: "+1 this week",
      icon: ShoppingBag,
    },
    {
      label: "Upcoming Appointments",
      value: "1",
      delta: "Next: Dec 22",
      icon: CalendarDays,
    },
    {
      label: "Rewards Points",
      value: "1,240",
      delta: "Redeemable",
      icon: Star,
    },
    { label: "Saved Items", value: "14", delta: "Favorites", icon: Heart },
  ];

  const orders = [
    {
      id: "TTC-10482",
      status: "In Transit",
      date: "Dec 14, 2025",
      total: 389.99,
      items: [
        { name: "Ceramic Tint Kit", qty: 1, price: 229.99 },
        { name: "LED Interior Pack", qty: 1, price: 79.99 },
        { name: "Microfiber Bundle", qty: 2, price: 40.0 },
      ],
      tracking: "1Z83A1X9…",
      eta: "Dec 19–20",
    },
    {
      id: "TTC-10427",
      status: "Processing",
      date: "Dec 09, 2025",
      total: 649.0,
      items: [
        { name: "Cold Air Intake", qty: 1, price: 349.0 },
        { name: "Performance Filter", qty: 1, price: 89.0 },
        { name: "Install Hardware Kit", qty: 1, price: 59.0 },
      ],
      tracking: null,
      eta: "Dec 21–23",
    },
    {
      id: "TTC-10311",
      status: "Delivered",
      date: "Nov 28, 2025",
      total: 179.5,
      items: [{ name: "Premium Detailing Kit", qty: 1, price: 179.5 }],
      tracking: "Delivered",
      eta: "Delivered",
    },
  ];

  const appointments = [
    {
      id: "APT-8831",
      service: "Window Tint Install",
      date: "Dec 22, 2025",
      time: "10:30 AM",
      location: "Top Tier Customs — Bay 2",
      status: "Confirmed",
      notes: "Bring vehicle clean & dry. Estimated time: 2–3 hrs.",
    },
    {
      id: "APT-8740",
      service: "Detail + Ceramic Spray",
      date: "Jan 03, 2026",
      time: "9:00 AM",
      location: "Top Tier Customs — Bay 1",
      status: "Requested",
      notes: "We’ll confirm within 24 hours.",
    },
  ];

  const favorites = [
    {
      name: "Carbon Lip Spoiler",
      tag: "Exterior",
      price: 249.0,
      trend: "+12% popularity",
    },
    {
      name: "Premium Brake Pads",
      tag: "Performance",
      price: 189.0,
      trend: "Top rated",
    },
    { name: "Ambient Light Kit", tag: "Interior", price: 119.0, trend: "New" },
    {
      name: "Wheel Cleaner Pro",
      tag: "Detail",
      price: 24.99,
      trend: "Staff pick",
    },
  ];

  const notifications = [
    { title: "Order TTC-10482 is in transit", time: "2h ago", tone: "info" },
    {
      title: "Appointment confirmed: Tint Install",
      time: "Yesterday",
      tone: "success",
    },
    {
      title: "Back in stock: Premium Brake Pads",
      time: "3d ago",
      tone: "info",
    },
    {
      title: "Security tip: Enable 2FA for extra protection",
      time: "1w ago",
      tone: "warn",
    },
  ];

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders
      .filter((o) => (orderFilter === "All" ? true : o.status === orderFilter))
      .filter((o) =>
        q
          ? o.id.toLowerCase().includes(q) || o.status.toLowerCase().includes(q)
          : true
      );
  }, [orders, orderFilter, query]);

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  const setTab = (id) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  const logout = async () => {
    // Hook into your auth flow here.
    navigate("/");
  };

  return (
    <div className={`min-h-screen pt-32 ${shellBg} relative overflow-hidden`}>
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className={[
            "absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full blur-3xl opacity-20",
            isDark ? "bg-rose-500" : "bg-sky-500",
          ].join(" ")}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />
      </div>

      {/* Mobile topbar */}
      <header className="lg:hidden sticky top-0 z-50">
        <div className={`px-4 pt-4`}>
          <div className={`rounded-2xl border ${cardBg} backdrop-blur-xl`}>
            <div className="flex items-center justify-between px-4 py-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className={`h-10 w-10 rounded-xl grid place-items-center border ${
                  isDark
                    ? "border-white/10 bg-black/20"
                    : "border-black/10 bg-white/70"
                }`}
                aria-label="Open menu"
              >
                <Menu size={18} />
              </button>

              <div className="flex items-center gap-3">
                <div
                  className={`h-9 w-9 rounded-xl grid place-items-center border ${accentBorder} ${accentBgSoft}`}
                >
                  <Sparkles
                    size={18}
                    className={isDark ? "text-rose-300" : "text-sky-600"}
                  />
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold">Dashboard</p>
                  <p className={`text-xs ${subtleText2}`}>{user.vehicle}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/catalog")}
                className={`h-10 w-10 rounded-xl grid place-items-center border ${
                  isDark
                    ? "border-white/10 bg-black/20"
                    : "border-black/10 bg-white/70"
                }`}
                aria-label="Go to catalog"
              >
                <ArrowUpRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className={`absolute left-0 top-0 h-full w-[88%] max-w-sm p-4`}>
            <div
              className={`h-full rounded-3xl border ${cardBg} backdrop-blur-xl overflow-hidden`}
            >
              <div className="p-4 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-2xl grid place-items-center border ${accentBorder} ${accentBgSoft}`}
                  >
                    <span className="text-sm font-extrabold">
                      {user.avatarInitials}
                    </span>
                  </div>
                  <div className="leading-tight">
                    <p className="font-semibold">{user.name}</p>
                    <p className={`text-xs ${subtleText2}`}>{user.email}</p>
                  </div>
                </div>
                <button
                  className={`h-10 w-10 rounded-xl grid place-items-center border ${
                    isDark
                      ? "border-white/10 bg-black/20"
                      : "border-black/10 bg-white/70"
                  }`}
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              <Sidebar
                isDark={isDark}
                tabs={tabs}
                activeTab={activeTab}
                setTab={setTab}
                accent={accent}
                accentBorder={accentBorder}
                accentBgSoft={accentBgSoft}
                cardBgAlt={cardBgAlt}
                subtleText2={subtleText2}
                user={user}
                logout={logout}
                navigate={navigate}
              />
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block">
            <div
              className={`rounded-3xl border ${cardBg} backdrop-blur-xl overflow-hidden`}
            >
              <Sidebar
                isDark={isDark}
                tabs={tabs}
                activeTab={activeTab}
                setTab={setTab}
                accent={accent}
                accentBorder={accentBorder}
                accentBgSoft={accentBgSoft}
                cardBgAlt={cardBgAlt}
                subtleText2={subtleText2}
                user={user}
                logout={logout}
                navigate={navigate}
              />
            </div>
          </aside>

          {/* Main */}
          <main className="space-y-6">
            {/* Top row: header + search/actions */}
            <div className={`rounded-3xl border ${cardBg} backdrop-blur-xl`}>
              <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`h-12 w-12 rounded-2xl grid place-items-center border ${accentBorder} ${accentBgSoft}`}
                  >
                    <LayoutDashboard className={accentText} />
                  </div>
                  <div className="leading-tight">
                    <p className="text-sm opacity-75">Welcome back,</p>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide">
                      {user.name} <span className={`${accentText}`}>•</span>{" "}
                      {tabs.find((t) => t.id === activeTab)?.label}
                    </h1>
                    <div
                      className={`mt-1 flex items-center gap-2 text-sm ${subtleText2}`}
                    >
                      <MapPin size={14} className="opacity-80" />
                      <span>{user.location}</span>
                      <span className="opacity-50">•</span>
                      <ShieldCheck size={14} className="opacity-80" />
                      <span>{user.tier}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <div
                    className={`flex items-center gap-2 rounded-2xl border px-4 py-3 ${cardBgAlt}`}
                  >
                    <Search size={18} className="opacity-80" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search orders, services, IDs..."
                      className="w-full bg-transparent outline-none placeholder:opacity-60"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => navigate("/catalog")}
                      className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-semibold border ${
                        isDark
                          ? "border-white/10 bg-white/5 hover:bg-white/10"
                          : "border-black/10 bg-black/5 hover:bg-black/10"
                      } transition`}
                    >
                      Browse <ArrowUpRight size={18} />
                    </button>
                    <button
                      onClick={() => setTab("services")}
                      className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-semibold text-white ${accentBg} ${accentHover} transition`}
                    >
                      Book <Plus size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab content */}
            <div className="space-y-6">
              {activeTab === "overview" && (
                <Overview
                  isDark={isDark}
                  cardBg={cardBg}
                  cardBgAlt={cardBgAlt}
                  divider={divider}
                  subtleText={subtleText}
                  subtleText2={subtleText2}
                  accent={accent}
                  accentText={accentText}
                  accentBgSoft={accentBgSoft}
                  accentBorder={accentBorder}
                  kpis={kpis}
                  orders={orders}
                  appointments={appointments}
                  favorites={favorites}
                  setTab={setTab}
                  navigate={navigate}
                />
              )}

              {activeTab === "orders" && (
                <Orders
                  isDark={isDark}
                  cardBg={cardBg}
                  cardBgAlt={cardBgAlt}
                  subtleText2={subtleText2}
                  divider={divider}
                  accentBorder={accentBorder}
                  accentBgSoft={accentBgSoft}
                  accentText={accentText}
                  orderFilter={orderFilter}
                  setOrderFilter={setOrderFilter}
                  filteredOrders={filteredOrders}
                  expandedOrderId={expandedOrderId}
                  setExpandedOrderId={setExpandedOrderId}
                />
              )}

              {activeTab === "services" && (
                <Services
                  isDark={isDark}
                  cardBg={cardBg}
                  cardBgAlt={cardBgAlt}
                  subtleText2={subtleText2}
                  divider={divider}
                  accentBorder={accentBorder}
                  accentBgSoft={accentBgSoft}
                  accentText={accentText}
                  appointments={appointments}
                  setTab={setTab}
                />
              )}

              {activeTab === "favorites" && (
                <Favorites
                  isDark={isDark}
                  cardBg={cardBg}
                  cardBgAlt={cardBgAlt}
                  subtleText2={subtleText2}
                  divider={divider}
                  accentBorder={accentBorder}
                  accentBgSoft={accentBgSoft}
                  accentText={accentText}
                  favorites={favorites}
                  navigate={navigate}
                />
              )}

              {activeTab === "billing" && (
                <Billing
                  isDark={isDark}
                  cardBg={cardBg}
                  cardBgAlt={cardBgAlt}
                  subtleText2={subtleText2}
                  divider={divider}
                  accentBorder={accentBorder}
                  accentBgSoft={accentBgSoft}
                  accentText={accentText}
                />
              )}

              {activeTab === "profile" && (
                <Profile
                  isDark={isDark}
                  cardBg={cardBg}
                  cardBgAlt={cardBgAlt}
                  subtleText2={subtleText2}
                  divider={divider}
                  accentBorder={accentBorder}
                  accentBgSoft={accentBgSoft}
                  accentText={accentText}
                  user={user}
                />
              )}

              {activeTab === "alerts" && (
                <Alerts
                  isDark={isDark}
                  cardBg={cardBg}
                  cardBgAlt={cardBgAlt}
                  subtleText2={subtleText2}
                  divider={divider}
                  accentBorder={accentBorder}
                  accentBgSoft={accentBgSoft}
                  accentText={accentText}
                  notifications={notifications}
                />
              )}

              {activeTab === "settings" && (
                <SettingsPanel
                  isDark={isDark}
                  cardBg={cardBg}
                  cardBgAlt={cardBgAlt}
                  subtleText2={subtleText2}
                  divider={divider}
                  accentBorder={accentBorder}
                  accentBgSoft={accentBgSoft}
                  accentText={accentText}
                />
              )}

              {activeTab === "support" && (
                <Support
                  isDark={isDark}
                  cardBg={cardBg}
                  cardBgAlt={cardBgAlt}
                  subtleText2={subtleText2}
                  divider={divider}
                  accentBorder={accentBorder}
                  accentBgSoft={accentBgSoft}
                  accentText={accentText}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Sidebar ----------------------------- */

function Sidebar({
  isDark,
  tabs,
  activeTab,
  setTab,
  accentBorder,
  accentBgSoft,
  cardBgAlt,
  subtleText2,
  user,
  logout,
  navigate,
}) {
  return (
    <div className="p-4">
      {/* Profile card */}
      <div className={`rounded-3xl border p-4 ${cardBgAlt}`}>
        <div className="flex items-center gap-3">
          <div
            className={`h-12 w-12 rounded-2xl grid place-items-center border ${accentBorder} ${accentBgSoft}`}
          >
            <span className="text-sm font-extrabold">
              {user.avatarInitials}
            </span>
          </div>
          <div className="leading-tight min-w-0">
            <p className="font-semibold truncate">{user.name}</p>
            <p className={`text-xs ${subtleText2} truncate`}>{user.email}</p>
          </div>
        </div>

        <div
          className={`mt-4 h-[1px] ${isDark ? "bg-white/10" : "bg-black/10"}`}
        />

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => navigate("/catalog")}
            className={`px-3 py-2 rounded-2xl text-sm font-semibold border ${
              isDark
                ? "border-white/10 bg-white/5 hover:bg-white/10"
                : "border-black/10 bg-black/5 hover:bg-black/10"
            } transition`}
          >
            Shop
          </button>
          <button
            onClick={() => setTab("services")}
            className={`px-3 py-2 rounded-2xl text-sm font-semibold border ${accentBorder} ${accentBgSoft} hover:translate-y-[-1px] transition`}
          >
            Book
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4">
        <p className={`px-3 text-xs tracking-widest uppercase ${subtleText2}`}>
          Navigation
        </p>
        <div className="mt-2 space-y-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = t.id === activeTab;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={[
                  "w-full flex items-center justify-between gap-3 px-3 py-3 rounded-2xl border transition",
                  isDark ? "border-white/10" : "border-black/10",
                  active
                    ? `${accentBgSoft} ${accentBorder}`
                    : isDark
                    ? "bg-white/5 hover:bg-white/10"
                    : "bg-black/5 hover:bg-black/10",
                ].join(" ")}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`h-9 w-9 rounded-xl grid place-items-center border ${
                      isDark
                        ? "border-white/10 bg-black/20"
                        : "border-black/10 bg-white/70"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={
                        active
                          ? isDark
                            ? "text-rose-300"
                            : "text-sky-600"
                          : "opacity-80"
                      }
                    />
                  </div>
                  <span className="font-semibold truncate">{t.label}</span>
                </div>
                <ChevronRight
                  size={16}
                  className={active ? "opacity-90" : "opacity-50"}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer actions */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={logout}
          className={`px-3 py-3 rounded-2xl text-sm font-semibold border ${
            isDark
              ? "border-white/10 bg-white/5 hover:bg-white/10"
              : "border-black/10 bg-black/5 hover:bg-black/10"
          } transition inline-flex items-center justify-center gap-2`}
        >
          <LogOut size={16} />
          Logout
        </button>
        <button
          onClick={() => setTab("support")}
          className={`px-3 py-3 rounded-2xl text-sm font-semibold border ${accentBorder} ${accentBgSoft} hover:translate-y-[-1px] transition inline-flex items-center justify-center gap-2`}
        >
          <LifeBuoy size={16} />
          Help
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- Overview ---------------------------- */

function Overview({
  isDark,
  cardBg,
  cardBgAlt,
  divider,
  subtleText,
  subtleText2,
  accentText,
  accentBgSoft,
  accentBorder,
  kpis,
  orders,
  appointments,
  favorites,
  setTab,
  navigate,
}) {
  return (
    <>
      {/* KPI row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              className={`rounded-3xl border ${cardBg} backdrop-blur-xl`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`text-sm ${subtleText2}`}>{k.label}</p>
                    <p className="mt-2 text-3xl font-extrabold tracking-tight">
                      {k.value}
                    </p>
                    <p className={`mt-2 text-sm ${subtleText}`}>{k.delta}</p>
                  </div>
                  <div
                    className={`h-12 w-12 rounded-2xl grid place-items-center border ${accentBorder} ${accentBgSoft}`}
                  >
                    <Icon className={accentText} />
                  </div>
                </div>
              </div>
              <div className={`h-[1px] ${divider}`} />
              <div className="p-4 flex items-center justify-between">
                <button
                  onClick={() =>
                    setTab(
                      k.label.includes("Order")
                        ? "orders"
                        : k.label.includes("Appointment")
                        ? "services"
                        : k.label.includes("Saved")
                        ? "favorites"
                        : "overview"
                    )
                  }
                  className={`text-sm font-semibold ${accentText} hover:opacity-90 transition`}
                >
                  View details
                </button>
                <ArrowRight size={16} className="opacity-70" />
              </div>
            </div>
          );
        })}
      </section>

      {/* Mid grid */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Recent orders */}
        <div
          className={`rounded-3xl border ${cardBg} backdrop-blur-xl xl:col-span-2`}
        >
          <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm opacity-75">Recent</p>
              <h2 className="text-2xl font-extrabold">Orders</h2>
              <p className={`mt-1 text-sm ${subtleText2}`}>
                Track shipments, view invoices, reorder fast.
              </p>
            </div>
            <button
              onClick={() => setTab("orders")}
              className={`px-4 py-2 rounded-2xl text-sm font-semibold border ${
                isDark
                  ? "border-white/10 bg-white/5 hover:bg-white/10"
                  : "border-black/10 bg-black/5 hover:bg-black/10"
              } transition inline-flex items-center gap-2`}
            >
              View all <ArrowRight size={16} />
            </button>
          </div>

          <div className={`h-[1px] ${divider}`} />

          <div className="p-5 sm:p-6 space-y-3">
            {orders.slice(0, 3).map((o) => (
              <div key={o.id} className={`rounded-2xl border p-4 ${cardBgAlt}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{o.id}</p>
                    <p className={`text-sm ${subtleText2}`}>
                      {o.date} • {o.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Pill tone={o.status} isDark={isDark} />
                    <button
                      onClick={() => setTab("orders")}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold border ${
                        isDark
                          ? "border-white/10 bg-white/5 hover:bg-white/10"
                          : "border-black/10 bg-black/5 hover:bg-black/10"
                      } transition`}
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next appointment */}
        <div className={`rounded-3xl border ${cardBg} backdrop-blur-xl`}>
          <div className="p-5 sm:p-6">
            <p className="text-sm opacity-75">Next</p>
            <h2 className="text-2xl font-extrabold">Appointment</h2>
            <p className={`mt-1 text-sm ${subtleText2}`}>
              Stay scheduled and on track.
            </p>

            <div className={`mt-5 rounded-2xl border p-4 ${cardBgAlt}`}>
              {appointments[0] ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {appointments[0].service}
                      </p>
                      <p className={`text-sm ${subtleText2}`}>
                        {appointments[0].date} • {appointments[0].time}
                      </p>
                    </div>
                    <Pill tone={appointments[0].status} isDark={isDark} />
                  </div>
                  <div className="mt-4 space-y-2">
                    <div
                      className={`flex items-center gap-2 text-sm ${subtleText}`}
                    >
                      <MapPin size={14} className="opacity-80" />
                      <span className="truncate">
                        {appointments[0].location}
                      </span>
                    </div>
                    <div
                      className={`flex items-center gap-2 text-sm ${subtleText}`}
                    >
                      <Receipt size={14} className="opacity-80" />
                      <span className="truncate">{appointments[0].notes}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setTab("services")}
                    className={`mt-5 w-full px-4 py-3 rounded-2xl font-semibold text-white ${
                      isDark
                        ? "bg-rose-500 hover:bg-rose-500/90"
                        : "bg-sky-500 hover:bg-sky-500/90"
                    } transition inline-flex items-center justify-center gap-2`}
                  >
                    Manage <ArrowRight size={18} />
                  </button>
                </>
              ) : (
                <>
                  <p className="font-semibold">No appointments yet</p>
                  <p className={`mt-1 text-sm ${subtleText2}`}>
                    Book your first service in minutes.
                  </p>
                  <button
                    onClick={() => setTab("services")}
                    className={`mt-5 w-full px-4 py-3 rounded-2xl font-semibold text-white ${
                      isDark
                        ? "bg-rose-500 hover:bg-rose-500/90"
                        : "bg-sky-500 hover:bg-sky-500/90"
                    } transition inline-flex items-center justify-center gap-2`}
                  >
                    Book now <ArrowRight size={18} />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className={`h-[1px] ${divider}`} />

          <div className="p-5 sm:p-6">
            <p className={`text-sm ${subtleText2}`}>Quick actions</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate("/services")}
                className={`px-4 py-3 rounded-2xl font-semibold border ${
                  isDark
                    ? "border-white/10 bg-white/5 hover:bg-white/10"
                    : "border-black/10 bg-black/5 hover:bg-black/10"
                } transition inline-flex items-center justify-center gap-2`}
              >
                <Wrench size={16} />
                Services
              </button>
              <button
                onClick={() => navigate("/catalog")}
                className={`px-4 py-3 rounded-2xl font-semibold border ${
                  isDark
                    ? "border-white/10 bg-white/5 hover:bg-white/10"
                    : "border-black/10 bg-black/5 hover:bg-black/10"
                } transition inline-flex items-center justify-center gap-2`}
              >
                <ShoppingBag size={16} />
                Catalog
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom grid */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Favorites */}
        <div className={`rounded-3xl border ${cardBg} backdrop-blur-xl`}>
          <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm opacity-75">Saved</p>
              <h2 className="text-2xl font-extrabold">Favorites</h2>
              <p className={`mt-1 text-sm ${subtleText2}`}>
                Curate your next build.
              </p>
            </div>
            <button
              onClick={() => setTab("favorites")}
              className={`px-4 py-2 rounded-2xl text-sm font-semibold border ${
                isDark
                  ? "border-white/10 bg-white/5 hover:bg-white/10"
                  : "border-black/10 bg-black/5 hover:bg-black/10"
              } transition inline-flex items-center gap-2`}
            >
              View <ArrowRight size={16} />
            </button>
          </div>
          <div className={`h-[1px] ${divider}`} />
          <div className="p-5 sm:p-6 space-y-3">
            {favorites.slice(0, 4).map((f) => (
              <div
                key={f.name}
                className={`rounded-2xl border p-4 ${cardBgAlt}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{f.name}</p>
                    <p className={`text-sm ${subtleText2}`}>
                      {f.tag} • {f.trend}
                    </p>
                  </div>
                  <p className="font-extrabold">${f.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Build status */}
        <div
          className={`rounded-3xl border ${cardBg} backdrop-blur-xl xl:col-span-2`}
        >
          <div className="p-5 sm:p-6">
            <p className="text-sm opacity-75">Progress</p>
            <h2 className="text-2xl font-extrabold">Build Status</h2>
            <p className={`mt-1 text-sm ${subtleText2}`}>
              A clean view of what’s happening across orders and services.
            </p>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatusCard
                isDark={isDark}
                title="Shipping"
                subtitle="2 active shipments"
                icon={Truck}
                items={[
                  { label: "TTC-10482", value: "In Transit • ETA Dec 19–20" },
                  { label: "TTC-10427", value: "Processing • ETA Dec 21–23" },
                ]}
              />
              <StatusCard
                isDark={isDark}
                title="Services"
                subtitle="1 confirmed appointment"
                icon={Wrench}
                items={[
                  { label: "Tint Install", value: "Dec 22 • 10:30 AM" },
                  { label: "Detail + Ceramic", value: "Requested • Jan 03" },
                ]}
              />
            </div>
          </div>

          <div className={`h-[1px] ${divider}`} />

          <div className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Next step: finalize your build</p>
              <p className={`text-sm ${subtleText2}`}>
                Add a recommended upgrade to complete your setup.
              </p>
            </div>
            <button
              onClick={() => navigate("/catalog")}
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-white ${
                isDark
                  ? "bg-rose-500 hover:bg-rose-500/90"
                  : "bg-sky-500 hover:bg-sky-500/90"
              } transition`}
            >
              Explore recommendations <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

/* ------------------------------ Orders ----------------------------- */

function Orders({
  isDark,
  cardBg,
  cardBgAlt,
  subtleText2,
  divider,
  accentBorder,
  accentBgSoft,
  accentText,
  orderFilter,
  setOrderFilter,
  filteredOrders,
  expandedOrderId,
  setExpandedOrderId,
}) {
  const filters = ["All", "Processing", "In Transit", "Delivered"];

  return (
    <section className={`rounded-3xl border ${cardBg} backdrop-blur-xl`}>
      <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm opacity-75">Manage</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold">Orders</h2>
          <p className={`mt-1 text-sm ${subtleText2}`}>
            Invoices, tracking, and reorder — all in one place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 ${cardBgAlt}`}
          >
            <Filter size={16} className="opacity-80" />
            <span className="text-sm font-semibold">Status</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => {
              const active = orderFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setOrderFilter(f)}
                  className={[
                    "px-4 py-2 rounded-2xl text-sm font-semibold border transition",
                    isDark ? "border-white/10" : "border-black/10",
                    active
                      ? `${accentBgSoft} ${accentBorder}`
                      : isDark
                      ? "bg-white/5 hover:bg-white/10"
                      : "bg-black/5 hover:bg-black/10",
                  ].join(" ")}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`h-[1px] ${divider}`} />

      <div className="p-5 sm:p-6 space-y-3">
        {filteredOrders.length === 0 ? (
          <div className={`rounded-2xl border p-6 ${cardBgAlt}`}>
            <p className="font-semibold">No matching orders</p>
            <p className={`mt-1 text-sm ${subtleText2}`}>
              Try adjusting your search or filter.
            </p>
          </div>
        ) : (
          filteredOrders.map((o) => {
            const open = expandedOrderId === o.id;
            return (
              <div key={o.id} className={`rounded-2xl border ${cardBgAlt}`}>
                <button
                  className="w-full text-left p-4 sm:p-5"
                  onClick={() => setExpandedOrderId(open ? null : o.id)}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{o.id}</p>
                      <p className={`text-sm ${subtleText2}`}>
                        {o.date} • ${o.total.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Pill tone={o.status} isDark={isDark} />
                      <div
                        className={`h-10 w-10 rounded-xl grid place-items-center border ${
                          isDark
                            ? "border-white/10 bg-white/5"
                            : "border-black/10 bg-black/5"
                        }`}
                      >
                        <ChevronDown
                          size={18}
                          className={
                            open
                              ? "rotate-180 transition-transform"
                              : "transition-transform"
                          }
                        />
                      </div>
                    </div>
                  </div>
                </button>

                {open && (
                  <div className={`px-4 sm:px-5 pb-5`}>
                    <div className={`h-[1px] ${divider} mb-4`} />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div
                        className={`rounded-2xl border p-4 ${
                          isDark
                            ? "border-white/10 bg-black/20"
                            : "border-black/10 bg-white"
                        }`}
                      >
                        <p className={`text-sm ${subtleText2}`}>Tracking</p>
                        <p className="mt-1 font-semibold">
                          {o.tracking || "—"}
                        </p>
                        <p className={`mt-2 text-sm ${subtleText2}`}>
                          ETA: {o.eta}
                        </p>
                      </div>

                      <div
                        className={`rounded-2xl border p-4 lg:col-span-2 ${
                          isDark
                            ? "border-white/10 bg-black/20"
                            : "border-black/10 bg-white"
                        }`}
                      >
                        <p className={`text-sm ${subtleText2}`}>Items</p>
                        <div className="mt-3 space-y-2">
                          {o.items.map((it, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <p className="font-semibold truncate">
                                  {it.name}
                                </p>
                                <p className={`text-sm ${subtleText2}`}>
                                  Qty {it.qty}
                                </p>
                              </div>
                              <p className="font-extrabold">
                                ${(it.price * it.qty).toFixed(2)}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className={`mt-4 h-[1px] ${divider}`} />

                        <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                          <div>
                            <p className={`text-sm ${subtleText2}`}>Total</p>
                            <p className="text-xl font-extrabold">
                              ${o.total.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex gap-3">
                            <button
                              className={`px-4 py-3 rounded-2xl font-semibold border ${
                                isDark
                                  ? "border-white/10 bg-white/5 hover:bg-white/10"
                                  : "border-black/10 bg-black/5 hover:bg-black/10"
                              } transition inline-flex items-center justify-center gap-2`}
                              onClick={(e) => e.preventDefault()}
                            >
                              <Receipt size={16} />
                              Invoice
                            </button>
                            <button
                              className={`px-4 py-3 rounded-2xl font-semibold border ${accentBorder} ${accentBgSoft} hover:translate-y-[-1px] transition inline-flex items-center justify-center gap-2`}
                              onClick={(e) => e.preventDefault()}
                            >
                              Reorder{" "}
                              <ArrowRight size={16} className={accentText} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

/* ----------------------------- Services ---------------------------- */

function Services({
  isDark,
  cardBg,
  cardBgAlt,
  subtleText2,
  divider,
  accentBorder,
  accentBgSoft,
  accentText,
  appointments,
  setTab,
}) {
  return (
    <section className={`rounded-3xl border ${cardBg} backdrop-blur-xl`}>
      <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm opacity-75">Schedule</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold">Appointments</h2>
          <p className={`mt-1 text-sm ${subtleText2}`}>
            Manage bookings, reschedule, and track service status.
          </p>
        </div>

        <button
          onClick={() => setTab("overview")}
          className={`px-4 py-3 rounded-2xl font-semibold border ${
            isDark
              ? "border-white/10 bg-white/5 hover:bg-white/10"
              : "border-black/10 bg-black/5 hover:bg-black/10"
          } transition inline-flex items-center gap-2`}
        >
          Back to Overview <ArrowRight size={16} />
        </button>
      </div>

      <div className={`h-[1px] ${divider}`} />

      <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {appointments.map((a) => (
          <div key={a.id} className={`rounded-3xl border p-5 ${cardBgAlt}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold truncate">{a.service}</p>
                <p className={`text-sm ${subtleText2}`}>
                  {a.date} • {a.time}
                </p>
              </div>
              <Pill tone={a.status} isDark={isDark} />
            </div>

            <div className="mt-4 space-y-2">
              <div className={`flex items-center gap-2 text-sm ${subtleText2}`}>
                <MapPin size={14} className="opacity-80" />
                <span className="truncate">{a.location}</span>
              </div>
              <div className={`flex items-center gap-2 text-sm ${subtleText2}`}>
                <Receipt size={14} className="opacity-80" />
                <span className="truncate">{a.notes}</span>
              </div>
            </div>

            <div className={`mt-5 h-[1px] ${divider}`} />

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <button
                className={`flex-1 px-4 py-3 rounded-2xl font-semibold border ${
                  isDark
                    ? "border-white/10 bg-white/5 hover:bg-white/10"
                    : "border-black/10 bg-black/5 hover:bg-black/10"
                } transition`}
              >
                Reschedule
              </button>
              <button
                className={`flex-1 px-4 py-3 rounded-2xl font-semibold border ${accentBorder} ${accentBgSoft} hover:translate-y-[-1px] transition`}
              >
                Details{" "}
                <ArrowRight size={16} className={`inline ml-1 ${accentText}`} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------- Favorites ---------------------------- */

function Favorites({
  isDark,
  cardBg,
  cardBgAlt,
  subtleText2,
  divider,
  accentBorder,
  accentBgSoft,
  accentText,
  favorites,
  navigate,
}) {
  return (
    <section className={`rounded-3xl border ${cardBg} backdrop-blur-xl`}>
      <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm opacity-75">Curate</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold">Favorites</h2>
          <p className={`mt-1 text-sm ${subtleText2}`}>
            Quick access to your saved items and top picks.
          </p>
        </div>

        <button
          onClick={() => navigate("/catalog")}
          className={`px-4 py-3 rounded-2xl font-semibold text-white ${
            isDark
              ? "bg-rose-500 hover:bg-rose-500/90"
              : "bg-sky-500 hover:bg-sky-500/90"
          } transition inline-flex items-center gap-2`}
        >
          Browse catalog <ArrowUpRight size={16} />
        </button>
      </div>

      <div className={`h-[1px] ${divider}`} />

      <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {favorites.map((f) => (
          <button
            key={f.name}
            className={`text-left rounded-3xl border p-5 ${cardBgAlt} hover:translate-y-[-2px] transition`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold truncate">{f.name}</p>
                <p className={`text-sm ${subtleText2}`}>
                  {f.tag} • {f.trend}
                </p>
              </div>
              <div
                className={`h-10 w-10 rounded-2xl grid place-items-center border ${accentBorder} ${accentBgSoft}`}
              >
                <Heart size={16} className={accentText} />
              </div>
            </div>
            <div className={`mt-4 h-[1px] ${divider}`} />
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xl font-extrabold">${f.price}</p>
              <span
                className={`text-sm font-semibold ${accentText} inline-flex items-center gap-1`}
              >
                View <ArrowRight size={16} />
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------- Billing ----------------------------- */

function Billing({
  isDark,
  cardBg,
  cardBgAlt,
  subtleText2,
  divider,
  accentBorder,
  accentBgSoft,
  accentText,
}) {
  return (
    <section className={`rounded-3xl border ${cardBg} backdrop-blur-xl`}>
      <div className="p-5 sm:p-6">
        <p className="text-sm opacity-75">Payment</p>
        <h2 className="text-2xl sm:text-3xl font-extrabold">Billing</h2>
        <p className={`mt-1 text-sm ${subtleText2}`}>
          Manage payment methods and invoices.
        </p>
      </div>

      <div className={`h-[1px] ${divider}`} />

      <div className="p-5 sm:p-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={`rounded-3xl border p-5 ${cardBgAlt} xl:col-span-2`}>
          <p className="font-semibold">Payment Methods</p>
          <p className={`mt-1 text-sm ${subtleText2}`}>
            Securely store cards for faster checkout.
          </p>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              className={`rounded-2xl border p-4 ${
                isDark
                  ? "border-white/10 bg-black/20"
                  : "border-black/10 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold">Visa •••• 4242</p>
                <span
                  className={`text-xs px-2 py-1 rounded-full border ${accentBorder} ${accentBgSoft} ${accentText}`}
                >
                  Default
                </span>
              </div>
              <p className={`mt-2 text-sm ${subtleText2}`}>Expires 09/27</p>
            </div>
            <div
              className={`rounded-2xl border p-4 ${
                isDark
                  ? "border-white/10 bg-black/20"
                  : "border-black/10 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold">Mastercard •••• 1121</p>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    isDark
                      ? "bg-white/5 border border-white/10"
                      : "bg-black/5 border border-black/10"
                  } opacity-80`}
                >
                  Backup
                </span>
              </div>
              <p className={`mt-2 text-sm ${subtleText2}`}>Expires 01/28</p>
            </div>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <button
              className={`px-5 py-3 rounded-2xl font-semibold text-white ${
                isDark
                  ? "bg-rose-500 hover:bg-rose-500/90"
                  : "bg-sky-500 hover:bg-sky-500/90"
              } transition inline-flex items-center justify-center gap-2`}
            >
              <Plus size={18} /> Add method
            </button>
            <button
              className={`px-5 py-3 rounded-2xl font-semibold border ${accentBorder} ${accentBgSoft} hover:translate-y-[-1px] transition inline-flex items-center justify-center gap-2`}
            >
              <Receipt size={18} className={accentText} /> View invoices
            </button>
          </div>
        </div>

        <div className={`rounded-3xl border p-5 ${cardBgAlt}`}>
          <p className="font-semibold">Spending</p>
          <p className={`mt-1 text-sm ${subtleText2}`}>Your last 30 days.</p>

          <div className="mt-5 space-y-3">
            <SpendRow label="Orders" value="$1,038.49" />
            <SpendRow label="Services" value="$420.00" />
            <SpendRow label="Shipping" value="$38.00" />
          </div>

          <div className={`mt-5 h-[1px] ${divider}`} />

          <div className="mt-5">
            <p className={`text-sm ${subtleText2}`}>Estimated total</p>
            <p className="text-3xl font-extrabold">$1,496.49</p>
            <p className={`mt-2 text-sm ${subtleText2}`}>
              Updated daily • Includes pending orders
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SpendRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <p className="font-semibold">{label}</p>
      <p className="font-extrabold">{value}</p>
    </div>
  );
}

/* ----------------------------- Profile ----------------------------- */

function Profile({
  isDark,
  cardBg,
  cardBgAlt,
  subtleText2,
  divider,
  accentBorder,
  accentBgSoft,
  accentText,
  user,
}) {
  return (
    <section className={`rounded-3xl border ${cardBg} backdrop-blur-xl`}>
      <div className="p-5 sm:p-6">
        <p className="text-sm opacity-75">Account</p>
        <h2 className="text-2xl sm:text-3xl font-extrabold">Profile</h2>
        <p className={`mt-1 text-sm ${subtleText2}`}>
          Update personal details and preferences.
        </p>
      </div>

      <div className={`h-[1px] ${divider}`} />

      <div className="p-5 sm:p-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={`rounded-3xl border p-5 ${cardBgAlt}`}>
          <p className="font-semibold">Customer card</p>
          <p className={`mt-1 text-sm ${subtleText2}`}>
            Quick identity snapshot.
          </p>

          <div className="mt-5 flex items-center gap-3">
            <div
              className={`h-14 w-14 rounded-3xl grid place-items-center border ${accentBorder} ${accentBgSoft}`}
            >
              <span className="text-lg font-extrabold">
                {user.avatarInitials}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{user.name}</p>
              <p className={`text-sm ${subtleText2} truncate`}>{user.email}</p>
            </div>
          </div>

          <div className={`mt-5 h-[1px] ${divider}`} />

          <div className="mt-5 space-y-2">
            <p className={`text-sm ${subtleText2}`}>Vehicle</p>
            <p className="font-semibold">{user.vehicle}</p>
            <p className={`text-sm ${subtleText2}`}>Location</p>
            <p className="font-semibold">{user.location}</p>
          </div>

          <div className="mt-5">
            <span
              className={`inline-flex items-center gap-2 text-xs px-3 py-2 rounded-full border ${accentBorder} ${accentBgSoft} ${accentText}`}
            >
              <ShieldCheck size={14} /> {user.tier}
            </span>
          </div>
        </div>

        <div className={`rounded-3xl border p-5 ${cardBgAlt} xl:col-span-2`}>
          <p className="font-semibold">Edit details</p>
          <p className={`mt-1 text-sm ${subtleText2}`}>
            This is UI-only — wire to your API.
          </p>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            <LabeledInput
              isDark={isDark}
              label="Full name"
              defaultValue={user.name}
            />
            <LabeledInput
              isDark={isDark}
              label="Email"
              defaultValue={user.email}
            />
            <LabeledInput
              isDark={isDark}
              label="Vehicle"
              defaultValue={user.vehicle}
            />
            <LabeledInput
              isDark={isDark}
              label="Location"
              defaultValue={user.location}
            />
          </div>

          <div className={`mt-5 h-[1px] ${divider}`} />

          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <button
              className={`px-5 py-3 rounded-2xl font-semibold text-white ${
                isDark
                  ? "bg-rose-500 hover:bg-rose-500/90"
                  : "bg-sky-500 hover:bg-sky-500/90"
              } transition`}
            >
              Save changes
            </button>
            <button
              className={`px-5 py-3 rounded-2xl font-semibold border ${accentBorder} ${accentBgSoft} hover:translate-y-[-1px] transition`}
            >
              Change password{" "}
              <ArrowRight size={16} className={`inline ml-1 ${accentText}`} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function LabeledInput({ isDark, label, defaultValue }) {
  return (
    <label className="space-y-2">
      <span className="text-sm opacity-75">{label}</span>
      <div
        className={`rounded-2xl border px-4 py-3 ${
          isDark ? "border-white/10 bg-black/20" : "border-black/10 bg-white"
        }`}
      >
        <input
          defaultValue={defaultValue}
          className="w-full bg-transparent outline-none placeholder:opacity-60"
        />
      </div>
    </label>
  );
}

/* ------------------------------ Alerts ----------------------------- */

function Alerts({
  isDark,
  cardBg,
  cardBgAlt,
  subtleText2,
  divider,
  accentBorder,
  accentBgSoft,
  accentText,
  notifications,
}) {
  return (
    <section className={`rounded-3xl border ${cardBg} backdrop-blur-xl`}>
      <div className="p-5 sm:p-6">
        <p className="text-sm opacity-75">Inbox</p>
        <h2 className="text-2xl sm:text-3xl font-extrabold">Notifications</h2>
        <p className={`mt-1 text-sm ${subtleText2}`}>
          Updates about orders, services, and account security.
        </p>
      </div>

      <div className={`h-[1px] ${divider}`} />

      <div className="p-5 sm:p-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
        {notifications.map((n, idx) => (
          <div key={idx} className={`rounded-3xl border p-5 ${cardBgAlt}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold truncate">{n.title}</p>
                <p className={`mt-2 text-sm ${subtleText2}`}>{n.time}</p>
              </div>
              <span
                className={`text-xs px-3 py-2 rounded-full border ${accentBorder} ${accentBgSoft} ${accentText}`}
              >
                {n.tone === "success"
                  ? "Success"
                  : n.tone === "warn"
                  ? "Security"
                  : "Update"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------- Settings ---------------------------- */

function SettingsPanel({
  isDark,
  cardBg,
  cardBgAlt,
  subtleText2,
  divider,
  accentBorder,
  accentBgSoft,
  accentText,
}) {
  const [twoFA, setTwoFA] = useState(true);
  const [emails, setEmails] = useState(true);
  const [sms, setSms] = useState(false);

  return (
    <section className={`rounded-3xl border ${cardBg} backdrop-blur-xl`}>
      <div className="p-5 sm:p-6">
        <p className="text-sm opacity-75">Preferences</p>
        <h2 className="text-2xl sm:text-3xl font-extrabold">Settings</h2>
        <p className={`mt-1 text-sm ${subtleText2}`}>
          Control privacy, security, and communications.
        </p>
      </div>

      <div className={`h-[1px] ${divider}`} />

      <div className="p-5 sm:p-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className={`rounded-3xl border p-5 ${cardBgAlt}`}>
          <p className="font-semibold">Security</p>
          <p className={`mt-1 text-sm ${subtleText2}`}>Protect your account.</p>

          <div className="mt-5 space-y-3">
            <ToggleRow
              isDark={isDark}
              title="Two-factor authentication"
              desc="Extra layer of security on sign-in."
              value={twoFA}
              onChange={setTwoFA}
              accentBorder={accentBorder}
              accentBgSoft={accentBgSoft}
              accentText={accentText}
            />
            <ToggleRow
              isDark={isDark}
              title="Login alerts"
              desc="Get notified when your account is accessed."
              value={emails}
              onChange={setEmails}
              accentBorder={accentBorder}
              accentBgSoft={accentBgSoft}
              accentText={accentText}
            />
          </div>

          <div className={`mt-5 h-[1px] ${divider}`} />

          <button
            className={`mt-5 px-5 py-3 rounded-2xl font-semibold border ${accentBorder} ${accentBgSoft} hover:translate-y-[-1px] transition`}
          >
            Update password{" "}
            <ArrowRight size={16} className={`inline ml-1 ${accentText}`} />
          </button>
        </div>

        <div className={`rounded-3xl border p-5 ${cardBgAlt}`}>
          <p className="font-semibold">Notifications</p>
          <p className={`mt-1 text-sm ${subtleText2}`}>
            Choose what you want to hear about.
          </p>

          <div className="mt-5 space-y-3">
            <ToggleRow
              isDark={isDark}
              title="Email updates"
              desc="Order and service updates via email."
              value={emails}
              onChange={setEmails}
              accentBorder={accentBorder}
              accentBgSoft={accentBgSoft}
              accentText={accentText}
            />
            <ToggleRow
              isDark={isDark}
              title="SMS updates"
              desc="Get texts for time-sensitive updates."
              value={sms}
              onChange={setSms}
              accentBorder={accentBorder}
              accentBgSoft={accentBgSoft}
              accentText={accentText}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ToggleRow({
  isDark,
  title,
  desc,
  value,
  onChange,
  accentBorder,
  accentBgSoft,
  accentText,
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        isDark ? "border-white/10 bg-black/20" : "border-black/10 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold truncate">{title}</p>
          <p className={`mt-1 text-sm opacity-70`}>{desc}</p>
        </div>

        <button
          type="button"
          onClick={() => onChange(!value)}
          className={[
            "relative w-12 h-7 rounded-full border transition",
            value
              ? `${accentBorder} ${accentBgSoft}`
              : isDark
              ? "border-white/10 bg-white/5"
              : "border-black/10 bg-black/5",
          ].join(" ")}
          aria-pressed={value}
        >
          <span
            className={[
              "absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full transition",
              value ? "left-6" : "left-1",
              value
                ? isDark
                  ? "bg-rose-500"
                  : "bg-sky-500"
                : isDark
                ? "bg-white/30"
                : "bg-black/20",
            ].join(" ")}
          />
        </button>
      </div>

      {value && <p className={`mt-3 text-xs ${accentText}`}>Enabled</p>}
    </div>
  );
}

/* ------------------------------ Support ---------------------------- */

function Support({
  isDark,
  cardBg,
  cardBgAlt,
  subtleText2,
  divider,
  accentBorder,
  accentBgSoft,
  accentText,
}) {
  return (
    <section className={`rounded-3xl border ${cardBg} backdrop-blur-xl`}>
      <div className="p-5 sm:p-6">
        <p className="text-sm opacity-75">Help</p>
        <h2 className="text-2xl sm:text-3xl font-extrabold">Support</h2>
        <p className={`mt-1 text-sm ${subtleText2}`}>
          Fast answers, real people, clear guidance.
        </p>
      </div>

      <div className={`h-[1px] ${divider}`} />

      <div className="p-5 sm:p-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={`rounded-3xl border p-5 ${cardBgAlt}`}>
          <p className="font-semibold">Start here</p>
          <p className={`mt-1 text-sm ${subtleText2}`}>
            Common questions and quick fixes.
          </p>
          <div className="mt-5 space-y-2">
            <SupportLink label="Shipping & delivery timelines" />
            <SupportLink label="Install scheduling & policies" />
            <SupportLink label="Returns & warranty coverage" />
            <SupportLink label="Account & security" />
          </div>
        </div>

        <div className={`rounded-3xl border p-5 ${cardBgAlt} xl:col-span-2`}>
          <p className="font-semibold">Contact</p>
          <p className={`mt-1 text-sm ${subtleText2}`}>
            We typically respond within 1 business day.
          </p>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            <LabeledInput
              isDark={isDark}
              label="Subject"
              defaultValue="Need help with an order"
            />
            <LabeledInput
              isDark={isDark}
              label="Order ID (optional)"
              defaultValue=""
            />
          </div>

          <label className="block mt-3 space-y-2">
            <span className="text-sm opacity-75">Message</span>
            <div
              className={`rounded-2xl border px-4 py-3 ${
                isDark
                  ? "border-white/10 bg-black/20"
                  : "border-black/10 bg-white"
              }`}
            >
              <textarea
                rows={5}
                className="w-full bg-transparent outline-none resize-none placeholder:opacity-60"
                placeholder="Tell us what’s going on…"
              />
            </div>
          </label>

          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <button
              className={`px-5 py-3 rounded-2xl font-semibold text-white ${
                isDark
                  ? "bg-rose-500 hover:bg-rose-500/90"
                  : "bg-sky-500 hover:bg-sky-500/90"
              } transition`}
            >
              Submit ticket
            </button>
            <button
              className={`px-5 py-3 rounded-2xl font-semibold border ${accentBorder} ${accentBgSoft} hover:translate-y-[-1px] transition`}
            >
              Live chat{" "}
              <ArrowRight size={16} className={`inline ml-1 ${accentText}`} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SupportLink({ label }) {
  return (
    <button className="w-full text-left flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
      <span className="font-semibold">{label}</span>
      <ChevronRight size={16} className="opacity-70" />
    </button>
  );
}

/* ------------------------------ Bits ------------------------------- */

function StatusCard({ isDark, title, subtitle, icon: Icon, items }) {
  return (
    <div
      className={`rounded-3xl border p-5 ${
        isDark ? "border-white/10 bg-black/20" : "border-black/10 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm opacity-70">{subtitle}</p>
        </div>
        <div
          className={`h-10 w-10 rounded-2xl grid place-items-center border ${
            isDark ? "border-white/10 bg-white/5" : "border-black/10 bg-black/5"
          }`}
        >
          <Icon size={18} className="opacity-90" />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {items.map((it, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3">
            <p className="font-semibold">{it.label}</p>
            <p className="text-sm opacity-70">{it.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Pill({ tone, isDark }) {
  const map = {
    Processing: isDark
      ? "bg-white/5 border-white/10 text-white/80"
      : "bg-black/5 border-black/10 text-black/70",
    "In Transit": isDark
      ? "bg-rose-500/10 border-rose-500/25 text-rose-300"
      : "bg-sky-500/10 border-sky-500/25 text-sky-700",
    Delivered: isDark
      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
      : "bg-emerald-500/10 border-emerald-500/25 text-emerald-700",
    Confirmed: isDark
      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
      : "bg-emerald-500/10 border-emerald-500/25 text-emerald-700",
    Requested: isDark
      ? "bg-white/5 border-white/10 text-white/80"
      : "bg-black/5 border-black/10 text-black/70",
    success: isDark
      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
      : "bg-emerald-500/10 border-emerald-500/25 text-emerald-700",
    warn: isDark
      ? "bg-amber-500/10 border-amber-500/25 text-amber-300"
      : "bg-amber-500/10 border-amber-500/25 text-amber-700",
    info: isDark
      ? "bg-white/5 border-white/10 text-white/80"
      : "bg-black/5 border-black/10 text-black/70",
  };

  const cls =
    map[tone] ||
    (isDark
      ? "bg-white/5 border-white/10 text-white/80"
      : "bg-black/5 border-black/10 text-black/70");

  return (
    <span
      className={`text-xs px-3 py-2 rounded-full border font-semibold ${cls}`}
    >
      {tone}
    </span>
  );
}
