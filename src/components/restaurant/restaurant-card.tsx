import Link from "next/link";
import { Star, Clock, Bike } from "lucide-react";
import { ProductImage } from "@/components/product/product-image";
import { Badge } from "@/components/ui/badge";
import { FavoriteVendorButton } from "@/components/restaurant/favorite-vendor-button";
import { formatBDT } from "@/lib/utils";
import { getRestaurantStatus } from "@/lib/restaurant/status";
import type { Vendor, Restaurant, RestaurantWeeklyHours } from "@/generated/prisma/client";

type RestaurantCardVendor = Vendor & { restaurant: (Restaurant & { weeklyHours: RestaurantWeeklyHours[] }) | null };

export function RestaurantCard({ vendor, isFavorited }: { vendor: RestaurantCardVendor; isFavorited?: boolean }) {
  if (!vendor.restaurant) return null;
  const status = getRestaurantStatus(vendor.restaurant);
  const href = `/restaurants/${vendor.slug}`;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-card border border-border-brand bg-white shadow-soft transition-shadow hover:shadow-lifted">
      <Link href={href} prefetch={false} className="flex flex-1 flex-col">
        <div className="relative aspect-[16/9]">
          <ProductImage src={vendor.coverImageUrl} alt={vendor.businessName} categorySlug="restaurant" className="h-full w-full" />
          <div className="absolute left-2 top-2">
            <Badge variant={status.isOpenNow ? "brand" : "dark"}>{status.isOpenNow ? "Open now" : "Closed"}</Badge>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-3.5">
          <h3 className="font-heading text-base font-bold text-brand-dark group-hover:text-brand-primary">{vendor.businessName}</h3>
          <p className="line-clamp-1 text-xs text-gray-500">{vendor.restaurant.cuisineTags.join(" · ")}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
            {vendor.ratingCount > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
                {Number(vendor.ratingAvg).toFixed(1)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {vendor.restaurant.preparationTimeMinutes} min prep
            </span>
            <span className="flex items-center gap-1">
              <Bike className="h-3.5 w-3.5" aria-hidden />
              Min {formatBDT(vendor.restaurant.minimumOrderAmount)}
            </span>
          </div>
        </div>
      </Link>
      <FavoriteVendorButton vendorId={vendor.id} isFavorited={isFavorited} className="absolute right-2 top-2" />
    </div>
  );
}
