import { useNavigate } from "react-router-dom";
import { useTheme } from "../../../context/Theme";
import { useAuth } from "../../context/Auth";
import { useState, useEffect, useMemo } from "react";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { useCart } from "../../context/Cart";

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
  priceCents: number;
  compareAtPriceCents?: number;
  trackInventory?: boolean;
  stockQty?: number;
  images?: ProductImage[];
  isActive?: boolean;
  sortOrder?: number;
};

export interface CatalogProduct {
  _id: string;
  sku: string;
  title: string;
  description: string;

  media?: { images?: ProductImage[] };
  categories?: string[];
  tags?: string[];

  installable: boolean;

  hasVariants?: boolean;
  priceCents?: number;
  compareAtPriceCents?: number;
  discount?: number;

  trackInventory?: boolean;
  stockQty?: number;

  variants?: ProductVariant[];

  isActive?: boolean;
  isFeatured?: boolean;

  createdAt: string;
  updatedAt: string;
}

interface ProductCardProps {
  product: CatalogProduct;
}

const centsToGBP = (cents: number) => (Math.round(cents) / 100).toFixed(2);

const sortImages = (imgs: ProductImage[] = []) =>
  [...imgs].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

const pickPrimaryImage = (p: CatalogProduct) => {
  const imgs = sortImages(p.media?.images ?? []);
  const primary = imgs.find((x) => x.isPrimary && x.url);
  return primary?.url || imgs[0]?.url || "/placeholder.jpg";
};

const getStockQty = (p: CatalogProduct) => {
  if (p.trackInventory !== true) return null; // null means "not tracked"
  if (p.hasVariants) {
    return (p.variants ?? [])
      .filter((v) => v.isActive !== false)
      .reduce((sum, v) => sum + Number(v.stockQty ?? 0), 0);
  }
  return Number(p.stockQty ?? 0);
};

const getPriceRangeCents = (p: CatalogProduct) => {
  if (p.hasVariants) {
    const active = (p.variants ?? []).filter((v) => v.isActive !== false);
    const prices = active
      .map((v) => Number(v.priceCents))
      .filter((n) => Number.isFinite(n));
    if (prices.length === 0) return { min: 0, max: 0 };
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }
  return {
    min: Number(p.priceCents ?? 0) || 0,
    max: Number(p.priceCents ?? 0) || 0,
  };
};

const Card: React.FC<ProductCardProps> = ({ product }) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user, updateUser } = useAuth();
  const { cart, addToCart, removeFromCart, openCart } = useCart();

  const isDark = theme === "dark";
  const isAdmin = user?.role === "admin";

  const isInCart = cart.some((item) => item.id === product._id);

  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (user?.savedProducts?.includes(product._id)) setIsSaved(true);
    else setIsSaved(false);
  }, [user, product._id]);

  const imageUrl = useMemo(() => pickPrimaryImage(product), [product]);

  const { min: minPriceCents, max: maxPriceCents } = useMemo(
    () => getPriceRangeCents(product),
    [product]
  );

  const compareAtCents = Number(product.compareAtPriceCents ?? 0) || 0;

  const hasRange = product.hasVariants && minPriceCents !== maxPriceCents;

  const stockQty = useMemo(() => getStockQty(product), [product]);
  const stockBadge = () => {
    // If inventory not tracked, don’t show stock badge
    if (stockQty === null) return null;

    if (stockQty === 0) {
      return (
        <span className="bg-rose-600 text-white text-xs px-2 py-1 rounded font-semibold">
          Out of Stock
        </span>
      );
    }
    if (stockQty <= 3) {
      return (
        <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded font-semibold">
          Low Stock
        </span>
      );
    }
    return (
      <span className="bg-emerald-600 text-white text-xs px-2 py-1 rounded font-semibold">
        In Stock
      </span>
    );
  };

  const toggleSavedProduct = async () => {
    if (!user) {
      alert("Please login to save products.");
      return;
    }

    // ✅ Prefer Gateway base (adjust if your gateway origin differs)
    const base = "http://localhost:8080/api/auth";

    try {
      const endpoint = isSaved ? "delete-saved-product" : "add-saved-product";
      const res = await fetch(`${base}/${user.id}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product._id }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to update");
      const data = await res.json();

      setIsSaved((prev) => !prev);
      updateUser({ savedProducts: data.user.savedProducts });
    } catch {
      alert("Something went wrong.");
    }
  };

  const handleAddToCart = () => {
    // For variant products, cart UX should pick a variant on Product Details.
    // Here we add a “from” price so the list page still works.
    addToCart({
      id: product._id,
      name: product.title,
      price: minPriceCents / 100,
      image: imageUrl,
    });
    openCart();
  };

  const categoryLabel = (product.categories?.[0] ?? "").toString();
  const tags = (product.tags ?? []).slice(0, 3);

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-300 overflow-hidden shadow-md hover:shadow-xl ${
        isDark
          ? "bg-zinc-800 border-zinc-700 text-zinc-100"
          : "bg-white border-zinc-200 text-zinc-900"
      }`}
    >
      {/* Image */}
      <div className="relative w-full h-48 overflow-hidden">
        <img
          src={imageUrl}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Featured Tag */}
        {product.isFeatured && (
          <div className="absolute top-2 left-2 bg-zinc-900/80 text-white text-xs px-2 py-1 rounded-md font-semibold">
            Featured
          </div>
        )}

        {/* Heart Icon */}
        {user && (
          <button
            onClick={toggleSavedProduct}
            className="absolute top-2 right-2 text-xl z-10"
          >
            {isSaved ? (
              <FaHeart className="text-rose-500 hover:scale-110 transition" />
            ) : (
              <FaRegHeart className="text-white hover:text-rose-500 hover:scale-110 transition" />
            )}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2">
        <h3 className="text-lg font-bold line-clamp-1">{product.title}</h3>

        {/* Category + tags */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1">
            {categoryLabel ? categoryLabel : "Uncategorized"}
          </p>

          <div className="flex items-center gap-2">
            {tags.map((t) => (
              <span
                key={t}
                className={`text-[11px] px-2 py-1 rounded-md border ${
                  isDark
                    ? "border-zinc-600 text-zinc-200"
                    : "border-zinc-200 text-zinc-700"
                }`}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <section className="flex justify-between gap-3">
          <div className="flex-1">
            {/* Installable */}
            {product.installable && (
              <p className="inline-block w-max text-xs font-medium bg-indigo-600 text-white px-2 py-1 rounded-md">
                Installable
              </p>
            )}

            {/* Variant flag */}
            {product.hasVariants && (
              <p className="mt-2 inline-block w-max text-xs font-medium bg-zinc-700 text-white px-2 py-1 rounded-md">
                Multiple options
              </p>
            )}

            {/* Stock */}
            <div className="mt-2">{stockBadge()}</div>
          </div>

          <div className="flex-[1.3]">
            <p className="text-sm text-zinc-600 dark:text-zinc-300 line-clamp-3">
              {product.description}
            </p>
          </div>
        </section>

        {/* Price */}
        <div className="mt-1">
          {hasRange ? (
            <span className="text-lg font-bold text-sky-600 dark:text-sky-400">
              £{centsToGBP(minPriceCents)} – £{centsToGBP(maxPriceCents)}
            </span>
          ) : compareAtCents > 0 && compareAtCents > minPriceCents ? (
            <>
              <span className="text-lg font-bold text-sky-600 dark:text-sky-400">
                £{centsToGBP(minPriceCents)}
              </span>
              <span className="text-sm line-through text-zinc-500 ml-2">
                £{centsToGBP(compareAtCents)}
              </span>
            </>
          ) : (
            <span className="text-lg font-bold text-sky-600 dark:text-sky-400">
              £{centsToGBP(minPriceCents)}
            </span>
          )}
        </div>

        {/* CTA */}
        {!isAdmin && (
          <div className="flex flex-col gap-2 mt-4">
            <button
              onClick={() => navigate(`/products/${product._id}`)}
              className="w-full py-2 rounded-md font-medium text-sm bg-sky-600 text-white hover:bg-sky-700 transition"
            >
              View Details
            </button>

            {isInCart ? (
              <button
                onClick={() => removeFromCart(product._id)}
                className="w-full py-2 rounded-md font-medium text-sm bg-rose-600 text-white hover:bg-rose-700 transition"
              >
                Remove from Cart
              </button>
            ) : (
              <button
                onClick={handleAddToCart}
                className="w-full py-2 rounded-md font-medium text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition"
              >
                Add to Cart
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Card;
