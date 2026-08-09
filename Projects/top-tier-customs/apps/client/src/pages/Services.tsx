import { useMemo, useState } from "react";
import {
  ArrowDownAZ,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";

import ServiceCard from "../components/services/ServiceCard";
import { services } from "../data/services";

type SortOption =
  | "default"
  | "featured"
  | "name-asc"
  | "price-asc"
  | "price-desc";

const ServicesPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<SortOption>("default");

  /*
   * Dynamically generate categories from our service data.
   */
  const categories = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(
          services
            .filter((service) => service.active)
            .map((service) => service.category),
        ),
      ),
    ];
  }, []);

  /*
   * Search + category filter + sorting.
   */
  const filteredServices = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const result = services.filter((service) => {
      if (!service.active) {
        return false;
      }

      const matchesCategory =
        selectedCategory === "All" || service.category === selectedCategory;

      const matchesSearch =
        query.length === 0 ||
        service.name.toLowerCase().includes(query) ||
        service.shortDescription.toLowerCase().includes(query) ||
        service.category.toLowerCase().includes(query) ||
        service.tags.some((tag) => tag.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });

    switch (sortBy) {
      case "featured":
        return [...result].sort(
          (a, b) =>
            Number(b.featured) - Number(a.featured) ||
            a.displayOrder - b.displayOrder,
        );

      case "name-asc":
        return [...result].sort((a, b) => a.name.localeCompare(b.name));

      case "price-asc":
        return [...result].sort(
          (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity),
        );

      case "price-desc":
        return [...result].sort(
          (a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity),
        );

      default:
        return [...result].sort((a, b) => a.displayOrder - b.displayOrder);
    }
  }, [searchTerm, selectedCategory, sortBy]);

  const hasActiveFilters =
    searchTerm.length > 0 || selectedCategory !== "All" || sortBy !== "default";

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("All");
    setSortBy("default");
  };

  return (
    <main
      className="
        min-h-screen
        bg-zinc-100 text-zinc-950
        transition-all duration-300

        dark:bg-zinc-950
        dark:text-zinc-50
      "
    >
      {/* ============================================
          SERVICES HEADER
      ============================================ */}

      <section
        className="
          relative overflow-hidden
          border-b border-black/10
          px-6 pb-16 pt-40

          dark:border-white/10
        "
      >
        {/* Decorative glow */}
        <div
          className="
            pointer-events-none
            absolute -right-40 -top-40
            h-125 w-125
            rounded-full
            bg-sky-500/10 blur-3xl

            dark:bg-rose-500/10
          "
        />

        <div
          className="
            relative mx-auto
            max-w-7xl
          "
        >
          <div className="max-w-4xl">
            <div
              className="
                mb-5 inline-flex
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
              <Sparkles size={16} />
              Top Tier Customs
            </div>

            <p
              className="
                text-sm font-semibold uppercase
                tracking-[0.35em]
                text-zinc-500

                dark:text-zinc-400
              "
            >
              Premium Automotive Services
            </p>

            <h1
              className="
                mt-4 max-w-4xl
                text-5xl font-bold
                tracking-tight
                md:text-7xl
              "
            >
              Built around
              <span
                className="
                  bg-linear-to-r
                  from-zinc-950 to-sky-500
                  bg-clip-text
                  text-transparent

                  dark:from-white
                  dark:to-rose-500
                "
              >
                {" "}
                your vision.
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
              Explore our range of automotive upgrades, installations and
              customisation services designed to transform the way your vehicle
              looks, feels and performs.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================
          SEARCH + FILTERS
      ============================================ */}

      <section
        className="
          sticky top-24 z-30
          border-b border-black/10
          bg-zinc-100/80
          px-6 py-5
          backdrop-blur-xl

          dark:border-white/10
          dark:bg-zinc-950/80
        "
      >
        <div className="mx-auto max-w-7xl">
          {/* Search + Sort */}

          <div
            className="
              flex flex-col gap-4
              lg:flex-row
              lg:items-center
            "
          >
            {/* Search */}
            <div className="relative flex-1">
              <Search
                size={20}
                className="
                  absolute left-5 top-1/2
                  -translate-y-1/2
                  text-zinc-400
                "
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search lighting, tinting, cameras, aero..."
                className="
                  w-full rounded-2xl
                  border border-black/10
                  bg-white/80
                  py-4 pl-13 pr-12
                  text-zinc-950
                  outline-none
                  transition-all duration-300
                  placeholder:text-zinc-400
                  focus:border-sky-500
                  focus:ring-4
                  focus:ring-sky-500/10

                  dark:border-white/10
                  dark:bg-zinc-900/80
                  dark:text-white
                  dark:focus:border-rose-500
                  dark:focus:ring-rose-500/10
                "
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                  className="
                    absolute right-4 top-1/2
                    -translate-y-1/2
                    rounded-full p-2
                    text-zinc-400
                    transition
                    hover:bg-zinc-200
                    hover:text-zinc-950

                    dark:hover:bg-zinc-800
                    dark:hover:text-white
                  "
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="relative">
              <SlidersHorizontal
                size={18}
                className="
                  pointer-events-none
                  absolute left-4 top-1/2
                  -translate-y-1/2
                  text-zinc-500
                "
              />

              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value as SortOption)
                }
                className="
                  min-w-55
                  appearance-none
                  rounded-2xl
                  border border-black/10
                  bg-white/80
                  py-4 pl-11 pr-10
                  font-medium
                  text-zinc-700
                  outline-none
                  transition

                  dark:border-white/10
                  dark:bg-zinc-900/80
                  dark:text-zinc-200
                "
              >
                <option value="default">Recommended</option>

                <option value="featured">Featured First</option>

                <option value="name-asc">Name: A–Z</option>

                <option value="price-asc">Price: Low to High</option>

                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Categories */}
          <div
            className="
              mt-5 flex
              items-center gap-3
              overflow-x-auto
              pb-1
            "
          >
            {categories.map((category) => {
              const active = selectedCategory === category;

              return (
                <button
                  type="button"
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`
                    whitespace-nowrap
                    rounded-full border
                    px-5 py-2.5
                    text-sm font-semibold
                    transition-all duration-300

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
                          hover:text-sky-600

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
      </section>

      {/* ============================================
          SERVICES GRID
      ============================================ */}

      <section className="px-6 py-14">
        <div className="mx-auto max-w-7xl">
          {/* Results information */}
          <div
            className="
              mb-8 flex flex-col gap-3
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div>
              <h2 className="text-2xl font-bold">
                {selectedCategory === "All" ? "All Services" : selectedCategory}
              </h2>

              <p
                className="
                  mt-1 text-sm
                  text-zinc-500

                  dark:text-zinc-400
                "
              >
                {filteredServices.length}{" "}
                {filteredServices.length === 1 ? "service" : "services"}{" "}
                available
              </p>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="
                  flex items-center gap-2
                  self-start
                  text-sm font-semibold
                  text-zinc-500
                  transition
                  hover:text-sky-500

                  dark:hover:text-rose-400
                "
              >
                <X size={16} />
                Clear filters
              </button>
            )}
          </div>

          {/* Cards */}
          {filteredServices.length > 0 ? (
            <div
              className="
                grid grid-cols-1
                gap-7
                md:grid-cols-2
                xl:grid-cols-3
              "
            >
              {filteredServices.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          ) : (
            /* ======================================
               EMPTY SEARCH STATE
            ====================================== */
            <div
              className="
                flex min-h-100
                flex-col items-center
                justify-center
                rounded-3xl
                border border-dashed
                border-black/20
                bg-white/40
                px-6 text-center

                dark:border-white/15
                dark:bg-zinc-900/40
              "
            >
              <div
                className="
                  flex h-16 w-16
                  items-center justify-center
                  rounded-2xl
                  bg-zinc-200

                  dark:bg-zinc-800
                "
              >
                <Search
                  size={28}
                  className="
                    text-zinc-500

                    dark:text-zinc-400
                  "
                />
              </div>

              <h3
                className="
                  mt-5 text-2xl
                  font-bold
                "
              >
                No services found
              </h3>

              <p
                className="
                  mt-2 max-w-md
                  text-zinc-500

                  dark:text-zinc-400
                "
              >
                We couldn't find a service matching your current search and
                filters.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="
                  mt-6 rounded-full
                  bg-zinc-950
                  px-6 py-3
                  font-semibold text-white
                  transition
                  hover:bg-sky-500

                  dark:bg-white
                  dark:text-zinc-950
                  dark:hover:bg-rose-500
                  dark:hover:text-white
                "
              >
                Show All Services
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default ServicesPage;
