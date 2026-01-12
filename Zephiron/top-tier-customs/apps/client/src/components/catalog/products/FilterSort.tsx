import { type FC, useMemo, useState } from "react";
import { useTheme } from "../../../context/Theme";

interface FilterSortProps {
  onSearch: (query: string) => void;
  onSort: (sortKey: string) => void;

  // ✅ schema-native: categories[]
  onFilterCategory: (category: string) => void;
  availableCategories: string[];
}

const FilterSort: FC<FilterSortProps> = ({
  onSearch,
  onSort,
  onFilterCategory,
  availableCategories,
}) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const { theme } = useTheme();
  const isDark = theme === "dark";

  const categories = useMemo(
    () => [...new Set(availableCategories)].filter(Boolean).sort(),
    [availableCategories]
  );

  return (
    <aside
      className={`p-4 border-2 rounded-md sm:w-full md:w-64 space-y-4 shadow-lg transition-all duration-1000 ${
        isDark ? "bg-zinc-950 border-rose-500" : "bg-zinc-800 border-sky-500"
      }`}
    >
      {/* Search */}
      <div>
        <h3
          className={`text-lg font-semibold mb-2 ${
            isDark ? "text-zinc-300" : "text-zinc-100"
          }`}
        >
          Search
        </h3>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            onSearch(v);
          }}
          placeholder="Search products..."
          className={`w-full px-2 py-2 rounded-md border-1 border-zinc-100 focus:border-zinc-950 focus:outline-none focus:ring-2 ${
            isDark
              ? "ring-rose-500 placeholder:text-zinc-500"
              : "ring-sky-500 placeholder:text-zinc-700"
          } transition-all duration-3000`}
        />
      </div>

      {/* Sort */}
      <div>
        <h3
          className={`text-lg font-semibold mb-2 ${
            isDark ? "text-zinc-300" : "text-zinc-100"
          }`}
        >
          Sort By
        </h3>
        <select
          onChange={(e) => onSort(e.target.value)}
          className={`w-full px-2 py-2 rounded-md border-1 border-zinc-100 focus:border-zinc-950 focus:outline-none focus:ring-2 ${
            isDark
              ? "ring-rose-500 placeholder:text-zinc-500"
              : "ring-sky-500 placeholder:text-zinc-700"
          } transition-all duration-3000`}
        >
          <option value="price-asc">Price (Lowest)</option>
          <option value="price-desc">Price (Highest)</option>
          <option value="latest">Newest</option>
        </select>
      </div>

      {/* Category */}
      <div>
        <h3
          className={`text-lg font-semibold mb-2 ${
            isDark ? "text-zinc-300" : "text-zinc-100"
          }`}
        >
          Filter by Category
        </h3>
        <select
          value={category}
          onChange={(e) => {
            const v = e.target.value;
            setCategory(v);
            onFilterCategory(v);
          }}
          className={`w-full px-2 py-2 rounded-md border-1 border-zinc-100 focus:border-zinc-950 focus:outline-none focus:ring-2 ${
            isDark
              ? "ring-rose-500 placeholder:text-zinc-500"
              : "ring-sky-500 placeholder:text-zinc-700"
          } transition-all duration-3000`}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </aside>
  );
};

export default FilterSort;
