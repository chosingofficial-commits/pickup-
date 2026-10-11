"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Select } from "@/components/ui/input";
import { SHOP_TYPES, SHOP_TYPE_LABELS } from "@/lib/shops/shop-type";
import { SHOP_SORT_OPTIONS } from "./shops-filters-bar";
import type { ShopListFilters } from "@/lib/shops/queries";

/** Mobile-only "Filters" button + bottom sheet — the desktop equivalent is the always-visible ShopsFiltersBar. */
export function ShopsFiltersSheet({ filters }: { filters: ShopListFilters }) {
  const [open, setOpen] = useState(false);

  // Close on back button instead of leaving the app's own history confused.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onPop = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    window.history.pushState({ shopsFilters: true }, "");
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const activeCount = [filters.shopType, filters.openNow, filters.hasOffers].filter(Boolean).length;

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-control border border-border-brand bg-white text-sm font-semibold text-brand-dark shadow-soft"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        Filters
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-primary px-1.5 text-xs font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={() => setOpen(false)}>
          <form
            method="GET"
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-card bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <input type="hidden" name="view" value="shops" />
            {filters.q && <input type="hidden" name="q" value={filters.q} />}

            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-brand-dark">Filters</h2>
              <button type="button" aria-label="Close filters" onClick={() => setOpen(false)} className="rounded-control p-2 hover:bg-brand-bg">
                <X className="h-5 w-5 text-brand-dark" aria-hidden />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="sfm-type" className="mb-1 block text-sm font-medium text-brand-dark">
                  Shop type
                </label>
                <Select id="sfm-type" name="shopType" defaultValue={filters.shopType ?? ""}>
                  <option value="">All types</option>
                  {SHOP_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {SHOP_TYPE_LABELS[t]}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label htmlFor="sfm-sort" className="mb-1 block text-sm font-medium text-brand-dark">
                  Sort by
                </label>
                <Select id="sfm-sort" name="sort" defaultValue={filters.sort ?? "popular"}>
                  {SHOP_SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>

              <label className="flex min-h-11 items-center gap-3 text-sm text-brand-dark">
                <input type="checkbox" name="openNow" value="1" defaultChecked={!!filters.openNow} className="h-5 w-5" />
                Open now
              </label>
              <label className="flex min-h-11 items-center gap-3 text-sm text-brand-dark">
                <input type="checkbox" name="hasOffers" value="1" defaultChecked={!!filters.hasOffers} className="h-5 w-5" />
                Has offers
              </label>
            </div>

            <button
              type="submit"
              className="mt-6 h-12 w-full rounded-control bg-brand-primary text-sm font-semibold text-white hover:bg-brand-primary-hover"
            >
              Apply{activeCount > 0 ? ` (${activeCount})` : ""}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
