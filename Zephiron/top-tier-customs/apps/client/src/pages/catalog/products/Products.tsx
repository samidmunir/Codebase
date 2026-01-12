import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../../context/Theme";

import FilterSort from "../../../components/catalog/products/FilterSort";
import Card from "../../../components/catalog/products/Card";

/**
 * Matches your current backend Product model:
 * - sku, title, description
 * - media.images[{url, alt, sortOrder, isPrimary}]
 * - categories[], tags[]
 * - hasVariants, priceCents, compareAtPriceCents
 * - variants[] w/ priceCents/stockQty/images/stripe.priceId etc
 * - trackInventory, stockQty, isActive, isFeatured
 */
type ProductImage = {
  url: string;
  alt?: string;
  sortOrder?: number;
  isPrimary?: boolean;
};

type ProductVariant = {
  _id: string;
  sku?: string;
  name: string;
  options?: Record<string, string> | Map<string, string>;
  priceCents: number;
  compareAtPriceCents?: number;
  trackInventory?: boolean;
  stockQty?: number;
  images?: ProductImage[];
  isActive?: boolean;
  sortOrder?: number;
};

type CatalogProduct = {
  _id: string;
  sku: string;
  title: string;
  description: string;

  media?: {
    images?: ProductImage[];
  };

  categories?: string[];
  tags?: string[];

  hasVariants?: boolean;
  priceCents?: number;
  compareAtPriceCents?: number;
  discount?: number;

  installable: boolean;

  trackInventory?: boolean;
  stockQty?: number;

  isActive?: boolean;
  isFeatured?: boolean;

  variants?: ProductVariant[];

  createdAt: string;
  updatedAt: string;
};

/**
 * Adapter to keep your existing ProductCard working without changing it.
 * (Your old ProductCard expects: images: string[], price: number, discount, quantity, category, brand, etc.)
 */
type ProductCardVM = {
  _id: string;
  title: string;
  description: string;

  // Old UI expectations
  images: string[];
  price: number; // dollars
  discount: number;
  quantity: number;
  installable: boolean;

  // Old filters used brand/category
  category: string;
  brand: string;
  type: string;
  fits: string[];

  createdAt: string;
  updatedAt: string;

  // Keep access to the raw product if you want later
  _raw: CatalogProduct;
};

const centsToDollars = (cents?: number) => {
  const n = Number(cents);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n) / 100;
};

const sortImages = (imgs: ProductImage[] = []) =>
  [...imgs].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

const getPrimaryImageUrls = (p: CatalogProduct): string[] => {
  const imgs = sortImages(p.media?.images ?? []);
  const primary = imgs.find((x) => x.isPrimary && x.url);
  const urls = [
    ...(primary?.url ? [primary.url] : []),
    ...imgs.filter((x) => x.url && x.url !== primary?.url).map((x) => x.url),
  ];
  return urls;
};

const getDisplayPriceCents = (p: CatalogProduct): number => {
  // If variants: show the minimum active variant price
  if (p.hasVariants) {
    const activeVariants = (p.variants ?? []).filter(
      (v) => v.isActive !== false
    );
    const min = activeVariants.reduce<number | null>((acc, v) => {
      const pc = Number(v.priceCents);
      if (!Number.isFinite(pc)) return acc;
      if (acc === null) return pc;
      return Math.min(acc, pc);
    }, null);
    return min ?? 0;
  }
  // No variants: base price
  return Number(p.priceCents ?? 0) || 0;
};

const getDisplayStockQty = (p: CatalogProduct): number => {
  // If tracking inventory:
  // - variants: sum variant stocks (active variants)
  // - non-variants: stockQty
  const tracks = p.trackInventory === true;
  if (!tracks) return 0;

  if (p.hasVariants) {
    return (p.variants ?? [])
      .filter((v) => v.isActive !== false)
      .reduce((sum, v) => sum + Number(v.stockQty ?? 0), 0);
  }

  return Number(p.stockQty ?? 0);
};

const Products = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState("price-asc");

  // NOTE: This used to be filterBrand. Your schema doesn’t have brand.
  // We’ll treat it as "category filter" but keep FilterSort prop API the same.
  const [filterCategory, setFilterCategory] = useState("");

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);

  const productVMs: ProductCardVM[] = useMemo(() => {
    return products
      .filter((p) => p.isActive !== false) // only show active
      .map((p) => {
        const category = (p.categories ?? [])[0] ?? "";
        const priceCents = getDisplayPriceCents(p);

        return {
          _id: p._id,
          title: p.title,
          description: p.description,

          images: getPrimaryImageUrls(p),
          price: centsToDollars(priceCents),
          discount: Number(p.discount ?? 0) || 0,
          quantity: getDisplayStockQty(p),
          installable: p.installable,

          category,
          brand: "", // not in new schema; keep for compatibility
          type: "", // not in new schema; keep for compatibility
          fits: [], // not in new schema; keep for compatibility

          createdAt: p.createdAt,
          updatedAt: p.updatedAt,

          _raw: p,
        };
      });
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const searched = productVMs.filter((vm) => {
      if (!q) return true;
      const raw = vm._raw;

      const haystack = [
        vm.title,
        vm.description,
        raw.sku,
        ...(raw.categories ?? []),
        ...(raw.tags ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });

    const categoryFiltered = searched.filter((vm) =>
      filterCategory ? vm._raw.categories?.includes(filterCategory) : true
    );

    const sorted = [...categoryFiltered].sort((a, b) => {
      if (sortKey === "price-asc") return a.price - b.price;
      if (sortKey === "price-desc") return b.price - a.price;
      if (sortKey === "latest") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      return 0;
    });

    return sorted;
  }, [productVMs, searchQuery, filterCategory, sortKey]);

  // Feed FilterSort with categories (keeps its prop name "availableBrands")
  const availableCategories = useMemo(() => {
    const all = products.flatMap((p) => p.categories ?? []);
    return [...new Set(all)].filter(Boolean).sort();
  }, [products]);

  const fetchProducts = async () => {
    try {
      // Catalog service returns: { ok, message, products }
      const res = await fetch("http://localhost:8080/api/catalog/products");
      const data = await res.json();

      const list = Array.isArray(data?.products) ? data.products : [];
      setProducts(list);
    } catch (e: any) {
      alert("Failed to fetch products: " + e.message);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <main
      className={`relative w-full min-h-screen px-4 sm:px-6 py-8 transition-all duration-3000 ${
        isDark ? "bg-zinc-900 text-zinc-100" : "bg-zinc-100 text-zinc-900"
      }`}
    >
      <h1 className="text-4xl uppercase font-bold text-center mb-8">
        Our Premium Catalog
      </h1>

      {/* Mobile Filter Button */}
      <div className="md:hidden mb-4 flex justify-end">
        <button
          onClick={toggleDrawer}
          className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 transition"
        >
          Filter & Sort
        </button>
      </div>

      <section className="flex gap-6">
        {/* Sidebar for desktop */}
        <aside className="hidden md:block w-64 shrink-0">
          <div className="sticky top-28">
            <FilterSort
              onSearch={setSearchQuery}
              onSort={setSortKey}
              onFilterCategory={setFilterCategory}
              availableCategories={availableCategories}
            />
          </div>

          <p className="sticky top-106 text-center mt-2">
            <span className="font-semibold">Total products: </span>
            {filteredProducts.length}
          </p>
        </aside>

        {/* Product Grid */}
        <section className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </section>
      </section>

      {/* Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-40 backdrop-blur-sm bg-black/30 md:hidden"
          onClick={toggleDrawer}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed top-23 right-0 w-3/4 max-w-sm h-full z-50 transform transition-transform duration-1000 md:hidden ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        } ${isDark ? "bg-zinc-900" : "bg-white"}`}
      >
        <div className="p-4 flex justify-between items-center border-b border-zinc-700">
          <h2 className="text-xl font-semibold">Filters</h2>
          <button onClick={toggleDrawer} className="text-2xl font-bold">
            ×
          </button>
        </div>

        <div className="p-4">
          <FilterSort
            onSearch={(val) => setSearchQuery(val)}
            onSort={(key) => {
              setSortKey(key);
              toggleDrawer();
            }}
            onFilterCategory={(cat) => {
              setFilterCategory(cat);
              toggleDrawer();
            }}
            availableCategories={availableCategories}
          />
        </div>
      </div>
    </main>
  );
};

export default Products;
