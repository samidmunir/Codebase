import { useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  CarFront,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flame,
  Images,
  MapPin,
  Sparkles,
  Star,
  TrendingUp,
  Wrench,
} from "lucide-react";

// Replace these with your own images
import ambientLighting from "../assets/images/activity/ambient-lighting.jpg";
import starlightHeadliner from "../assets/images/activity/starlight-headliner.jpg";
import bmwAero from "../assets/images/activity/custom-aero.jpg";
import steeringWheel from "../assets/images/activity/steering-wheel.jpg";
import carPlayInstall from "../assets/images/activity/carplay-install.jpg";

type ActivityCategory = "All" | "Projects" | "Workshop" | "News" | "Milestones";

interface ActivityItem {
  id: number;
  category: Exclude<ActivityCategory, "All">;
  title: string;
  description: string;
  date: string;
  image?: string;
  vehicle?: string;
  featured?: boolean;
}

interface UpcomingJob {
  id: number;
  time: string;
  customer: string;
  vehicle: string;
  service: string;
  status: "Confirmed" | "In Progress" | "Upcoming";
}

const activityItems: ActivityItem[] = [
  {
    id: 1,
    category: "Projects",
    title: "Ambient Lighting Transformation",
    vehicle: "BMW 3 Series",
    description:
      "A complete multi-zone ambient lighting installation across the dashboard, doors and footwells, finished with a clean OEM-inspired appearance.",
    date: "Today",
    image: ambientLighting,
    featured: true,
  },
  {
    id: 2,
    category: "Projects",
    title: "Starlight Headliner Completed",
    vehicle: "Mercedes-Benz C-Class",
    description:
      "Hundreds of fibre-optic stars professionally integrated into the original headliner with adjustable brightness and colour control.",
    date: "Yesterday",
    image: starlightHeadliner,
  },
  {
    id: 3,
    category: "Workshop",
    title: "Custom Aero Kit Fitment",
    vehicle: "BMW M4",
    description:
      "Front splitter, rear diffuser and side extensions aligned and professionally fitted for a more aggressive road presence.",
    date: "2 days ago",
    image: bmwAero,
  },
  {
    id: 4,
    category: "Projects",
    title: "Custom Steering Wheel Upgrade",
    vehicle: "Audi S3",
    description:
      "Carbon fibre and Alcantara steering wheel installed while retaining factory controls and airbag functionality.",
    date: "3 days ago",
    image: steeringWheel,
  },
  {
    id: 5,
    category: "News",
    title: "Apple CarPlay Installation Now Available",
    description:
      "TTC now offers Apple CarPlay and Android Auto screen and module upgrades for a growing range of supported vehicles.",
    date: "5 days ago",
    image: carPlayInstall,
  },
  {
    id: 6,
    category: "Milestones",
    title: "Another Busy Month at TTC",
    description:
      "A strong month of custom lighting, security installations, styling upgrades and technology retrofits completed in the workshop.",
    date: "1 week ago",
  },
];

const upcomingJobs: UpcomingJob[] = [
  {
    id: 1,
    time: "09:00",
    customer: "Booked",
    vehicle: "BMW 4 Series",
    service: "Ambient Lighting",
    status: "Confirmed",
  },
  {
    id: 2,
    time: "11:30",
    customer: "Booked",
    vehicle: "Mercedes A-Class",
    service: "Apple CarPlay",
    status: "In Progress",
  },
  {
    id: 3,
    time: "14:00",
    customer: "Booked",
    vehicle: "Audi A5",
    service: "Ghost Immobiliser",
    status: "Upcoming",
  },
  {
    id: 4,
    time: "15:30",
    customer: "Booked",
    vehicle: "VW Golf GTI",
    service: "Custom Steering Wheel",
    status: "Upcoming",
  },
];

const categories: ActivityCategory[] = [
  "All",
  "Projects",
  "Workshop",
  "News",
  "Milestones",
];

const ActivityPage = () => {
  const [selectedCategory, setSelectedCategory] =
    useState<ActivityCategory>("All");

  const filteredActivity = useMemo(() => {
    if (selectedCategory === "All") {
      return activityItems;
    }

    return activityItems.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  const featuredActivity = activityItems.find((item) => item.featured);

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
        <div
          className="
            pointer-events-none
            absolute -right-48 -top-48
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
            absolute -bottom-60 -left-48
            h-125 w-125
            rounded-full
            bg-sky-400/5
            blur-3xl

            dark:bg-red-500/5
          "
        />

        <div
          className="
            relative mx-auto
            grid max-w-7xl
            gap-12
            lg:grid-cols-[1.15fr_0.85fr]
            lg:items-end
          "
        >
          {/* Hero copy */}

          <div>
            <div
              className="
                inline-flex items-center gap-2
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
              <Activity size={16} />
              Live from the TTC Workshop
            </div>

            <p
              className="
                mt-6 text-sm
                font-semibold uppercase
                tracking-[0.35em]
                text-zinc-500
              "
            >
              Company Activity
            </p>

            <h1
              className="
                mt-4 max-w-4xl
                text-5xl font-bold
                tracking-tight
                md:text-7xl
                lg:text-8xl
              "
            >
              See what we're{" "}
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
                building.
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
              Follow the latest builds, workshop updates, installations and
              milestones happening at Top Tier Customs.
            </p>
          </div>

          {/* Workshop pulse */}

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
            "
          >
            <div className="flex items-start justify-between">
              <div>
                <p
                  className="
                    text-xs font-semibold
                    uppercase tracking-[0.25em]
                    text-zinc-500
                  "
                >
                  Workshop Pulse
                </p>

                <div className="mt-3 flex items-center gap-3">
                  <span
                    className="
                      relative flex
                      h-3 w-3
                      rounded-full
                      bg-emerald-500
                    "
                  >
                    <span
                      className="
                        absolute inline-flex
                        h-full w-full
                        animate-ping
                        rounded-full
                        bg-emerald-400
                        opacity-50
                      "
                    />
                  </span>

                  <h2 className="text-3xl font-bold">Active Today</h2>
                </div>
              </div>

              <div
                className="
                  flex h-13 w-13
                  items-center justify-center
                  rounded-2xl
                  bg-sky-500/10
                  text-sky-500

                  dark:bg-rose-500/10
                  dark:text-rose-400
                "
              >
                <Wrench size={24} />
              </div>
            </div>

            <div
              className="
                mt-7 grid
                grid-cols-3 gap-3
              "
            >
              <div
                className="
                  rounded-2xl
                  bg-zinc-100
                  p-4

                  dark:bg-zinc-800
                "
              >
                <p className="text-2xl font-bold">4</p>

                <p
                  className="
                    mt-1 text-xs
                    text-zinc-500
                  "
                >
                  Jobs Today
                </p>
              </div>

              <div
                className="
                  rounded-2xl
                  bg-zinc-100
                  p-4

                  dark:bg-zinc-800
                "
              >
                <p className="text-2xl font-bold">2</p>

                <p
                  className="
                    mt-1 text-xs
                    text-zinc-500
                  "
                >
                  In Progress
                </p>
              </div>

              <div
                className="
                  rounded-2xl
                  bg-zinc-100
                  p-4

                  dark:bg-zinc-800
                "
              >
                <p className="text-2xl font-bold">3</p>

                <p
                  className="
                    mt-1 text-xs
                    text-zinc-500
                  "
                >
                  Completed
                </p>
              </div>
            </div>

            <div
              className="
                mt-6 flex
                items-center gap-2
                text-sm text-zinc-500
              "
            >
              <Clock3 size={16} />
              Last updated moments ago
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          ACTIVITY METRICS
      ====================================================== */}

      <section className="px-6 py-12">
        <div
          className="
            mx-auto grid
            max-w-7xl gap-4
            sm:grid-cols-2
            xl:grid-cols-4
          "
        >
          <MetricCard
            icon={<CarFront size={23} />}
            value="18"
            label="Projects This Month"
            detail="+4 from last month"
          />

          <MetricCard
            icon={<CheckCircle2 size={23} />}
            value="126"
            label="Completed Builds"
            detail="Across TTC projects"
          />

          <MetricCard
            icon={<Star size={23} />}
            value="4.9"
            label="Customer Rating"
            detail="Customer satisfaction"
          />

          <MetricCard
            icon={<TrendingUp size={23} />}
            value="94%"
            label="Workshop Capacity"
            detail="Current month"
          />
        </div>
      </section>

      {/* ======================================================
          FEATURED BUILD
      ====================================================== */}

      {featuredActivity?.image && (
        <section className="px-6 py-12">
          <div className="mx-auto max-w-7xl">
            <div
              className="
                group relative
                min-h-140
                overflow-hidden
                rounded-[2rem]
              "
            >
              <img
                src={featuredActivity.image}
                alt={featuredActivity.title}
                className="
                  absolute inset-0
                  h-full w-full
                  object-cover
                  transition-transform
                  duration-1000
                  group-hover:scale-105
                "
              />

              <div
                className="
                  absolute inset-0
                  bg-linear-to-r
                  from-black/95
                  via-black/60
                  to-black/10
                "
              />

              <div
                className="
                  relative z-10
                  flex min-h-140
                  max-w-2xl
                  flex-col
                  justify-end
                  p-8
                  text-white
                  md:p-12
                "
              >
                <div
                  className="
                    mb-5 inline-flex
                    w-fit items-center gap-2
                    rounded-full
                    border border-white/20
                    bg-white/10
                    px-4 py-2
                    text-sm font-semibold
                    backdrop-blur-md
                  "
                >
                  <Flame size={16} />
                  Featured Build
                </div>

                <p
                  className="
                    text-sm font-semibold
                    uppercase
                    tracking-[0.3em]
                    text-zinc-300
                  "
                >
                  {featuredActivity.vehicle}
                </p>

                <h2
                  className="
                    mt-3 text-4xl
                    font-bold tracking-tight
                    md:text-6xl
                  "
                >
                  {featuredActivity.title}
                </h2>

                <p
                  className="
                    mt-5 text-lg
                    leading-8
                    text-zinc-300
                  "
                >
                  {featuredActivity.description}
                </p>

                <div className="mt-7">
                  <button
                    type="button"
                    className="
                      inline-flex
                      items-center gap-2
                      rounded-full
                      bg-white
                      px-6 py-3
                      font-semibold
                      text-zinc-950
                      transition
                      hover:bg-sky-500
                      hover:text-white

                      dark:hover:bg-rose-500
                    "
                  >
                    View Project
                    <ArrowUpRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ======================================================
          WORKSHOP SCHEDULE
      ====================================================== */}

      <section
        className="
          mt-12
          border-y border-black/10
          bg-white/40
          px-6 py-20

          dark:border-white/10
          dark:bg-black/20
        "
      >
        <div
          className="
            mx-auto grid
            max-w-7xl gap-12
            lg:grid-cols-[0.8fr_1.2fr]
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
                Today's Workshop
              </span>
            </div>

            <h2
              className="
                mt-4 text-4xl
                font-bold tracking-tight
                md:text-5xl
              "
            >
              What's happening today.
            </h2>

            <p
              className="
                mt-5 max-w-lg
                text-lg leading-8
                text-zinc-600

                dark:text-zinc-400
              "
            >
              A snapshot of the work moving through the Top Tier Customs
              workshop today.
            </p>
          </div>

          <div className="space-y-3">
            {upcomingJobs.map((job) => (
              <div
                key={job.id}
                className="
                  group flex
                  flex-col gap-4
                  rounded-2xl
                  border border-black/10
                  bg-white/70
                  p-5
                  backdrop-blur-xl
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:shadow-xl

                  sm:flex-row
                  sm:items-center

                  dark:border-white/10
                  dark:bg-zinc-900/60
                "
              >
                <div
                  className="
                    flex h-14 w-20
                    shrink-0 items-center
                    justify-center
                    rounded-xl
                    bg-zinc-100
                    font-bold

                    dark:bg-zinc-800
                  "
                >
                  {job.time}
                </div>

                <div className="flex-1">
                  <p className="font-bold">{job.vehicle}</p>

                  <p
                    className="
                      mt-1 text-sm
                      text-zinc-500
                    "
                  >
                    {job.service}
                  </p>
                </div>

                <JobStatus status={job.status} />

                <ChevronRight
                  size={20}
                  className="
                    hidden
                    text-zinc-400
                    transition-transform
                    group-hover:translate-x-1

                    sm:block
                  "
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================
          ACTIVITY FEED
      ====================================================== */}

      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div
            className="
              flex flex-col gap-6
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
                <Sparkles size={18} />

                <span
                  className="
                    text-sm font-semibold
                    uppercase tracking-[0.3em]
                  "
                >
                  Activity Feed
                </span>
              </div>

              <h2
                className="
                  mt-3 text-4xl
                  font-bold tracking-tight
                  md:text-5xl
                "
              >
                Latest from TTC.
              </h2>
            </div>

            {/* Filters */}

            <div
              className="
                flex gap-2
                overflow-x-auto
                pb-2
              "
            >
              {categories.map((category) => {
                const active = selectedCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`
                      whitespace-nowrap
                      rounded-full
                      border
                      px-5 py-2.5
                      text-sm
                      font-semibold
                      transition-all
                      duration-300

                      ${
                        active
                          ? `
                            border-sky-500
                            bg-sky-500
                            text-white
                            shadow-lg
                            shadow-sky-500/20

                            dark:border-rose-500
                            dark:bg-rose-500
                            dark:shadow-rose-500/20
                          `
                          : `
                            border-black/10
                            bg-white/60
                            text-zinc-600
                            hover:border-sky-500/40
                            hover:text-sky-500

                            dark:border-white/10
                            dark:bg-zinc-900/60
                            dark:text-zinc-400
                            dark:hover:border-rose-500/40
                            dark:hover:text-rose-400
                          `
                      }
                    `}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feed */}

          <div
            className="
              mt-10 grid
              gap-6
              md:grid-cols-2
              xl:grid-cols-3
            "
          >
            {filteredActivity.map((item) => (
              <ActivityCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================
          SOCIAL / COMMUNITY CTA
      ====================================================== */}

      <section className="px-6 pb-24">
        <div
          className="
            relative mx-auto
            max-w-7xl
            overflow-hidden
            rounded-[2rem]
            bg-zinc-950
            px-8 py-14
            text-white

            md:px-14
            md:py-16

            dark:bg-zinc-900
          "
        >
          <div
            className="
              pointer-events-none
              absolute -right-24 -top-24
              h-80 w-80
              rounded-full
              bg-sky-500/20
              blur-3xl

              dark:bg-rose-500/20
            "
          />

          <div
            className="
              relative z-10
              flex flex-col gap-8
              lg:flex-row
              lg:items-center
              lg:justify-between
            "
          >
            <div className="max-w-3xl">
              <div
                className="
                  flex items-center gap-2
                  text-sky-400

                  dark:text-rose-400
                "
              >
                <Images size={19} />

                <span
                  className="
                    text-sm font-semibold
                    uppercase tracking-[0.3em]
                  "
                >
                  Follow the builds
                </span>
              </div>

              <h2
                className="
                  mt-4 text-4xl
                  font-bold tracking-tight
                  md:text-5xl
                "
              >
                Want to see more TTC projects?
              </h2>

              <p
                className="
                  mt-4 max-w-2xl
                  text-lg leading-8
                  text-zinc-400
                "
              >
                Follow Top Tier Customs for project reveals, behind-the-scenes
                workshop content and the latest builds leaving the garage.
              </p>
            </div>

            <div
              className="
                flex flex-col gap-3
                sm:flex-row
              "
            >
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="
                  inline-flex
                  items-center
                  justify-center gap-2
                  rounded-full
                  bg-white
                  px-6 py-3
                  font-semibold
                  text-zinc-950
                  transition
                  hover:bg-sky-500
                  hover:text-white

                  dark:hover:bg-rose-500
                "
              >
                <Images size={18} />
                Instagram
              </a>

              <a
                href="/garage"
                className="
                  inline-flex
                  items-center
                  justify-center gap-2
                  rounded-full
                  border border-white/20
                  bg-white/5
                  px-6 py-3
                  font-semibold
                  backdrop-blur-md
                  transition
                  hover:bg-white/10
                "
              >
                <MapPin size={18} />
                Visit Garage
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ActivityPage;

/* ============================================================
   SUB COMPONENTS
============================================================ */

interface MetricCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  detail: string;
}

const MetricCard = ({ icon, value, label, detail }: MetricCardProps) => {
  return (
    <article
      className="
        rounded-3xl
        border border-black/10
        bg-white/70
        p-6
        shadow-sm
        backdrop-blur-xl
        transition-all duration-300
        hover:-translate-y-1
        hover:shadow-xl

        dark:border-white/10
        dark:bg-zinc-900/60
      "
    >
      <div
        className="
          flex h-12 w-12
          items-center justify-center
          rounded-2xl
          bg-sky-500/10
          text-sky-500

          dark:bg-rose-500/10
          dark:text-rose-400
        "
      >
        {icon}
      </div>

      <p
        className="
          mt-6 text-4xl
          font-bold tracking-tight
        "
      >
        {value}
      </p>

      <p className="mt-2 font-semibold">{label}</p>

      <p
        className="
          mt-1 text-sm
          text-zinc-500
        "
      >
        {detail}
      </p>
    </article>
  );
};

const ActivityCard = ({ item }: { item: ActivityItem }) => {
  return (
    <article
      className="
        group flex h-full
        flex-col overflow-hidden
        rounded-3xl
        border border-black/10
        bg-white/70
        shadow-sm
        backdrop-blur-xl
        transition-all duration-500
        hover:-translate-y-2
        hover:shadow-2xl

        dark:border-white/10
        dark:bg-zinc-900/60
      "
    >
      {item.image && (
        <div className="relative h-64 overflow-hidden">
          <img
            src={item.image}
            alt={item.title}
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
              from-black/70
              via-transparent
              to-transparent
            "
          />

          {item.vehicle && (
            <span
              className="
                absolute bottom-4 left-4
                rounded-full
                border border-white/20
                bg-black/30
                px-3 py-1.5
                text-xs font-semibold
                uppercase
                tracking-[0.15em]
                text-white
                backdrop-blur-md
              "
            >
              {item.vehicle}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        <div
          className="
            flex items-center
            justify-between gap-4
          "
        >
          <span
            className="
              rounded-full
              bg-sky-500/10
              px-3 py-1.5
              text-xs font-semibold
              uppercase
              tracking-[0.15em]
              text-sky-600

              dark:bg-rose-500/10
              dark:text-rose-400
            "
          >
            {item.category}
          </span>

          <span
            className="
              text-xs
              text-zinc-500
            "
          >
            {item.date}
          </span>
        </div>

        <h3
          className="
            mt-5 text-2xl
            font-bold tracking-tight
            transition-colors
            group-hover:text-sky-500

            dark:group-hover:text-rose-400
          "
        >
          {item.title}
        </h3>

        <p
          className="
            mt-3 flex-1
            leading-7
            text-zinc-600

            dark:text-zinc-400
          "
        >
          {item.description}
        </p>

        <button
          type="button"
          className="
            mt-6 flex
            items-center gap-2
            self-start
            font-semibold
            text-zinc-950
            transition
            hover:text-sky-500

            dark:text-white
            dark:hover:text-rose-400
          "
        >
          View Update
          <ArrowUpRight
            size={17}
            className="
              transition-transform
              group-hover:translate-x-1
              group-hover:-translate-y-1
            "
          />
        </button>
      </div>
    </article>
  );
};

const JobStatus = ({ status }: { status: UpcomingJob["status"] }) => {
  const styles = {
    Confirmed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    "In Progress":
      "bg-sky-500/10 text-sky-600 dark:bg-rose-500/10 dark:text-rose-400",
    Upcoming: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };

  return (
    <span
      className={`
        w-fit
        rounded-full
        px-3 py-1.5
        text-xs
        font-semibold

        ${styles[status]}
      `}
    >
      {status}
    </span>
  );
};
