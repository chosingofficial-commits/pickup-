import { Select } from "@/components/ui/input";
import type { getAllShoppableCategories } from "@/lib/catalog/queries";
import type { MarketplaceFilters } from "@/lib/catalog/queries";

const SORT_OPTIONS: { value: NonNullable<MarketplaceFilters["sort"]>; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "popularity", label: "Popularity" },
  { value: "rating", label: "Highest rated" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

export function MarketplaceFiltersForm({
  categories,
  filters,
}: {
  categories: Awaited<ReturnType<typeof getAllShoppableCategories>>;
  filters: MarketplaceFilters;
}) {
  return (
    <form method="GET" className="grid grid-cols-2 gap-2 rounded-card border border-border-brand bg-white p-3 shadow-soft sm:gap-3 sm:p-4 sm:grid-cols-4">
      {filters.q && <input type="hidden" name="q" value={filters.q} />}

      <div className="col-span-2 sm:col-span-1">
        <label htmlFor="f-category" className="mb-0.5 block text-[11px] font-medium text-brand-dark sm:mb-1 sm:text-xs">
          Category
        </label>
        <Select id="f-category" name="category" defaultValue={filters.categorySlug ?? ""} className="h-9 text-xs sm:h-11 sm:text-sm">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.parentId ? `— ${c.name}` : c.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="f-rating" className="mb-0.5 block text-[11px] font-medium text-brand-dark sm:mb-1 sm:text-xs">
          Min rating
        </label>
        <Select id="f-rating" name="minRating" defaultValue={filters.minRating?.toString() ?? ""} className="h-9 text-xs sm:h-11 sm:text-sm">
          <option value="">Any</option>
          <option value="4">4★ & up</option>
          <option value="3">3★ & up</option>
          <option value="2">2★ & up</option>
        </Select>
      </div>

      <div>
        <label htmlFor="f-sort" className="mb-0.5 block text-[11px] font-medium text-brand-dark sm:mb-1 sm:text-xs">
          Sort by
        </label>
        <Select id="f-sort" name="sort" defaultValue={filters.sort ?? "relevance"} className="h-9 text-xs sm:h-11 sm:text-sm">
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="col-span-2 flex items-end gap-2 sm:col-span-1">
        <button
          type="submit"
          className="h-9 w-full rounded-control bg-brand-primary px-4 text-xs font-semibold text-white hover:bg-brand-primary-hover sm:h-11 sm:text-sm"
        >
          Apply
        </button>
      </div>
    </form>
  );
}
