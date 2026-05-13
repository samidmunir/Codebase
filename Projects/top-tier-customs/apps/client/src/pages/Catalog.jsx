// Catalog.jsx
import { useMemo, useState } from "react";
import { useTheme } from "../contexts/Theme";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpRight,
  Heart,
  Star,
  Sparkles,
  ShoppingCart,
  X,
  Check,
  Tag,
  Truck,
  ShieldCheck,
  Wrench,
  Grid3X3,
  LayoutList,
} from "lucide-react";

/**
 * Catalog.jsx
 * - Stunning, complex, responsive shop page
 * - Category navigation + filters + search + sort
 * - Product grid w/ Quick View modal + favorites
 * - Theme-aware palette: dark => rose accents, light => sky accents
 *
 * NOTE: Demo data in-file. Replace with API data.
 */
export default function Catalog() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

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
  const cardAlt = isDark
    ? "bg-black/20 border-white/10"
    : "bg-white border-black/10";
  const subtle = isDark ? "text-white/70" : "text-black/70";
  const subtle2 = isDark ? "text-white/60" : "text-black/60";
  const divider = isDark ? "bg-white/10" : "bg-black/10";

  // -------------------------
  // Demo content
  // -------------------------
  const categories = useMemo(
    () => [
      {
        id: "All",
        label: "All Products",
        desc: "Everything — curated and fitment-first.",
      },
      {
        id: "Performance",
        label: "Performance",
        desc: "Power, response, and control.",
      },
      {
        id: "Exterior",
        label: "Exterior",
        desc: "Aero, styling, carbon, paint protection.",
      },
      {
        id: "Interior",
        label: "Interior",
        desc: "Comfort, detail, ambient, premium feel.",
      },
      {
        id: "Wheels & Tires",
        label: "Wheels & Tires",
        desc: "Stance, grip, and balance.",
      },
      {
        id: "Lighting",
        label: "Lighting",
        desc: "Visibility, accents, and glow.",
      },
      {
        id: "Detail",
        label: "Detail",
        desc: "Wash, protect, and keep it flawless.",
      },
      {
        id: "Audio",
        label: "Audio",
        desc: "Clarity, punch, and clean installs.",
      },
      {
        id: "Bundles",
        label: "Bundles",
        desc: "Smart kits that work together.",
      },
    ],
    []
  );

  const brands = [
    "TTC Select",
    "Apex",
    "NightDrive",
    "LuxLine",
    "GripForge",
    "Ceramix",
    "NovaSound",
  ];

  const products = useMemo(
    () => [
      mkProduct(
        "P-1001",
        "Cold Air Intake",
        "Performance",
        "Apex",
        349.0,
        4.7,
        421,
        "Best Seller",
        true
      ),
      mkProduct(
        "P-1002",
        "Carbon Lip Spoiler",
        "Exterior",
        "LuxLine",
        249.0,
        4.6,
        210,
        "Trending",
        true
      ),
      mkProduct(
        "P-1003",
        "Premium Brake Pads",
        "Performance",
        "GripForge",
        189.0,
        4.8,
        612,
        "Top Rated",
        false
      ),
      mkProduct(
        "P-1004",
        "Ambient Light Kit",
        "Interior",
        "NightDrive",
        119.0,
        4.5,
        305,
        "New",
        false
      ),
      mkProduct(
        "P-1005",
        "LED Interior Pack",
        "Lighting",
        "NightDrive",
        79.99,
        4.4,
        188,
        "Staff Pick",
        true
      ),
      mkProduct(
        "P-1006",
        "Wheel Cleaner Pro",
        "Detail",
        "Ceramix",
        24.99,
        4.7,
        980,
        "Best Value",
        false
      ),
      mkProduct(
        "P-1007",
        "Ceramic Tint Kit",
        "Interior",
        "TTC Select",
        229.99,
        4.6,
        510,
        "Popular",
        true
      ),
      mkProduct(
        "P-1008",
        "Stage 1 Bundle",
        "Bundles",
        "TTC Select",
        699.0,
        4.7,
        97,
        "Bundle",
        true
      ),
      mkProduct(
        "P-1009",
        "Aero Side Skirt Set",
        "Exterior",
        "LuxLine",
        399.0,
        4.3,
        77,
        "Limited",
        false
      ),
      mkProduct(
        "P-1010",
        "Performance Filter",
        "Performance",
        "Apex",
        89.0,
        4.4,
        260,
        "Accessory",
        true
      ),
      mkProduct(
        "P-1011",
        "All-Weather Floor Mats",
        "Interior",
        "TTC Select",
        149.0,
        4.5,
        340,
        "Essential",
        true
      ),
      mkProduct(
        "P-1012",
        "Front Splitter Kit",
        "Exterior",
        "LuxLine",
        459.0,
        4.6,
        132,
        "Hot",
        false
      ),
      mkProduct(
        "P-1013",
        "Summer Tire Set",
        "Wheels & Tires",
        "GripForge",
        899.0,
        4.7,
        64,
        "Pro",
        false
      ),
      mkProduct(
        "P-1014",
        "Wheel & Tire Package",
        "Wheels & Tires",
        "TTC Select",
        1699.0,
        4.6,
        28,
        "Premium",
        true
      ),
      mkProduct(
        "P-1015",
        "Underbody Glow Kit",
        "Lighting",
        "NightDrive",
        139.0,
        4.2,
        84,
        "Glow",
        false
      ),
      mkProduct(
        "P-1016",
        "Component Speaker Set",
        "Audio",
        "NovaSound",
        299.0,
        4.6,
        115,
        "Clean",
        false
      ),
      mkProduct(
        "P-1017",
        "Sub + Amp Bundle",
        "Audio",
        "NovaSound",
        649.0,
        4.7,
        52,
        "Bundle",
        true
      ),
      mkProduct(
        "P-1018",
        "Detailing Mega Kit",
        "Detail",
        "Ceramix",
        179.5,
        4.8,
        402,
        "Top Rated",
        true
      ),
    ],
    []
  );

  // -------------------------
  // State
  // -------------------------
  const initialCategory = params.get("category") || "All";
  const [activeCategory, setActiveCategory] = useState(
    categories.some((c) => c.id === initialCategory) ? initialCategory : "All"
  );
  const [query, setQuery] = useState(params.get("q") || "");
  const [sort, setSort] = useState(params.get("sort") || "Featured");
  const [priceMin, setPriceMin] = useState(
    params.get("min") ? Number(params.get("min")) : 0
  );
  const [priceMax, setPriceMax] = useState(
    params.get("max") ? Number(params.get("max")) : 2000
  );
  const [ratingAtLeast, setRatingAtLeast] = useState(
    params.get("rating") ? Number(params.get("rating")) : 0
  );
  const [selectedBrands, setSelectedBrands] = useState(
    () => new Set((params.get("brands") || "").split(",").filter(Boolean))
  );
  const [onlyInStock, setOnlyInStock] = useState(params.get("stock") === "1");
  const [onlyOnSale, setOnlyOnSale] = useState(params.get("sale") === "1");
  const [gridMode, setGridMode] = useState(params.get("view") || "grid"); // "grid" | "list"
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [favorites, setFavorites] = useState(() => new Set());
  const [quickView, setQuickView] = useState(null); // product

  // -------------------------
  // Derived data
  // -------------------------
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const brandsSet = selectedBrands;

    let list = products.filter((p) => {
      if (activeCategory !== "All" && p.category !== activeCategory)
        return false;
      if (q) {
        const hay =
          `${p.name} ${p.brand} ${p.category} ${p.badge}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (p.price < priceMin || p.price > priceMax) return false;
      if (p.rating < ratingAtLeast) return false;
      if (brandsSet.size > 0 && !brandsSet.has(p.brand)) return false;
      if (onlyInStock && !p.inStock) return false;
      if (onlyOnSale && !p.onSale) return false;
      return true;
    });

    list = sortProducts(list, sort);
    return list;
  }, [
    products,
    activeCategory,
    query,
    priceMin,
    priceMax,
    ratingAtLeast,
    selectedBrands,
    onlyInStock,
    onlyOnSale,
    sort,
  ]);

  const activeCategoryMeta = useMemo(
    () => categories.find((c) => c.id === activeCategory) || categories[0],
    [categories, activeCategory]
  );

  const appliedFiltersCount = useMemo(() => {
    let n = 0;
    if (activeCategory !== "All") n++;
    if (query.trim()) n++;
    if (priceMin !== 0 || priceMax !== 2000) n++;
    if (ratingAtLeast !== 0) n++;
    if (selectedBrands.size > 0) n++;
    if (onlyInStock) n++;
    if (onlyOnSale) n++;
    return n;
  }, [
    activeCategory,
    query,
    priceMin,
    priceMax,
    ratingAtLeast,
    selectedBrands,
    onlyInStock,
    onlyOnSale,
  ]);

  const syncParams = () => {
    const next = new URLSearchParams();
    if (activeCategory && activeCategory !== "All")
      next.set("category", activeCategory);
    if (query.trim()) next.set("q", query.trim());
    if (sort !== "Featured") next.set("sort", sort);
    if (priceMin !== 0) next.set("min", String(priceMin));
    if (priceMax !== 2000) next.set("max", String(priceMax));
    if (ratingAtLeast !== 0) next.set("rating", String(ratingAtLeast));
    if (selectedBrands.size > 0)
      next.set("brands", Array.from(selectedBrands).join(","));
    if (onlyInStock) next.set("stock", "1");
    if (onlyOnSale) next.set("sale", "1");
    if (gridMode !== "grid") next.set("view", gridMode);
    setParams(next, { replace: true });
  };

  const clearFilters = () => {
    setActiveCategory("All");
    setQuery("");
    setSort("Featured");
    setPriceMin(0);
    setPriceMax(2000);
    setRatingAtLeast(0);
    setSelectedBrands(new Set());
    setOnlyInStock(false);
    setOnlyOnSale(false);
  };

  const toggleBrand = (b) => {
    setSelectedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b);
      else next.add(b);
      return next;
    });
  };

  const toggleFav = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Update URL params when user stops interacting (simple “apply” approach)
  // You can call syncParams() on every change too; this is a cleaner UX.
  const apply = () => {
    syncParams();
    setMobileFiltersOpen(false);
  };

  return (
    <div className={`min-h-screen pt-16 ${shellBg} relative overflow-hidden`}>
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className={[
            "absolute -top-44 left-1/2 h-[620px] w-[620px] -translate-x-1/2 rounded-full blur-3xl opacity-20",
            isDark ? "bg-rose-500" : "bg-sky-500",
          ].join(" ")}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />
      </div>

      <div className="mx-auto w-full px-16 py-8 lg:py-10">
        {/* Header */}
        <div className={`rounded-3xl border ${cardBg} backdrop-blur-xl`}>
          <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className={`h-12 w-12 rounded-2xl grid place-items-center border ${accentBorder} ${accentBgSoft}`}
              >
                <Sparkles className={accentText} />
              </div>
              <div className="leading-tight">
                <p className={`text-sm ${subtle2}`}>Shop</p>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide">
                  Catalog <span className={accentText}>•</span>{" "}
                  {activeCategoryMeta.label}
                </h1>
                <p className={`mt-1 text-sm ${subtle}`}>
                  {activeCategoryMeta.desc}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div
                className={`flex items-center gap-2 rounded-2xl border px-4 py-3 ${cardAlt}`}
              >
                <Search size={18} className="opacity-80" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search parts, kits, brands..."
                  className="w-full bg-transparent outline-none placeholder:opacity-60"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setMobileFiltersOpen(true)}
                  className={`lg:hidden inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-semibold border ${
                    isDark
                      ? "border-white/10 bg-white/5 hover:bg-white/10"
                      : "border-black/10 bg-black/5 hover:bg-black/10"
                  } transition`}
                >
                  <SlidersHorizontal size={18} />
                  Filters
                  {appliedFiltersCount > 0 && (
                    <span
                      className={`ml-1 text-xs px-2 py-1 rounded-full border ${accentBorder} ${accentBgSoft} ${accentText}`}
                    >
                      {appliedFiltersCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => navigate("/services")}
                  className={`hidden sm:inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-semibold text-white ${accentBg} ${accentHover} transition`}
                >
                  Book Install <Wrench size={18} />
                </button>

                <button
                  onClick={() => navigate("/dashboard")}
                  className={`hidden sm:inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-semibold border ${
                    isDark
                      ? "border-white/10 bg-white/5 hover:bg-white/10"
                      : "border-black/10 bg-black/5 hover:bg-black/10"
                  } transition`}
                >
                  Dashboard <ArrowUpRight size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className={`h-[1px] ${divider}`} />

          {/* Trust strip (catalog version) */}
          <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            <TrustPill
              icon={ShieldCheck}
              title="Verified quality"
              desc="Curated parts + fitment-first picks"
              isDark={isDark}
              accentBorder={accentBorder}
              accentBgSoft={accentBgSoft}
            />
            <TrustPill
              icon={Truck}
              title="Fast fulfillment"
              desc="Quick shipping + easy pickup options"
              isDark={isDark}
              accentBorder={accentBorder}
              accentBgSoft={accentBgSoft}
            />
            <TrustPill
              icon={Wrench}
              title="Pro install ready"
              desc="Book installs with your order"
              isDark={isDark}
              accentBorder={accentBorder}
              accentBgSoft={accentBgSoft}
            />
          </div>
        </div>

        {/* Layout */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block space-y-6">
            <div
              className={`rounded-3xl border ${cardBg} backdrop-blur-xl overflow-hidden`}
            >
              <div className="p-5">
                <p className={`text-xs tracking-widest uppercase ${subtle2}`}>
                  Categories
                </p>
                <div className="mt-3 space-y-1">
                  {categories.map((c) => {
                    const active = c.id === activeCategory;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setActiveCategory(c.id)}
                        className={[
                          "w-full text-left px-4 py-3 rounded-2xl border transition",
                          isDark ? "border-white/10" : "border-black/10",
                          active
                            ? `${accentBorder} ${accentBgSoft}`
                            : isDark
                            ? "bg-white/5 hover:bg-white/10"
                            : "bg-black/5 hover:bg-black/10",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{c.label}</p>
                            <p className={`text-xs mt-1 ${subtle2} truncate`}>
                              {c.desc}
                            </p>
                          </div>
                          <ChevronDown
                            className={
                              active
                                ? "rotate-[-90deg] opacity-90"
                                : "rotate-[-90deg] opacity-40"
                            }
                            size={16}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <FiltersCard
              isDark={isDark}
              cardBg={cardBg}
              cardAlt={cardAlt}
              divider={divider}
              subtle2={subtle2}
              accentBorder={accentBorder}
              accentBgSoft={accentBgSoft}
              accentText={accentText}
              priceMin={priceMin}
              priceMax={priceMax}
              setPriceMin={setPriceMin}
              setPriceMax={setPriceMax}
              ratingAtLeast={ratingAtLeast}
              setRatingAtLeast={setRatingAtLeast}
              brands={brands}
              selectedBrands={selectedBrands}
              toggleBrand={toggleBrand}
              onlyInStock={onlyInStock}
              setOnlyInStock={setOnlyInStock}
              onlyOnSale={onlyOnSale}
              setOnlyOnSale={setOnlyOnSale}
              apply={apply}
              clearFilters={clearFilters}
            />

            <div className={`rounded-3xl border ${cardBg} backdrop-blur-xl`}>
              <div className="p-5">
                <p className="font-semibold">Need help picking?</p>
                <p className={`mt-2 text-sm ${subtle2}`}>
                  Tell us your vehicle and goal — we’ll recommend a clean setup.
                </p>
                <button
                  onClick={() => navigate("/services")}
                  className={`mt-4 w-full px-5 py-3 rounded-2xl font-semibold text-white ${accentBg} ${accentHover} transition inline-flex items-center justify-center gap-2`}
                >
                  Get recommendations <ArrowUpRight size={18} />
                </button>
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="space-y-6">
            {/* Toolbar */}
            <div className={`rounded-3xl border ${cardBg} backdrop-blur-xl`}>
              <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${subtle2}`}>Showing</span>
                  <span className="font-extrabold">{filtered.length}</span>
                  <span className={`text-sm ${subtle2}`}>results</span>

                  {appliedFiltersCount > 0 && (
                    <span
                      className={`ml-2 text-xs px-2 py-1 rounded-full border ${accentBorder} ${accentBgSoft} ${accentText}`}
                    >
                      {appliedFiltersCount} filter
                      {appliedFiltersCount === 1 ? "" : "s"}
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <div
                    className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 ${cardAlt}`}
                  >
                    <Tag size={16} className="opacity-80" />
                    <span className="text-sm font-semibold">Sort</span>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="bg-transparent outline-none text-sm font-semibold"
                    >
                      <option value="Featured">Featured</option>
                      <option value="Top Rated">Top Rated</option>
                      <option value="Price: Low">Price: Low</option>
                      <option value="Price: High">Price: High</option>
                      <option value="Newest">Newest</option>
                    </select>
                  </div>

                  <div
                    className={`inline-flex items-center gap-2 rounded-2xl border p-1 ${cardAlt}`}
                  >
                    <button
                      className={[
                        "h-10 w-10 rounded-xl grid place-items-center border transition",
                        gridMode === "grid"
                          ? `${accentBorder} ${accentBgSoft}`
                          : isDark
                          ? "border-white/10 bg-white/5"
                          : "border-black/10 bg-black/5",
                      ].join(" ")}
                      onClick={() => setGridMode("grid")}
                      aria-label="Grid view"
                    >
                      <Grid3X3
                        size={18}
                        className={
                          gridMode === "grid" ? accentText : "opacity-80"
                        }
                      />
                    </button>
                    <button
                      className={[
                        "h-10 w-10 rounded-xl grid place-items-center border transition",
                        gridMode === "list"
                          ? `${accentBorder} ${accentBgSoft}`
                          : isDark
                          ? "border-white/10 bg-white/5"
                          : "border-black/10 bg-black/5",
                      ].join(" ")}
                      onClick={() => setGridMode("list")}
                      aria-label="List view"
                    >
                      <LayoutList
                        size={18}
                        className={
                          gridMode === "list" ? accentText : "opacity-80"
                        }
                      />
                    </button>
                  </div>

                  <button
                    onClick={apply}
                    className={`hidden md:inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-semibold text-white ${accentBg} ${accentHover} transition`}
                  >
                    Apply <Check size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Category chips row */}
            <div className={`rounded-3xl border ${cardBg} backdrop-blur-xl`}>
              <div className="p-4 sm:p-5 flex flex-wrap gap-2">
                {categories.map((c) => {
                  const active = c.id === activeCategory;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveCategory(c.id)}
                      className={[
                        "px-4 py-2 rounded-full text-sm font-semibold border transition",
                        isDark ? "border-white/10" : "border-black/10",
                        active
                          ? `${accentBorder} ${accentBgSoft} ${accentText}`
                          : isDark
                          ? "bg-white/5 hover:bg-white/10"
                          : "bg-black/5 hover:bg-black/10",
                      ].join(" ")}
                    >
                      {c.id}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Product grid/list */}
            {filtered.length === 0 ? (
              <div className={`rounded-3xl border ${cardBg} backdrop-blur-xl`}>
                <div className="p-8 text-center">
                  <p className="text-2xl font-extrabold">No matches</p>
                  <p className={`mt-2 ${subtle2}`}>
                    Try a different search, category, or loosen your filters.
                  </p>
                  <button
                    onClick={() => {
                      clearFilters();
                      apply();
                    }}
                    className={`mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-semibold text-white ${accentBg} ${accentHover} transition`}
                  >
                    Reset filters <X size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={[
                  gridMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
                    : "space-y-4",
                ].join(" ")}
              >
                {filtered.map((p) =>
                  gridMode === "grid" ? (
                    <ProductCard
                      key={p.id}
                      p={p}
                      isDark={isDark}
                      cardBg={cardBg}
                      cardAlt={cardAlt}
                      divider={divider}
                      subtle2={subtle2}
                      accentBorder={accentBorder}
                      accentBgSoft={accentBgSoft}
                      accentText={accentText}
                      accentBg={accentBg}
                      accentHover={accentHover}
                      fav={favorites.has(p.id)}
                      toggleFav={() => toggleFav(p.id)}
                      onQuickView={() => setQuickView(p)}
                      onAdd={() => console.log("Add to cart", p.id)}
                    />
                  ) : (
                    <ProductRow
                      key={p.id}
                      p={p}
                      isDark={isDark}
                      cardAlt={cardAlt}
                      divider={divider}
                      subtle2={subtle2}
                      accentBorder={accentBorder}
                      accentBgSoft={accentBgSoft}
                      accentText={accentText}
                      accentBg={accentBg}
                      accentHover={accentHover}
                      fav={favorites.has(p.id)}
                      toggleFav={() => toggleFav(p.id)}
                      onQuickView={() => setQuickView(p)}
                      onAdd={() => console.log("Add to cart", p.id)}
                    />
                  )
                )}
              </div>
            )}

            {/* Bottom CTA */}
            <div className={`rounded-3xl border ${cardBg} backdrop-blur-xl`}>
              <div className="p-6 sm:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-sm opacity-75">Build smarter</p>
                  <h3 className="text-2xl font-extrabold">
                    Bundle your upgrades
                  </h3>
                  <p className={`mt-1 text-sm ${subtle2}`}>
                    Save time and get parts that work together — curated kits
                    and installs.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setActiveCategory("Bundles");
                      apply();
                    }}
                    className={`px-6 py-3 rounded-2xl font-semibold text-white ${accentBg} ${accentHover} transition inline-flex items-center gap-2`}
                  >
                    Shop bundles <ArrowUpRight size={18} />
                  </button>
                  <button
                    onClick={() => navigate("/services")}
                    className={`px-6 py-3 rounded-2xl font-semibold border ${accentBorder} ${accentBgSoft} hover:translate-y-[-1px] transition inline-flex items-center gap-2`}
                  >
                    Book install <Wrench size={18} className={accentText} />
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Mobile filters drawer */}
      {mobileFiltersOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[92%] max-w-sm p-4">
            <div
              className={`h-full rounded-3xl border ${cardBg} backdrop-blur-xl overflow-hidden`}
            >
              <div className="p-4 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-2xl grid place-items-center border ${accentBorder} ${accentBgSoft}`}
                  >
                    <SlidersHorizontal size={18} className={accentText} />
                  </div>
                  <div className="leading-tight">
                    <p className="font-semibold">Filters</p>
                    <p className={`text-xs ${subtle2}`}>
                      {appliedFiltersCount} applied
                    </p>
                  </div>
                </div>
                <button
                  className={`h-10 w-10 rounded-xl grid place-items-center border ${
                    isDark
                      ? "border-white/10 bg-black/20"
                      : "border-black/10 bg-white/70"
                  }`}
                  onClick={() => setMobileFiltersOpen(false)}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 space-y-4 overflow-auto h-[calc(100%-76px)]">
                {/* Categories */}
                <div className={`rounded-3xl border ${cardAlt}`}>
                  <div className="p-4">
                    <p
                      className={`text-xs tracking-widest uppercase ${subtle2}`}
                    >
                      Categories
                    </p>
                    <div className="mt-3 space-y-1">
                      {categories.map((c) => {
                        const active = c.id === activeCategory;
                        return (
                          <button
                            key={c.id}
                            onClick={() => setActiveCategory(c.id)}
                            className={[
                              "w-full text-left px-4 py-3 rounded-2xl border transition",
                              isDark ? "border-white/10" : "border-black/10",
                              active
                                ? `${accentBorder} ${accentBgSoft}`
                                : isDark
                                ? "bg-white/5 hover:bg-white/10"
                                : "bg-black/5 hover:bg-black/10",
                            ].join(" ")}
                          >
                            <p className="font-semibold">{c.label}</p>
                            <p className={`text-xs mt-1 ${subtle2}`}>
                              {c.desc}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <FiltersInner
                  isDark={isDark}
                  cardAlt={cardAlt}
                  divider={divider}
                  subtle2={subtle2}
                  accentBorder={accentBorder}
                  accentBgSoft={accentBgSoft}
                  accentText={accentText}
                  priceMin={priceMin}
                  priceMax={priceMax}
                  setPriceMin={setPriceMin}
                  setPriceMax={setPriceMax}
                  ratingAtLeast={ratingAtLeast}
                  setRatingAtLeast={setRatingAtLeast}
                  brands={brands}
                  selectedBrands={selectedBrands}
                  toggleBrand={toggleBrand}
                  onlyInStock={onlyInStock}
                  setOnlyInStock={setOnlyInStock}
                  onlyOnSale={onlyOnSale}
                  setOnlyOnSale={setOnlyOnSale}
                />

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      clearFilters();
                      apply();
                    }}
                    className={`px-4 py-3 rounded-2xl font-semibold border ${
                      isDark
                        ? "border-white/10 bg-white/5 hover:bg-white/10"
                        : "border-black/10 bg-black/5 hover:bg-black/10"
                    } transition`}
                  >
                    Reset
                  </button>
                  <button
                    onClick={apply}
                    className={`px-4 py-3 rounded-2xl font-semibold text-white ${accentBg} ${accentHover} transition`}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick View modal */}
      {quickView && (
        <QuickView
          p={quickView}
          isDark={isDark}
          cardBg={cardBg}
          cardAlt={cardAlt}
          divider={divider}
          subtle2={subtle2}
          accentBorder={accentBorder}
          accentBgSoft={accentBgSoft}
          accentText={accentText}
          accentBg={accentBg}
          accentHover={accentHover}
          fav={favorites.has(quickView.id)}
          toggleFav={() => toggleFav(quickView.id)}
          onClose={() => setQuickView(null)}
          onAdd={() => console.log("Add to cart", quickView.id)}
        />
      )}
    </div>
  );
}

/* ------------------------------ Components ------------------------------ */

function TrustPill({
  icon: Icon,
  title,
  desc,
  isDark,
  accentBorder,
  accentBgSoft,
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        isDark ? "border-white/10 bg-white/5" : "border-black/10 bg-black/5"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-xl grid place-items-center border ${accentBorder} ${accentBgSoft}`}
        >
          <Icon size={18} className="opacity-90" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold truncate">{title}</p>
          <p className="text-sm opacity-70 truncate">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function FiltersCard({
  isDark,
  cardBg,
  cardAlt,
  divider,
  subtle2,
  accentBorder,
  accentBgSoft,
  accentText,
  priceMin,
  priceMax,
  setPriceMin,
  setPriceMax,
  ratingAtLeast,
  setRatingAtLeast,
  brands,
  selectedBrands,
  toggleBrand,
  onlyInStock,
  setOnlyInStock,
  onlyOnSale,
  setOnlyOnSale,
  apply,
  clearFilters,
}) {
  return (
    <div
      className={`rounded-3xl border ${cardBg} backdrop-blur-xl overflow-hidden`}
    >
      <div className="p-5">
        <div className="flex items-center justify-between">
          <p className="font-extrabold text-lg">Filters</p>
          <span
            className={`text-xs px-2 py-1 rounded-full border ${accentBorder} ${accentBgSoft} ${accentText}`}
          >
            Pro
          </span>
        </div>
        <p className={`mt-1 text-sm ${subtle2}`}>
          Narrow down to the perfect upgrade.
        </p>
      </div>

      <div className={`h-[1px] ${divider}`} />

      <div className="p-5 space-y-4">
        <FiltersInner
          isDark={isDark}
          cardAlt={cardAlt}
          divider={divider}
          subtle2={subtle2}
          accentBorder={accentBorder}
          accentBgSoft={accentBgSoft}
          accentText={accentText}
          priceMin={priceMin}
          priceMax={priceMax}
          setPriceMin={setPriceMin}
          setPriceMax={setPriceMax}
          ratingAtLeast={ratingAtLeast}
          setRatingAtLeast={setRatingAtLeast}
          brands={brands}
          selectedBrands={selectedBrands}
          toggleBrand={toggleBrand}
          onlyInStock={onlyInStock}
          setOnlyInStock={setOnlyInStock}
          onlyOnSale={onlyOnSale}
          setOnlyOnSale={setOnlyOnSale}
        />

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={clearFilters}
            className={`px-4 py-3 rounded-2xl font-semibold border ${
              isDark
                ? "border-white/10 bg-white/5 hover:bg-white/10"
                : "border-black/10 bg-black/5 hover:bg-black/10"
            } transition`}
          >
            Reset
          </button>
          <button
            onClick={apply}
            className={`px-4 py-3 rounded-2xl font-semibold text-white ${
              isDark
                ? "bg-rose-500 hover:bg-rose-500/90"
                : "bg-sky-500 hover:bg-sky-500/90"
            } transition`}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function FiltersInner({
  isDark,
  cardAlt,
  divider,
  subtle2,
  accentBorder,
  accentBgSoft,
  accentText,
  priceMin,
  priceMax,
  setPriceMin,
  setPriceMax,
  ratingAtLeast,
  setRatingAtLeast,
  brands,
  selectedBrands,
  toggleBrand,
  onlyInStock,
  setOnlyInStock,
  onlyOnSale,
  setOnlyOnSale,
}) {
  return (
    <>
      {/* Price */}
      <div className={`rounded-3xl border p-4 ${cardAlt}`}>
        <p className="font-semibold">Price</p>
        <p className={`mt-1 text-sm ${subtle2}`}>Choose your range.</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <LabeledNumber
            label="Min"
            value={priceMin}
            onChange={setPriceMin}
            isDark={isDark}
          />
          <LabeledNumber
            label="Max"
            value={priceMax}
            onChange={setPriceMax}
            isDark={isDark}
          />
        </div>

        <div className={`mt-4 h-[1px] ${divider}`} />

        <div className="mt-4">
          <p className={`text-sm ${subtle2}`}>Quick picks</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <QuickChip
              label="$0–$150"
              onClick={() => (setPriceMin(0), setPriceMax(150))}
              isDark={isDark}
            />
            <QuickChip
              label="$150–$400"
              onClick={() => (setPriceMin(150), setPriceMax(400))}
              isDark={isDark}
            />
            <QuickChip
              label="$400–$900"
              onClick={() => (setPriceMin(400), setPriceMax(900))}
              isDark={isDark}
            />
            <QuickChip
              label="$900+"
              onClick={() => (setPriceMin(900), setPriceMax(2000))}
              isDark={isDark}
            />
          </div>
        </div>
      </div>

      {/* Rating */}
      <div className={`rounded-3xl border p-4 ${cardAlt}`}>
        <p className="font-semibold">Rating</p>
        <p className={`mt-1 text-sm ${subtle2}`}>Only show top picks.</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {[0, 4, 4.5, 4.7].map((r) => (
            <button
              key={r}
              onClick={() => setRatingAtLeast(r)}
              className={[
                "px-3 py-3 rounded-2xl border text-sm font-semibold transition inline-flex items-center justify-center gap-2",
                isDark ? "border-white/10" : "border-black/10",
                ratingAtLeast === r
                  ? `${accentBorder} ${accentBgSoft} ${accentText}`
                  : isDark
                  ? "bg-white/5 hover:bg-white/10"
                  : "bg-black/5 hover:bg-black/10",
              ].join(" ")}
            >
              <Star size={16} className="opacity-80" />
              {r === 0 ? "Any" : `${r}+`}
            </button>
          ))}
        </div>
      </div>

      {/* Brands */}
      <div className={`rounded-3xl border p-4 ${cardAlt}`}>
        <p className="font-semibold">Brands</p>
        <p className={`mt-1 text-sm ${subtle2}`}>Choose one or more.</p>

        <div className="mt-4 space-y-2">
          {brands.map((b) => {
            const active = selectedBrands.has(b);
            return (
              <button
                key={b}
                onClick={() => toggleBrand(b)}
                className={[
                  "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition",
                  isDark ? "border-white/10" : "border-black/10",
                  active
                    ? `${accentBorder} ${accentBgSoft}`
                    : isDark
                    ? "bg-white/5 hover:bg-white/10"
                    : "bg-black/5 hover:bg-black/10",
                ].join(" ")}
              >
                <span className="font-semibold">{b}</span>
                {active ? (
                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${accentBorder} ${accentBgSoft} ${accentText}`}
                  >
                    Selected
                  </span>
                ) : (
                  <span className={`text-xs ${subtle2}`}>—</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toggles */}
      <div className={`rounded-3xl border p-4 ${cardAlt}`}>
        <p className="font-semibold">Availability</p>
        <p className={`mt-1 text-sm ${subtle2}`}>Only show what you want.</p>

        <div className="mt-4 space-y-3">
          <ToggleRow
            title="In stock only"
            value={onlyInStock}
            onChange={setOnlyInStock}
            isDark={isDark}
            accentBorder={accentBorder}
            accentBgSoft={accentBgSoft}
            accentText={accentText}
          />
          <ToggleRow
            title="On sale only"
            value={onlyOnSale}
            onChange={setOnlyOnSale}
            isDark={isDark}
            accentBorder={accentBorder}
            accentBgSoft={accentBgSoft}
            accentText={accentText}
          />
        </div>
      </div>
    </>
  );
}

function LabeledNumber({ label, value, onChange, isDark }) {
  return (
    <label className="space-y-2">
      <span className="text-xs opacity-70">{label}</span>
      <div
        className={`rounded-2xl border px-3 py-2 ${
          isDark ? "border-white/10 bg-black/20" : "border-black/10 bg-white"
        }`}
      >
        <input
          type="number"
          value={value}
          min={0}
          onChange={(e) => onChange(Number(e.target.value || 0))}
          className="w-full bg-transparent outline-none"
        />
      </div>
    </label>
  );
}

function QuickChip({ label, onClick, isDark }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-full text-xs font-semibold border ${
        isDark
          ? "border-white/10 bg-white/5 hover:bg-white/10"
          : "border-black/10 bg-black/5 hover:bg-black/10"
      } transition`}
    >
      {label}
    </button>
  );
}

function ToggleRow({
  title,
  value,
  onChange,
  isDark,
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
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold truncate">{title}</p>
          {value && <p className={`text-xs mt-1 ${accentText}`}>Enabled</p>}
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
    </div>
  );
}

function ProductCard({
  p,
  isDark,
  cardBg,
  cardAlt,
  divider,
  subtle2,
  accentBorder,
  accentBgSoft,
  accentText,
  accentBg,
  accentHover,
  fav,
  toggleFav,
  onQuickView,
  onAdd,
}) {
  return (
    <div
      className={`rounded-3xl border ${cardBg} backdrop-blur-xl overflow-hidden group`}
    >
      {/* Media */}
      <div className={`relative p-5`}>
        <div className={`rounded-3xl border ${cardAlt} overflow-hidden`}>
          <div className="aspect-[16/10] w-full relative">
            {/* Fake image */}
            <div
              className={[
                "absolute inset-0 bg-gradient-to-br opacity-80",
                isDark
                  ? "from-white/10 via-white/5 to-black/40"
                  : "from-black/5 via-white to-black/10",
              ].join(" ")}
            />
            <div className="absolute inset-0 p-4 flex items-start justify-between">
              <span
                className={`text-xs px-3 py-2 rounded-full border ${accentBorder} ${accentBgSoft} ${accentText} font-semibold`}
              >
                {p.badge}
              </span>

              <button
                onClick={toggleFav}
                className={`h-10 w-10 rounded-2xl grid place-items-center border ${
                  isDark
                    ? "border-white/10 bg-black/20"
                    : "border-black/10 bg-white/70"
                } hover:translate-y-[-1px] transition`}
                aria-label="Toggle favorite"
              >
                <Heart
                  size={18}
                  className={
                    fav
                      ? isDark
                        ? "text-rose-300"
                        : "text-sky-600"
                      : "opacity-70"
                  }
                  fill={fav ? "currentColor" : "none"}
                />
              </button>
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star size={16} className="opacity-80" />
                <span className="text-sm font-semibold">
                  {p.rating.toFixed(1)}
                </span>
                <span className={`text-xs ${subtle2}`}>({p.reviews})</span>
              </div>

              <span
                className={`text-xs px-3 py-2 rounded-full border ${
                  p.inStock
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 bg-white/5 text-white/70"
                } font-semibold`}
              >
                {p.inStock ? "In Stock" : "Backorder"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={`h-[1px] ${divider}`} />

      {/* Body */}
      <div className="p-5">
        <p className={`text-xs tracking-widest uppercase ${subtle2}`}>
          {p.category} • {p.brand}
        </p>
        <h3 className="mt-2 text-xl font-extrabold tracking-wide">{p.name}</h3>

        <p className={`mt-2 text-sm ${subtle2}`}>
          Fitment-first. Clean installs. Built to last — and feel it every
          drive.
        </p>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className={`text-xs ${subtle2}`}>Price</p>
            <p className="text-2xl font-extrabold">
              ${p.price.toFixed(2)}{" "}
              {p.onSale && (
                <span className={`text-sm font-semibold ${accentText}`}>
                  • Sale
                </span>
              )}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onQuickView}
              className={`px-4 py-3 rounded-2xl font-semibold border ${
                isDark
                  ? "border-white/10 bg-white/5 hover:bg-white/10"
                  : "border-black/10 bg-black/5 hover:bg-black/10"
              } transition`}
            >
              Quick View
            </button>
            <button
              onClick={onAdd}
              className={`px-4 py-3 rounded-2xl font-semibold text-white ${accentBg} ${accentHover} transition inline-flex items-center gap-2`}
            >
              <ShoppingCart size={18} /> Add
            </button>
          </div>
        </div>

        {/* Hover micro-bar */}
        <div className="mt-5 h-[2px] w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>
    </div>
  );
}

function ProductRow({
  p,
  isDark,
  cardAlt,
  divider,
  subtle2,
  accentBorder,
  accentBgSoft,
  accentText,
  accentBg,
  accentHover,
  fav,
  toggleFav,
  onQuickView,
  onAdd,
}) {
  return (
    <div className={`rounded-3xl border p-4 sm:p-5 ${cardAlt}`}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Media */}
        <div
          className={`rounded-3xl border ${
            isDark ? "border-white/10 bg-white/5" : "border-black/10 bg-black/5"
          } overflow-hidden w-full lg:w-[240px]`}
        >
          <div className="aspect-[16/10] relative">
            <div
              className={`absolute inset-0 ${
                isDark
                  ? "bg-gradient-to-br from-white/10 via-white/5 to-black/40"
                  : "bg-gradient-to-br from-black/5 via-white to-black/10"
              }`}
            />
            <div className="absolute top-3 left-3 flex gap-2">
              <span
                className={`text-xs px-3 py-2 rounded-full border ${accentBorder} ${accentBgSoft} ${accentText} font-semibold`}
              >
                {p.badge}
              </span>
              {p.onSale && (
                <span
                  className={`text-xs px-3 py-2 rounded-full border ${accentBorder} ${accentBgSoft} ${accentText} font-semibold`}
                >
                  Sale
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className={`text-xs tracking-widest uppercase ${subtle2}`}>
            {p.category} • {p.brand}
          </p>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-extrabold truncate">
                {p.name}
              </p>
              <p className={`mt-1 text-sm ${subtle2}`}>
                Curated fitment • Clean installs • Warranty-ready
              </p>
            </div>
            <button
              onClick={toggleFav}
              className={`h-10 w-10 rounded-2xl grid place-items-center border ${
                isDark
                  ? "border-white/10 bg-white/5 hover:bg-white/10"
                  : "border-black/10 bg-black/5 hover:bg-black/10"
              } transition`}
              aria-label="Toggle favorite"
            >
              <Heart
                size={18}
                className={fav ? accentText : "opacity-70"}
                fill={fav ? "currentColor" : "none"}
              />
            </button>
          </div>

          <div className={`mt-4 h-[1px] ${divider}`} />

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Star size={16} className="opacity-80" />
                <span className="text-sm font-semibold">
                  {p.rating.toFixed(1)}
                </span>
                <span className={`text-xs ${subtle2}`}>({p.reviews})</span>
              </div>
              <span
                className={`text-xs px-3 py-2 rounded-full border ${
                  p.inStock
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 bg-white/5 text-white/70"
                } font-semibold`}
              >
                {p.inStock ? "In Stock" : "Backorder"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <p className="text-2xl font-extrabold">${p.price.toFixed(2)}</p>
              <button
                onClick={onQuickView}
                className={`px-4 py-3 rounded-2xl font-semibold border ${
                  isDark
                    ? "border-white/10 bg-white/5 hover:bg-white/10"
                    : "border-black/10 bg-black/5 hover:bg-black/10"
                } transition`}
              >
                Quick View
              </button>
              <button
                onClick={onAdd}
                className={`px-4 py-3 rounded-2xl font-semibold text-white ${accentBg} ${accentHover} transition inline-flex items-center gap-2`}
              >
                <ShoppingCart size={18} /> Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickView({
  p,
  isDark,
  cardBg,
  cardAlt,
  divider,
  subtle2,
  accentBorder,
  accentBgSoft,
  accentText,
  accentBg,
  accentHover,
  fav,
  toggleFav,
  onClose,
  onAdd,
}) {
  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={`w-full max-w-3xl rounded-3xl border ${cardBg} backdrop-blur-xl overflow-hidden`}
        >
          <div className="p-4 sm:p-5 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`h-10 w-10 rounded-2xl grid place-items-center border ${accentBorder} ${accentBgSoft}`}
              >
                <Sparkles size={18} className={accentText} />
              </div>
              <div className="min-w-0">
                <p className="font-extrabold truncate">{p.name}</p>
                <p className={`text-sm ${subtle2} truncate`}>
                  {p.category} • {p.brand} • {p.badge}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`h-10 w-10 rounded-xl grid place-items-center border ${
                isDark
                  ? "border-white/10 bg-black/20"
                  : "border-black/10 bg-white/70"
              }`}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className={`h-[1px] ${divider}`} />

          <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* “Image” */}
            <div className={`rounded-3xl border ${cardAlt} overflow-hidden`}>
              <div className="aspect-[16/12] relative">
                <div
                  className={`absolute inset-0 ${
                    isDark
                      ? "bg-gradient-to-br from-white/10 via-white/5 to-black/50"
                      : "bg-gradient-to-br from-black/5 via-white to-black/10"
                  }`}
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <span
                    className={`text-xs px-3 py-2 rounded-full border ${accentBorder} ${accentBgSoft} ${accentText} font-semibold`}
                  >
                    {p.badge}
                  </span>
                  {p.onSale && (
                    <span
                      className={`text-xs px-3 py-2 rounded-full border ${accentBorder} ${accentBgSoft} ${accentText} font-semibold`}
                    >
                      Sale
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div className={`rounded-3xl border p-5 ${cardAlt}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={`text-xs tracking-widest uppercase ${subtle2}`}
                    >
                      Price
                    </p>
                    <p className="text-3xl font-extrabold">
                      ${p.price.toFixed(2)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Star size={16} className="opacity-80" />
                      <span className="font-semibold">
                        {p.rating.toFixed(1)}
                      </span>
                      <span className={`text-sm ${subtle2}`}>
                        ({p.reviews} reviews)
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={toggleFav}
                    className={`h-11 w-11 rounded-2xl grid place-items-center border ${
                      isDark
                        ? "border-white/10 bg-white/5 hover:bg-white/10"
                        : "border-black/10 bg-black/5 hover:bg-black/10"
                    } transition`}
                    aria-label="Toggle favorite"
                  >
                    <Heart
                      size={18}
                      className={fav ? accentText : "opacity-70"}
                      fill={fav ? "currentColor" : "none"}
                    />
                  </button>
                </div>

                <div className={`mt-4 h-[1px] ${divider}`} />

                <p className={`mt-4 text-sm ${subtle2}`}>
                  Built for clean fitment and long-term reliability. Perfect for
                  a refined daily or a focused build.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge
                    icon={ShieldCheck}
                    text="Warranty-ready"
                    isDark={isDark}
                  />
                  <Badge
                    icon={Wrench}
                    text="Install supported"
                    isDark={isDark}
                  />
                  <Badge
                    icon={Truck}
                    text={p.inStock ? "Ships fast" : "Backorder"}
                    isDark={isDark}
                  />
                </div>

                <div className="mt-5 flex gap-3">
                  <button
                    onClick={onAdd}
                    className={`flex-1 px-5 py-3 rounded-2xl font-semibold text-white ${accentBg} ${accentHover} transition inline-flex items-center justify-center gap-2`}
                  >
                    <ShoppingCart size={18} /> Add to cart
                  </button>
                  <button
                    onClick={onClose}
                    className={`px-5 py-3 rounded-2xl font-semibold border ${
                      isDark
                        ? "border-white/10 bg-white/5 hover:bg-white/10"
                        : "border-black/10 bg-black/5 hover:bg-black/10"
                    } transition`}
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className={`rounded-3xl border p-5 ${cardAlt}`}>
                <p className="font-semibold">Fitment + Notes</p>
                <p className={`mt-2 text-sm ${subtle2}`}>
                  This is a UI placeholder. You can wire vehicle fitment
                  selection here (make/model/year) and show compatibility.
                </p>
                <div className={`mt-4 h-[1px] ${divider}`} />
                <ul className={`mt-4 text-sm ${subtle2} space-y-2`}>
                  <li className="flex items-center gap-2">
                    <Check size={16} className="opacity-80" /> Verified brand +
                    QC
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} className="opacity-80" /> Clean install
                    guidance included
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} className="opacity-80" /> Support available
                    if needed
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className={`h-[1px] ${divider}`} />

          <div className="p-4 sm:p-5 flex items-center justify-between">
            <p className={`text-sm ${subtle2}`}>
              ID: <span className="font-semibold">{p.id}</span>
            </p>
            <button
              className={`text-sm font-semibold ${accentText} hover:opacity-90 transition inline-flex items-center gap-2`}
            >
              View full details <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ icon: Icon, text, isDark }) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-xs px-3 py-2 rounded-full border ${
        isDark ? "border-white/10 bg-white/5" : "border-black/10 bg-black/5"
      } font-semibold`}
    >
      <Icon size={14} className="opacity-80" />
      {text}
    </span>
  );
}

/* ------------------------------ Helpers ------------------------------ */

function mkProduct(
  id,
  name,
  category,
  brand,
  price,
  rating,
  reviews,
  badge,
  inStock,
  onSale = false
) {
  return {
    id,
    name,
    category,
    brand,
    price,
    rating,
    reviews,
    badge,
    inStock,
    onSale,
    createdAt:
      Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 60), // last ~60 days
  };
}

function sortProducts(list, sort) {
  const copy = [...list];
  if (sort === "Top Rated")
    copy.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
  else if (sort === "Price: Low") copy.sort((a, b) => a.price - b.price);
  else if (sort === "Price: High") copy.sort((a, b) => b.price - a.price);
  else if (sort === "Newest") copy.sort((a, b) => b.createdAt - a.createdAt);
  else {
    // Featured: badge + rating weight
    const weight = (p) =>
      (p.badge === "Best Seller" ? 6 : 0) +
      (p.badge === "Top Rated" ? 5 : 0) +
      (p.badge === "Trending" ? 4 : 0) +
      (p.badge === "New" ? 3 : 0) +
      (p.inStock ? 1 : 0) +
      p.rating;
    copy.sort((a, b) => weight(b) - weight(a));
  }
  return copy;
}
