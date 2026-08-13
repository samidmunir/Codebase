import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Wrench,
} from "lucide-react";

// Replace these with your actual project images.
import ambientLightingWork from "../assets/images/garage/ambient-lighting.jpg";
import starlightWork from "../assets/images/garage/starlight-headliner.jpg";
import aeroWork from "../assets/images/garage/custom-aero.jpg";
import steeringWheelWork from "../assets/images/garage/steering-wheel.jpg";
import { FaInstagram } from "react-icons/fa";

type CalendarStatus = "available" | "limited" | "booked" | "closed";

interface CalendarDay {
  day: number;
  status: CalendarStatus;
  isToday: boolean;
}

interface RecentWork {
  id: number;
  title: string;
  vehicle: string;
  description: string;
  image: string;
  className?: string;
}

const GARAGE_OPEN_HOUR = 9;
const GARAGE_CLOSE_HOUR = 16;

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const recentWork: RecentWork[] = [
  {
    id: 1,
    title: "Ambient Lighting Upgrade",
    vehicle: "BMW 3 Series",
    description:
      "Full multi-zone ambient lighting installation with integrated door, dashboard and footwell illumination.",
    image: ambientLightingWork,
    className: "md:col-span-2 md:row-span-2",
  },
  {
    id: 2,
    title: "Starlight Headliner",
    vehicle: "Mercedes-Benz S-Class",
    description:
      "Custom fibre-optic starlight headliner finished with a premium OEM-inspired appearance.",
    image: starlightWork,
  },
  {
    id: 3,
    title: "Custom Aero Fitment",
    vehicle: "Mercedes-Benz C63 AMG",
    description:
      "Front splitter, side extensions and rear diffuser professionally aligned and fitted.",
    image: aeroWork,
  },
  {
    id: 4,
    title: "Custom Steering Wheel",
    vehicle: "Audi A5",
    description:
      "Carbon fibre and Alcantara steering wheel upgrade with OEM controls retained.",
    image: steeringWheelWork,
    className: "md:col-span-2",
  },
];

const getLondonDate = () => {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hour12: false,
    weekday: "short",
  });

  const parts = formatter.formatToParts(new Date());

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    hour: Number(value("hour")),
    weekday: value("weekday"),
  };
};

const GaragePage = () => {
  const [, setClockTick] = useState(0);

  /*
   * Refresh live garage status every minute.
   */
  useEffect(() => {
    const interval = window.setInterval(() => {
      setClockTick((value) => value + 1);
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  const londonDate = getLondonDate();

  const isSunday = londonDate.weekday === "Sun";

  const isOpen =
    !isSunday &&
    londonDate.hour >= GARAGE_OPEN_HOUR &&
    londonDate.hour < GARAGE_CLOSE_HOUR;

  const currentDate = new Date(
    londonDate.year,
    londonDate.month - 1,
    londonDate.day,
  );

  const monthName = currentDate.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  /*
   * Temporary availability data.
   *
   * Eventually this can come from booking data,
   * but for now it gives us a realistic hard-coded UI.
   */
  const bookedDays = [5, 12, 18, 24];
  const limitedDays = [8, 15, 22, 29];

  const calendarDays = useMemo(() => {
    const year = londonDate.year;
    const monthIndex = londonDate.month - 1;

    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    return Array.from({ length: daysInMonth }, (_, index): CalendarDay => {
      const day = index + 1;

      const date = new Date(year, monthIndex, day);

      const isClosed = date.getDay() === 0;

      let status: CalendarStatus = "available";

      if (isClosed) {
        status = "closed";
      } else if (bookedDays.includes(day)) {
        status = "booked";
      } else if (limitedDays.includes(day)) {
        status = "limited";
      }

      return {
        day,
        status,
        isToday: day === londonDate.day,
      };
    });
  }, [londonDate.year, londonDate.month, londonDate.day]);

  /*
   * JS Sunday = 0.
   * Our calendar starts Monday, so convert:
   *
   * Mon -> 0
   * Tue -> 1
   * ...
   * Sun -> 6
   */
  const firstDayOffset = useMemo(() => {
    const firstDay = new Date(
      londonDate.year,
      londonDate.month - 1,
      1,
    ).getDay();

    return (firstDay + 6) % 7;
  }, [londonDate.year, londonDate.month]);

  const calendarStatusStyles: Record<CalendarStatus, string> = {
    available: `
      border-emerald-500/20
      bg-emerald-500/5
      hover:border-emerald-500/50

      dark:bg-emerald-500/10
    `,

    limited: `
      border-amber-500/20
      bg-amber-500/5

      dark:bg-amber-500/10
    `,

    booked: `
      border-sky-500/20
      bg-sky-500/5

      dark:border-rose-500/20
      dark:bg-rose-500/10
    `,

    closed: `
      border-black/5
      bg-zinc-200/70
      text-zinc-400

      dark:border-white/5
      dark:bg-zinc-900
      dark:text-zinc-600
    `,
  };

  return (
    <main
      className="
        min-h-screen
        bg-zinc-100
        text-zinc-950
        transition-all duration-300

        dark:bg-zinc-950
        dark:text-zinc-50
      "
    >
      {/* ======================================================
          HERO
      ====================================================== */}

      <section
        className="
          relative overflow-hidden
          border-b border-black/10
          px-6 pb-20 pt-40

          dark:border-white/10
        "
      >
        {/* Decorative glows */}

        <div
          className="
            pointer-events-none
            absolute -right-52 -top-48
            h-150 w-150
            rounded-full
            bg-sky-500/10
            blur-3xl

            dark:bg-rose-500/10
          "
        />

        <div
          className="
            pointer-events-none
            absolute -bottom-64 -left-52
            h-125 w-125
            rounded-full
            bg-sky-400/5
            blur-3xl

            dark:bg-red-500/5
          "
        />

        <div
          className="
            relative mx-auto grid
            max-w-7xl gap-12
            lg:grid-cols-[1.2fr_0.8fr]
            lg:items-end
          "
        >
          {/* Hero copy */}

          <div>
            <div
              className="
                mb-6 inline-flex
                items-center gap-2
                rounded-full
                border border-sky-500/20
                bg-sky-500/10
                px-4 py-2
                text-sm font-semibold
                text-sky-600

                dark:border-rose-500/20
                dark:bg-rose-500/10
                dark:text-rose-400
              "
            >
              <MapPin size={16} />
              Top Tier Customs Garage
            </div>

            <p
              className="
                text-sm font-semibold uppercase
                tracking-[0.35em]
                text-zinc-500

                dark:text-zinc-400
              "
            >
              Wokingham • Berkshire
            </p>

            <h1
              className="
                mt-5 max-w-4xl
                text-5xl font-bold
                tracking-tight
                md:text-7xl
                lg:text-8xl
              "
            >
              Where ideas become{" "}
              <span
                className="
                  bg-linear-to-r
                  from-zinc-950
                  to-sky-500
                  bg-clip-text
                  text-transparent

                  dark:from-white
                  dark:to-rose-500
                "
              >
                reality.
              </span>
            </h1>

            <p
              className="
                mt-6 max-w-2xl
                text-lg leading-8
                text-zinc-600

                dark:text-zinc-400
              "
            >
              From subtle OEM-inspired upgrades to complete transformations, Top
              Tier Customs combines craftsmanship, technology and attention to
              detail to create vehicles that stand apart.
            </p>
          </div>

          {/* Live Status Card */}

          <div
            className="
              rounded-3xl
              border border-black/10
              bg-white/70
              p-7
              shadow-xl
              shadow-black/5
              backdrop-blur-xl

              dark:border-white/10
              dark:bg-zinc-900/60
              dark:shadow-black/30
            "
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="
                    text-xs font-semibold uppercase
                    tracking-[0.25em]
                    text-zinc-500
                  "
                >
                  Garage Status
                </p>

                <div className="mt-3 flex items-center gap-3">
                  <span
                    className={`
                      relative flex h-3 w-3
                      rounded-full

                      ${isOpen ? "bg-emerald-500" : "bg-rose-500"}
                    `}
                  >
                    <span
                      className={`
                        absolute inline-flex
                        h-full w-full
                        animate-ping
                        rounded-full
                        opacity-50

                        ${isOpen ? "bg-emerald-400" : "bg-rose-400"}
                      `}
                    />
                  </span>

                  <h2
                    className={`
                      text-3xl font-bold

                      ${isOpen ? "text-emerald-500" : "text-rose-500"}
                    `}
                  >
                    {isOpen ? "Open Now" : "Currently Closed"}
                  </h2>
                </div>
              </div>

              <div
                className="
                  flex h-13 w-13
                  items-center justify-center
                  rounded-2xl
                  bg-zinc-100

                  dark:bg-zinc-800
                "
              >
                <Clock3 size={24} />
              </div>
            </div>

            <div
              className="
                mt-7 border-t
                border-black/10 pt-6

                dark:border-white/10
              "
            >
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Today's hours
                </span>

                <span className="font-semibold">
                  {isSunday ? "Closed" : "08:00 – 16:00"}
                </span>
              </div>

              <div className="mt-3 flex justify-between gap-4">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Location
                </span>

                <span className="font-semibold">Wokingham RG40</span>
              </div>
            </div>

            <a
              href="#contact"
              className="
                mt-7 flex items-center
                justify-between
                rounded-2xl
                bg-zinc-950
                px-5 py-4
                font-semibold text-white
                transition-all duration-300
                hover:bg-sky-500

                dark:bg-white
                dark:text-zinc-950
                dark:hover:bg-rose-500
                dark:hover:text-white
              "
            >
              Contact the Garage
              <ArrowUpRight size={20} />
            </a>
          </div>
        </div>
      </section>

      {/* ======================================================
          ABOUT
      ====================================================== */}

      <section className="px-6 py-24">
        <div
          className="
            mx-auto grid max-w-7xl
            gap-16
            lg:grid-cols-2
            lg:items-center
          "
        >
          <div>
            <div
              className="
                flex h-14 w-14
                items-center justify-center
                rounded-2xl
                bg-sky-500/10
                text-sky-500

                dark:bg-rose-500/10
                dark:text-rose-400
              "
            >
              <Wrench size={26} />
            </div>

            <p
              className="
                mt-7 text-sm font-semibold
                uppercase tracking-[0.3em]
                text-zinc-500
              "
            >
              About TTC
            </p>

            <h2
              className="
                mt-3 text-4xl
                font-bold tracking-tight
                md:text-5xl
              "
            >
              Built for people who care about their cars.
            </h2>
          </div>

          <div
            className="
              space-y-5 text-lg
              leading-8 text-zinc-600

              dark:text-zinc-400
            "
          >
            <p>
              Top Tier Customs is an automotive customisation garage focused on
              transforming vehicles through carefully selected upgrades,
              professional installation and attention to detail.
            </p>

            <p>
              Whether you're upgrading your interior with ambient lighting and a
              starlight headliner, modernising your technology with Apple
              CarPlay, improving vehicle security or fitting exterior aero
              components, every project receives the same level of care.
            </p>

            <p>
              Our goal is simple: deliver modifications that look intentional,
              feel premium and complement the character of the vehicle.
            </p>
          </div>
        </div>
      </section>

      {/* ======================================================
          MAP + CONTACT
      ====================================================== */}

      <section
        id="contact"
        className="
          border-y border-black/10
          bg-white/50
          px-6 py-24

          dark:border-white/10
          dark:bg-black/20
        "
      >
        <div
          className="
            mx-auto grid max-w-7xl
            gap-8
            lg:grid-cols-[1.4fr_0.6fr]
          "
        >
          {/* Map */}

          <div
            className="
              min-h-125 overflow-hidden
              rounded-3xl
              border border-black/10
              shadow-xl

              dark:border-white/10
            "
          >
            <iframe
              title="Top Tier Customs location"
              src="https://www.google.com/maps?q=Wokingham%20RG40&output=embed"
              className="h-full min-h-125 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          {/* Contact Card */}

          <div
            className="
              flex flex-col
              rounded-3xl
              border border-black/10
              bg-white/80
              p-8
              backdrop-blur-xl

              dark:border-white/10
              dark:bg-zinc-900/70
            "
          >
            <p
              className="
                text-sm font-semibold uppercase
                tracking-[0.3em]
                text-zinc-500
              "
            >
              Visit Us
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              Let's talk about your build.
            </h2>

            <p
              className="
                mt-4 leading-7
                text-zinc-600

                dark:text-zinc-400
              "
            >
              Have an idea in mind? Contact us to discuss your vehicle,
              requirements and available installation dates.
            </p>

            <div className="mt-8 space-y-4">
              <a
                href="https://maps.google.com/?q=Wokingham+RG40"
                target="_blank"
                rel="noreferrer"
                className="
                  flex items-center gap-4
                  rounded-2xl
                  border border-black/10
                  p-4
                  transition
                  hover:border-sky-500/40
                  hover:bg-sky-500/5

                  dark:border-white/10
                  dark:hover:border-rose-500/40
                  dark:hover:bg-rose-500/5
                "
              >
                <MapPin size={21} />

                <div>
                  <p className="font-semibold">Wokingham RG40</p>
                  <p className="text-sm text-zinc-500">Open in Maps</p>
                </div>
              </a>

              <a
                href="tel:07990284333"
                className="
                  flex items-center gap-4
                  rounded-2xl
                  border border-black/10
                  p-4
                  transition
                  hover:border-sky-500/40
                  hover:bg-sky-500/5

                  dark:border-white/10
                  dark:hover:border-rose-500/40
                  dark:hover:bg-rose-500/5
                "
              >
                <Phone size={21} />

                <div>
                  <p className="font-semibold">07990 284333</p>
                  <p className="text-sm text-zinc-500">Call Top Tier Customs</p>
                </div>
              </a>

              <a
                href="mailto:contact@toptiercustoms.co.uk"
                className="
                  flex items-center gap-4
                  rounded-2xl
                  border border-black/10
                  p-4
                  transition
                  hover:border-sky-500/40
                  hover:bg-sky-500/5

                  dark:border-white/10
                  dark:hover:border-rose-500/40
                  dark:hover:bg-rose-500/5
                "
              >
                <Mail size={21} />

                <div>
                  <p className="font-semibold">Email the Garage</p>

                  <p className="text-sm text-zinc-500">General enquiries</p>
                </div>
              </a>
            </div>

            <div className="mt-auto pt-8">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="
                  flex items-center justify-center gap-2
                  rounded-2xl
                  border border-black/10
                  px-5 py-4
                  font-semibold
                  transition
                  hover:bg-zinc-100

                  dark:border-white/10
                  dark:hover:bg-zinc-800
                "
              >
                <FaInstagram size={20} />
                Follow Our Work
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          AVAILABILITY CALENDAR
      ====================================================== */}

      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div
            className="
              flex flex-col gap-5
              md:flex-row
              md:items-end
              md:justify-between
            "
          >
            <div>
              <div
                className="
                  flex items-center gap-2
                  text-sky-500

                  dark:text-rose-400
                "
              >
                <CalendarDays size={20} />

                <span
                  className="
                    text-sm font-semibold
                    uppercase tracking-[0.3em]
                  "
                >
                  Availability
                </span>
              </div>

              <h2
                className="
                  mt-3 text-4xl
                  font-bold tracking-tight
                "
              >
                {monthName}
              </h2>

              <p
                className="
                  mt-3 max-w-xl
                  text-zinc-600

                  dark:text-zinc-400
                "
              >
                Check our current workshop availability before contacting us to
                arrange your installation.
              </p>
            </div>

            {/* Legend */}

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Available
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                Limited
              </div>

              <div className="flex items-center gap-2">
                <span
                  className="
                    h-2.5 w-2.5 rounded-full
                    bg-sky-500

                    dark:bg-rose-500
                  "
                />
                Fully Booked
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-400" />
                Closed
              </div>
            </div>
          </div>

          {/* Calendar */}

          <div
            className="
              mt-10 overflow-hidden
              rounded-3xl
              border border-black/10
              bg-white/60
              p-4
              shadow-lg
              backdrop-blur-xl

              sm:p-6

              dark:border-white/10
              dark:bg-zinc-900/50
            "
          >
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="
                    py-3 text-center
                    text-xs font-semibold
                    uppercase tracking-widest
                    text-zinc-500
                  "
                >
                  {day}
                </div>
              ))}

              {Array.from({ length: firstDayOffset }).map((_, index) => (
                <div key={`empty-${index}`} />
              ))}

              {calendarDays.map((date) => (
                <div
                  key={date.day}
                  className={`
                    relative min-h-22
                    rounded-2xl border
                    p-3
                    transition-all duration-300

                    sm:min-h-28
                    sm:p-4

                    ${calendarStatusStyles[date.status]}

                    ${
                      date.isToday
                        ? `
                          ring-2
                          ring-sky-500
                          ring-offset-2
                          ring-offset-zinc-100

                          dark:ring-rose-500
                          dark:ring-offset-zinc-950
                        `
                        : ""
                    }
                  `}
                >
                  <span className="font-bold">{date.day}</span>

                  <p
                    className="
                      absolute bottom-3 left-3
                      hidden text-xs
                      font-medium capitalize

                      sm:block
                      sm:bottom-4
                      sm:left-4
                    "
                  >
                    {date.status}
                  </p>

                  {date.isToday && (
                    <span
                      className="
                        absolute right-2 top-2
                        rounded-full
                        bg-sky-500
                        px-2 py-1
                        text-[9px]
                        font-bold uppercase
                        tracking-wide
                        text-white

                        dark:bg-rose-500
                      "
                    >
                      Today
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          RECENT WORK
      ====================================================== */}

      <section
        className="
          border-t border-black/10
          bg-white/40
          px-6 py-24

          dark:border-white/10
          dark:bg-black/20
        "
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <div
              className="
                flex items-center gap-2
                text-sky-500

                dark:text-rose-400
              "
            >
              <Sparkles size={18} />

              <span
                className="
                  text-sm font-semibold
                  uppercase tracking-[0.3em]
                "
              >
                Recent Work
              </span>
            </div>

            <h2
              className="
                mt-4 text-4xl
                font-bold tracking-tight
                md:text-5xl
              "
            >
              Built at Top Tier Customs.
            </h2>

            <p
              className="
                mt-4 text-lg
                leading-8 text-zinc-600

                dark:text-zinc-400
              "
            >
              A glimpse at some of the cars and transformations recently
              completed in the TTC workshop.
            </p>
          </div>

          {/* Collage */}

          <div
            className="
              mt-10 grid
              auto-rows-72
              grid-cols-1
              gap-5
              md:grid-cols-2
              lg:grid-cols-4
            "
          >
            {recentWork.map((project) => (
              <article
                key={project.id}
                className={`
                  group relative
                  overflow-hidden
                  rounded-3xl

                  ${project.className ?? ""}
                `}
              >
                <img
                  src={project.image}
                  alt={`${project.vehicle} - ${project.title}`}
                  className="
                    h-full w-full
                    object-cover
                    transition-transform
                    duration-700
                    group-hover:scale-110
                  "
                />

                <div
                  className="
                    absolute inset-0
                    bg-linear-to-t
                    from-black/90
                    via-black/20
                    to-transparent
                  "
                />

                <div
                  className="
                    absolute inset-x-0
                    bottom-0
                    translate-y-3
                    p-6
                    text-white
                    transition-transform
                    duration-300
                    group-hover:translate-y-0
                  "
                >
                  <p
                    className="
                      text-xs font-semibold
                      uppercase
                      tracking-[0.25em]
                      text-zinc-300
                    "
                  >
                    {project.vehicle}
                  </p>

                  <h3 className="mt-2 text-2xl font-bold">{project.title}</h3>

                  <p
                    className="
                      mt-2 max-h-0
                      overflow-hidden
                      text-sm leading-6
                      text-zinc-300
                      opacity-0
                      transition-all
                      duration-500

                      group-hover:max-h-24
                      group-hover:opacity-100
                    "
                  >
                    {project.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default GaragePage;
