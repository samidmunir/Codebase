// Activity.jsx
import { useMemo, useState } from "react";
import { useTheme } from "../contexts/Theme";
import {
  Activity as ActivityIcon,
  CalendarDays,
  Clock,
  Sparkles,
  Newspaper,
  Wrench,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Gauge,
  TrendingUp,
  Search,
  ArrowUpRight,
  Bell,
  Car,
  Users,
  Star,
} from "lucide-react";

export default function Activity() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const accentBg = isDark ? "bg-rose-500" : "bg-sky-500";
  const accentHover = isDark ? "hover:bg-rose-500/90" : "hover:bg-sky-500/90";
  const accentText = isDark ? "text-rose-300" : "text-sky-600";
  const accentBorder = isDark ? "border-rose-500/30" : "border-sky-500/30";
  const accentSoft = isDark ? "bg-rose-500/10" : "bg-sky-500/10";

  const shellBg = isDark
    ? "bg-zinc-950/90 text-zinc-50"
    : "bg-zinc-50/90 text-zinc-950";

  const cardBg = isDark
    ? "bg-white/5 border-white/10"
    : "bg-white/70 border-black/10";

  const cardAlt = isDark
    ? "bg-black/20 border-white/10"
    : "bg-white border-black/10";

  const subtle = isDark ? "text-white/70" : "text-black/70";
  const subtle2 = isDark ? "text-white/60" : "text-black/60";
  const divider = isDark ? "bg-white/10" : "bg-black/10";

  const [query, setQuery] = useState("");
  const [selectedDay, setSelectedDay] = useState(null);

  const updates = [
    {
      type: "News",
      title: "Ceramic tint appointments now open for the weekend",
      desc: "More availability has been added for tint installs, detail packages, and lighting upgrades.",
      time: "Today • 9:20 AM",
      icon: Newspaper,
    },
    {
      type: "Shop Update",
      title: "Performance install slots are limited this week",
      desc: "Intake, exhaust, suspension, and brake installs are seeing higher demand than usual.",
      time: "Today • 8:10 AM",
      icon: Wrench,
    },
    {
      type: "Notice",
      title: "Detail bay closing early this Friday",
      desc: "Premium detailing services will close early for equipment maintenance.",
      time: "Yesterday • 6:45 PM",
      icon: AlertCircle,
    },
    {
      type: "Customer Favorite",
      title: "Paint protection film bookings are trending",
      desc: "Front-end PPF and ceramic spray add-ons are currently the most requested protection services.",
      time: "Yesterday • 3:15 PM",
      icon: Star,
    },
  ];

  const busyData = [
    { time: "9 AM", appointments: 2 },
    { time: "10 AM", appointments: 4 },
    { time: "11 AM", appointments: 5 },
    { time: "12 PM", appointments: 3 },
    { time: "1 PM", appointments: 6 },
    { time: "2 PM", appointments: 7 },
    { time: "3 PM", appointments: 5 },
    { time: "4 PM", appointments: 3 },
    { time: "5 PM", appointments: 1 },
  ];

  const calendarDays = useMemo(
    () =>
      Array.from({ length: 35 }, (_, i) => {
        const day = i + 1;

        if ([6, 13, 20, 27].includes(day)) {
          return { day, status: "closed", label: "Closed" };
        }

        if ([4, 5, 11, 12, 18, 19, 25].includes(day)) {
          return { day, status: "booked", label: "Booked" };
        }

        if ([3, 10, 17, 24, 31].includes(day)) {
          return { day, status: "limited", label: "Limited" };
        }

        return { day, status: "available", label: "Available" };
      }),
    [],
  );

  const filteredUpdates = updates.filter((u) => {
    const q = query.trim().toLowerCase();
    return (
      u.title.toLowerCase().includes(q) ||
      u.desc.toLowerCase().includes(q) ||
      u.type.toLowerCase().includes(q)
    );
  });

  const totalAppointments = busyData.reduce(
    (sum, d) => sum + d.appointments,
    0,
  );
  const peakHour = busyData.reduce((max, d) =>
    d.appointments > max.appointments ? d : max,
  );

  return (
    <main className={`min-h-screen pt-16 ${shellBg} relative overflow-hidden`}>
      <AmbientGlow isDark={isDark} />

      <section className="mx-auto w-full px-16 py-8 lg:py-10">
        {/* Header */}
        <header className={`rounded-3xl border ${cardBg} backdrop-blur-xl`}>
          <div className="p-6 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-center">
            <div>
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 ${accentBorder} ${accentSoft}`}
              >
                <ActivityIcon size={16} className={accentText} />
                <span className={`text-sm font-bold ${accentText}`}>
                  TTC Activity Center
                </span>
              </div>

              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight">
                Shop updates, appointment traffic, and availability.
              </h1>

              <p className={`mt-5 text-lg leading-relaxed ${subtle}`}>
                Stay informed with the latest TTC news, daily appointment
                activity, service demand, and calendar availability.
              </p>
            </div>

            <div className={`rounded-3xl border ${cardAlt} p-5`}>
              <p className={`text-sm font-semibold ${subtle2}`}>
                Today’s Status
              </p>

              <div className="mt-5 space-y-3">
                <StatusRow
                  icon={CheckCircle2}
                  label="Shop"
                  value="Open"
                  tone="green"
                  isDark={isDark}
                />
                <StatusRow
                  icon={Gauge}
                  label="Traffic"
                  value="Busy"
                  tone="yellow"
                  isDark={isDark}
                />
                <StatusRow
                  icon={CalendarDays}
                  label="Appointments"
                  value={`${totalAppointments} scheduled`}
                  tone="blue"
                  isDark={isDark}
                />
                <StatusRow
                  icon={Clock}
                  label="Peak"
                  value={`${peakHour.time} • ${peakHour.appointments} bookings`}
                  tone="rose"
                  isDark={isDark}
                />
              </div>
            </div>
          </div>
        </header>

        {/* KPI cards */}
        <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <KpiCard
            icon={CalendarDays}
            label="Appointments Today"
            value={totalAppointments}
            desc="Across service bays"
            cardBg={cardBg}
            accentText={accentText}
            accentBorder={accentBorder}
            accentSoft={accentSoft}
          />
          <KpiCard
            icon={Car}
            label="Vehicles Checked In"
            value="12"
            desc="Active or waiting"
            cardBg={cardBg}
            accentText={accentText}
            accentBorder={accentBorder}
            accentSoft={accentSoft}
          />
          <KpiCard
            icon={Users}
            label="Customer Requests"
            value="8"
            desc="Pending review"
            cardBg={cardBg}
            accentText={accentText}
            accentBorder={accentBorder}
            accentSoft={accentSoft}
          />
          <KpiCard
            icon={TrendingUp}
            label="Demand"
            value="High"
            desc="Tint + performance"
            cardBg={cardBg}
            accentText={accentText}
            accentBorder={accentBorder}
            accentSoft={accentSoft}
          />
        </section>

        {/* Main grid */}
        <section className="mt-6 grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
          {/* Left column */}
          <div className="space-y-6">
            {/* Busy Graph */}
            <div className={`rounded-3xl border ${cardBg} backdrop-blur-xl`}>
              <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className={`text-sm ${subtle2}`}>Current Day</p>
                  <h2 className="text-2xl font-black">
                    Appointment Load Graph
                  </h2>
                  <p className={`mt-1 text-sm ${subtle}`}>
                    A quick visual of how busy TTC is throughout the day.
                  </p>
                </div>

                <div
                  className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 ${cardAlt}`}
                >
                  <Sparkles size={18} className={accentText} />
                  <span className="font-bold">Peak: {peakHour.time}</span>
                </div>
              </div>

              <div className={`h-[1px] ${divider}`} />

              <div className="p-5 sm:p-6">
                <div className="h-72 flex items-end gap-3 sm:gap-4">
                  {busyData.map((item) => {
                    const height = `${(item.appointments / 8) * 100}%`;

                    return (
                      <div
                        key={item.time}
                        className="flex-1 h-full flex flex-col items-center justify-end gap-3"
                      >
                        <div className="relative w-full h-full flex items-end">
                          <div
                            className={`w-full rounded-t-2xl border ${accentBorder} ${accentSoft} transition-all hover:opacity-80`}
                            style={{ height }}
                            title={`${item.time}: ${item.appointments} appointments`}
                          />
                        </div>

                        <div className="text-center">
                          <p className="text-sm font-black">
                            {item.appointments}
                          </p>
                          <p className={`text-xs ${subtle2}`}>{item.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* News / Updates */}
            <div className={`rounded-3xl border ${cardBg} backdrop-blur-xl`}>
              <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className={`text-sm ${subtle2}`}>Latest</p>
                  <h2 className="text-2xl font-black">News & Updates</h2>
                </div>

                <div
                  className={`flex items-center gap-2 rounded-2xl border px-4 py-3 ${cardAlt}`}
                >
                  <Search size={18} className="opacity-80" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search updates..."
                    className="w-full md:w-72 bg-transparent outline-none placeholder:opacity-60"
                  />
                </div>
              </div>

              <div className={`h-[1px] ${divider}`} />

              <div className="p-5 sm:p-6 space-y-4">
                {filteredUpdates.map((update) => {
                  const Icon = update.icon;

                  return (
                    <article
                      key={update.title}
                      className={`rounded-3xl border ${cardAlt} p-5 transition hover:-translate-y-1`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`h-12 w-12 rounded-2xl grid place-items-center border ${accentBorder} ${accentSoft}`}
                        >
                          <Icon size={22} className={accentText} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-bold ${accentBorder} ${accentSoft} ${accentText}`}
                            >
                              {update.type}
                            </span>
                            <span className={`text-xs ${subtle2}`}>
                              {update.time}
                            </span>
                          </div>

                          <h3 className="mt-3 text-xl font-black">
                            {update.title}
                          </h3>

                          <p
                            className={`mt-2 text-sm leading-relaxed ${subtle}`}
                          >
                            {update.desc}
                          </p>
                        </div>

                        <ArrowUpRight className="opacity-60" size={20} />
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Calendar */}
          <aside
            className={`rounded-3xl border ${cardBg} backdrop-blur-xl h-fit`}
          >
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`text-sm ${subtle2}`}>Availability</p>
                  <h2 className="text-2xl font-black">May 2026</h2>
                  <p className={`mt-1 text-sm ${subtle}`}>
                    View open, limited, booked, and closed shop days.
                  </p>
                </div>

                <div
                  className={`h-12 w-12 rounded-2xl grid place-items-center border ${accentBorder} ${accentSoft}`}
                >
                  <CalendarDays className={accentText} />
                </div>
              </div>

              <div className={`my-5 h-[1px] ${divider}`} />

              <div className="grid grid-cols-7 gap-2 text-center">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <p key={d} className={`text-xs font-bold ${subtle2}`}>
                    {d}
                  </p>
                ))}

                {calendarDays.map((day) => (
                  <button
                    key={day.day}
                    onClick={() => setSelectedDay(day)}
                    className={[
                      "aspect-square rounded-2xl border text-sm font-black transition hover:-translate-y-0.5",
                      getDayClass(day.status, isDark),
                      selectedDay?.day === day.day
                        ? `ring-2 ${isDark ? "ring-rose-400" : "ring-sky-500"}`
                        : "",
                    ].join(" ")}
                  >
                    {day.day <= 31 ? day.day : ""}
                  </button>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <Legend label="Available" tone="green" isDark={isDark} />
                <Legend label="Limited" tone="yellow" isDark={isDark} />
                <Legend label="Booked" tone="rose" isDark={isDark} />
                <Legend label="Closed" tone="zinc" isDark={isDark} />
              </div>

              <div className={`mt-5 rounded-3xl border ${cardAlt} p-5`}>
                {selectedDay ? (
                  <>
                    <p className={`text-sm font-bold ${accentText}`}>
                      May {selectedDay.day}, 2026
                    </p>
                    <h3 className="mt-1 text-xl font-black">
                      {selectedDay.label}
                    </h3>
                    <p className={`mt-2 text-sm ${subtle}`}>
                      {selectedDay.status === "available" &&
                        "This day has open appointment availability."}
                      {selectedDay.status === "limited" &&
                        "This day has limited appointment slots remaining."}
                      {selectedDay.status === "booked" &&
                        "This day is fully booked for appointments."}
                      {selectedDay.status === "closed" &&
                        "TTC is closed on this day."}
                    </p>
                  </>
                ) : (
                  <>
                    <p className={`text-sm font-bold ${accentText}`}>
                      Select a day
                    </p>
                    <h3 className="mt-1 text-xl font-black">
                      Calendar Details
                    </h3>
                    <p className={`mt-2 text-sm ${subtle}`}>
                      Click a calendar day to view availability status.
                    </p>
                  </>
                )}
              </div>

              <button
                className={`mt-5 w-full inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 font-bold text-white ${accentBg} ${accentHover} transition`}
              >
                Request Appointment
                <CalendarDays size={18} />
              </button>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  desc,
  cardBg,
  accentText,
  accentBorder,
  accentSoft,
}) {
  return (
    <div className={`rounded-3xl border ${cardBg} backdrop-blur-xl p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm opacity-70">{label}</p>
          <p className="mt-2 text-3xl font-black">{value}</p>
          <p className="mt-2 text-sm opacity-70">{desc}</p>
        </div>

        <div
          className={`h-12 w-12 rounded-2xl grid place-items-center border ${accentBorder} ${accentSoft}`}
        >
          <Icon className={accentText} />
        </div>
      </div>
    </div>
  );
}

function StatusRow({ icon: Icon, label, value, tone, isDark }) {
  const toneMap = {
    green: isDark
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700",
    yellow: isDark
      ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
      : "bg-amber-500/10 border-amber-500/30 text-amber-700",
    blue: isDark
      ? "bg-sky-500/10 border-sky-500/30 text-sky-300"
      : "bg-sky-500/10 border-sky-500/30 text-sky-700",
    rose: isDark
      ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
      : "bg-rose-500/10 border-rose-500/30 text-rose-700",
  };

  return (
    <div
      className={`rounded-2xl border px-4 py-3 flex items-center gap-3 ${toneMap[tone]}`}
    >
      <Icon size={18} />
      <div>
        <p className="text-xs font-bold opacity-80">{label}</p>
        <p className="font-black">{value}</p>
      </div>
    </div>
  );
}

function Legend({ label, tone, isDark }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold">
      <span className={`h-3 w-3 rounded-full ${legendDot(tone, isDark)}`} />
      <span className="opacity-75">{label}</span>
    </div>
  );
}

function legendDot(tone, isDark) {
  const map = {
    green: "bg-emerald-500",
    yellow: "bg-amber-500",
    rose: "bg-rose-500",
    zinc: isDark ? "bg-zinc-500" : "bg-zinc-400",
  };

  return map[tone];
}

function getDayClass(status, isDark) {
  const base = {
    available: isDark
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700",
    limited: isDark
      ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
      : "bg-amber-500/10 border-amber-500/30 text-amber-700",
    booked: isDark
      ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
      : "bg-rose-500/10 border-rose-500/30 text-rose-700",
    closed: isDark
      ? "bg-zinc-800/60 border-white/10 text-white/40"
      : "bg-zinc-200/80 border-black/10 text-black/40",
  };

  return base[status];
}

function AmbientGlow({ isDark }) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <div
        className={`absolute -top-44 left-1/2 h-[620px] w-[620px] -translate-x-1/2 rounded-full blur-3xl opacity-20 ${
          isDark ? "bg-rose-500" : "bg-sky-500"
        }`}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />
    </div>
  );
}
