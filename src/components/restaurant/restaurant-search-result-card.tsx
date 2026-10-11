import Link from "next/link";
import { ProductImage } from "@/components/product/product-image";
import { VendorLogo } from "@/components/vendor/vendor-logo";
import { Badge } from "@/components/ui/badge";
import { formatBDT } from "@/lib/utils";
import { formatOpenStatusBadge } from "@/lib/restaurant/status";
import type { searchRestaurantsAndDishes } from "@/lib/restaurant/queries";

type RestaurantSearchResult = Awaited<ReturnType<typeof searchRestaurantsAndDishes>>["items"][number];

/**
 * One restaurant's search-result row — tapping the restaurant header opens
 * its menu page; tapping a matching dish links to the same page with
 * ?item=<id>, which auto-opens that dish's existing detail dialog (see
 * MenuItemCard's defaultOpen prop) rather than inventing a separate
 * standalone "item page".
 */
export function RestaurantSearchResultCard({ result }: { result: RestaurantSearchResult }) {
  const { vendor, status, matchingDishes } = result;
  if (!vendor.restaurant) return null;
  const href = `/restaurants/${vendor.slug}`;

  return (
    <div className="rounded-card border border-border-brand bg-white p-4 shadow-soft">
      <Link href={href} prefetch={false} className="group flex items-center gap-3">
        <VendorLogo logoUrl={vendor.logoUrl} coverImageUrl={vendor.coverImageUrl} businessName={vendor.businessName} size={48} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-heading text-base font-bold text-brand-dark group-hover:text-brand-primary">{vendor.businessName}</h3>
          <p className="truncate text-xs text-gray-500">{vendor.restaurant.cuisineTags.join(" · ")}</p>
        </div>
        <Badge variant={status.isOpenNow ? "brand" : "dark"} className="shrink-0">
          {formatOpenStatusBadge(status)}
        </Badge>
      </Link>

      {matchingDishes.length > 0 && (
        <div className="mt-3 grid gap-1.5 border-t border-border-brand pt-3 sm:grid-cols-2">
          {matchingDishes.map((dish) => (
            <Link
              key={dish.id}
              href={`/restaurants/${vendor.slug}?item=${dish.id}`}
              prefetch={false}
              className="flex items-center gap-2.5 rounded-control p-1.5 hover:bg-brand-bg"
            >
              <ProductImage
                src={dish.imageUrl}
                alt={dish.name}
                categorySlug="restaurant"
                emoji="🍽️"
                className={`h-12 w-12 shrink-0 rounded-control ${dish.isAvailable ? "" : "grayscale opacity-60"}`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-brand-dark">{dish.name}</p>
                <p className="text-xs text-gray-600">{dish.isAvailable ? formatBDT(dish.price) : "Sold out"}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
