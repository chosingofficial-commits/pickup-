import { Select } from "@/components/ui/input";
import { SHOP_TYPES, SHOP_TYPE_LABELS } from "@/lib/shops/shop-type";
import type { ShopListFilters } from "@/lib/shops/queries";

export const SHOP_SORT_OPTIONS: { value: NonNullable<ShopListFilters["sort"]>; label: string }[] = [
  { value: "popular", label: "Popular" },
  { value: "nearest", label: "Nearest / fastest" },
  { value: "az", label: "A–Z" },
];

/** Desktop-only inline filter bar (same "always visible <form method=GET>" convention as MarketplaceFiltersForm) — the mobile equivalent is ShopsFiltersSheet. */
export function ShopsFiltersBar({ filters }: { filters: ShopListFilters }) {
  return (
    <form method="GET" className="hidden flex-wrap items-end gap-3 rounded-card border border-border-brand bg-white p-4 shadow-soft sm:flex">
      <input type="hidden" name="view" value="shops" />
      {filters.q && <input type="hidden" name="q" value={filters.q} />}

      <div className="w-44">
        <label htmlFor="sf-type" className="mb-1 block text-xs font-medium text-brand-dark">
          Shop type
        </label>
        <Select id="sf-type" name="shopType" defaultValue={filters.shopType ?? ""} className="h-10 text-sm">
          <option value="">All types</option>
          {SHOP_TYPES.map((t) => (
            <option key={t} value={t}>
              {SHOP_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </div>

      <div className="w-44">
        <label htmlFor="sf-sort" className="mb-1 block text-xs font-medium text-brand-dark">
          Sort by
        </label>
        <Select id="sf-sort" name="sort" defaultValue={filters.sort ?? "popular"} className="h-10 text-sm">
          {SHOP_SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      <label className="flex h-10 items-center gap-2 text-sm text-brand-dark">
        <input type="checkbox" name="openNow" value="1" defaultChecked={!!filters.openNow} className="h-4 w-4" />
        Open now
      </label>
      <label className="flex h-10 items-center gap-2 text-sm text-brand-dark">
        <input type="checkbox" name="hasOffers" value="1" defaultChecked={!!filters.hasOffers} className="h-4 w-4" />
        Has offers
      </label>

      <button type="submit" className="h-10 rounded-control bg-brand-primary px-5 text-sm font-semibold text-white hover:bg-brand-primary-hover">
        Apply
      </button>
    </form>
  );
}
