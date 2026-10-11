import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * "Products | Shops" tab switch at the top of /marketplace. Plain <Link>s
 * (full navigation, matching this app's existing filter/pagination
 * convention), so the active view is linkable/shareable via ?view=.
 * Sticky only on mobile, below the breakpoint where it most needs to stay
 * reachable while scrolling a long list — desktop has no scroll-depth
 * problem reaching back up to it.
 */
export function MarketplaceViewSwitch({ active, baseQuery }: { active: "products" | "shops"; baseQuery: string }) {
  const sep = baseQuery ? "&" : "";
  return (
    <div className="sticky top-[88px] z-20 -mx-4 mb-4 bg-brand-bg/95 px-4 py-2 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
      <div role="tablist" aria-label="Browse marketplace" className="flex gap-1 rounded-control border border-border-brand bg-white p-1 shadow-soft sm:inline-flex sm:w-auto">
        <Link
          href={`/marketplace?${baseQuery}${sep}view=products`}
          role="tab"
          aria-selected={active === "products"}
          className={cn(
            "flex-1 rounded-control px-4 py-2.5 text-center text-sm font-semibold sm:flex-none sm:px-6",
            active === "products" ? "bg-brand-primary text-white" : "text-brand-dark hover:bg-brand-bg",
          )}
        >
          Products
        </Link>
        <Link
          href={`/marketplace?${baseQuery}${sep}view=shops`}
          role="tab"
          aria-selected={active === "shops"}
          className={cn(
            "flex-1 rounded-control px-4 py-2.5 text-center text-sm font-semibold sm:flex-none sm:px-6",
            active === "shops" ? "bg-brand-primary text-white" : "text-brand-dark hover:bg-brand-bg",
          )}
        >
          Shops
        </Link>
      </div>
    </div>
  );
}
