import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Star, Clock, Bike, MapPin } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/product/product-image";
import { MenuItemCard } from "@/components/restaurant/menu-item-card";
import { FavoriteVendorButton } from "@/components/restaurant/favorite-vendor-button";
import { VendorLogo } from "@/components/vendor/vendor-logo";
import { JsonLd } from "@/components/seo/json-ld";
import { getRestaurantBySlug } from "@/lib/restaurant/queries";
import { getRestaurantStatus } from "@/lib/restaurant/status";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ vendorSlug: string }> }): Promise<Metadata> {
  const { vendorSlug } = await params;
  const vendor = await getRestaurantBySlug(vendorSlug);
  if (!vendor) return {};
  return { title: vendor.businessName, description: vendor.description ?? undefined };
}

export default async function RestaurantMenuPage({ params }: { params: Promise<{ vendorSlug: string }> }) {
  const { vendorSlug } = await params;
  const vendor = await getRestaurantBySlug(vendorSlug);
  if (!vendor || !vendor.restaurant) notFound();

  const status = getRestaurantStatus(vendor.restaurant);
  const canOrder = status.isOpenNow || status.canAcceptScheduledOrders;

  const user = await getCurrentUser();
  const isFavorited = user
    ? !!(await db.favoriteVendor.findUnique({ where: { userId_vendorId: { userId: user.id, vendorId: vendor.id } } }))
    : false;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Restaurant",
          name: vendor.businessName,
          description: vendor.description ?? undefined,
          image: vendor.coverImageUrl ?? undefined,
          servesCuisine: vendor.restaurant.cuisineTags,
          address: { "@type": "PostalAddress", streetAddress: vendor.addressText, addressLocality: "Khagrachari Sadar", addressCountry: "BD" },
          aggregateRating:
            vendor.ratingCount > 0 ? { "@type": "AggregateRating", ratingValue: Number(vendor.ratingAvg), reviewCount: vendor.ratingCount } : undefined,
          priceRange: "TkTk",
        }}
      />
      <div className="relative aspect-[3/1] w-full sm:aspect-[4/1]">
        <ProductImage src={vendor.coverImageUrl} alt={vendor.businessName} categorySlug="restaurant" className="h-full w-full" />
      </div>

      <Container className="py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <VendorLogo logoUrl={vendor.logoUrl} businessName={vendor.businessName} size={56} className="-mt-10" />
            <div>
              <h1 className="font-heading text-2xl font-bold text-brand-dark sm:text-3xl">{vendor.businessName}</h1>
              <p className="mt-1 text-sm text-gray-600">{vendor.restaurant.cuisineTags.join(" · ")}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                {vendor.ratingCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
                    {Number(vendor.ratingAvg).toFixed(1)} ({vendor.ratingCount})
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" aria-hidden />
                  {vendor.restaurant.preparationTimeMinutes} min prep
                </span>
                <span className="flex items-center gap-1">
                  <Bike className="h-4 w-4" aria-hidden />
                  Min order {formatBDT(vendor.restaurant.minimumOrderAmount)}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" aria-hidden />
                  {vendor.addressText}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FavoriteVendorButton vendorId={vendor.id} isFavorited={isFavorited} className="border border-border-brand" />
            <Badge variant={status.isOpenNow ? "brand" : "dark"} className="text-sm">
              {status.isOpenNow
                ? "Open now"
                : status.nextOpen
                  ? `Closed · Opens ${status.nextOpen.label} at ${status.nextOpen.time}`
                  : status.reason === "manually_closed"
                    ? "Closed"
                    : status.reason === "temporarily_closed"
                      ? "Temporarily closed"
                      : "Closed"}
            </Badge>
          </div>
        </div>

        {!status.isOpenNow && (
          <p className="mt-3 rounded-control bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {status.canAcceptScheduledOrders
              ? "This restaurant is closed right now, but accepts scheduled orders — you can order and choose a delivery time at checkout."
              : "This restaurant is closed right now and is not accepting orders."}
          </p>
        )}

        <div className="mt-8 space-y-8">
          {vendor.restaurantMenus.map((menu) => (
            <div key={menu.id}>
              <h2 className="font-heading text-xl font-bold text-brand-dark">{menu.name}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {menu.items.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    canOrder={canOrder}
                    item={{
                      id: item.id,
                      name: item.name,
                      description: item.description,
                      price: item.price.toString(),
                      compareAtPrice: item.compareAtPrice?.toString() ?? null,
                      imageUrl: item.imageUrl,
                      isAvailable: item.isAvailable,
                      allowsInstructions: item.allowsInstructions,
                      addOnGroups: item.addOnGroups.map((group) => ({
                        id: group.id,
                        name: group.name,
                        isRequired: group.isRequired,
                        maxSelect: group.maxSelect,
                        addOns: group.addOns.map((addOn) => ({
                          id: addOn.id,
                          name: addOn.name,
                          priceDelta: addOn.priceDelta.toString(),
                        })),
                      })),
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {vendor.reviews.length > 0 && (
          <div className="mt-10">
            <h2 className="font-heading text-xl font-bold text-brand-dark">Ratings & reviews</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {vendor.reviews.map((review) => (
                <div key={review.id} className="rounded-card border border-border-brand bg-white p-4">
                  <div className="flex items-center gap-0.5" aria-hidden>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                    ))}
                  </div>
                  {review.comment && <p className="mt-2 text-sm text-gray-700">{review.comment}</p>}
                  <p className="mt-2 text-xs font-semibold text-brand-dark">{review.customer.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Container>
    </>
  );
}
