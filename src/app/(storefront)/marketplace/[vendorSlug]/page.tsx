import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Search, Clock, Bike } from "lucide-react";
import { Container } from "@/components/ui/container";
import { ProductImage } from "@/components/product/product-image";
import { ProductCard } from "@/components/product/product-card";
import { VendorLogo } from "@/components/vendor/vendor-logo";
import { FavoriteVendorButton } from "@/components/restaurant/favorite-vendor-button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { getVendorBySlug, getMarketplaceProducts } from "@/lib/catalog/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { getSelectedLocation } from "@/lib/location/cookie";
import { getRestaurantStatus, formatOpenStatusBadge } from "@/lib/restaurant/status";
import { db } from "@/lib/db";
import { SHOP_TYPE_LABELS, formatEtaRange } from "@/lib/shops/shop-type";

export async function generateMetadata({ params }: { params: Promise<{ vendorSlug: string }> }): Promise<Metadata> {
  const { vendorSlug } = await params;
  const vendor = await getVendorBySlug(vendorSlug);
  if (!vendor || vendor.businessType !== "GROCERY_VENDOR") return {};
  return { title: vendor.businessName, description: vendor.description ?? undefined };
}

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ vendorSlug: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { vendorSlug } = await params;
  const vendor = await getVendorBySlug(vendorSlug);
  // Restaurants have their own page at /restaurants/[vendorSlug] — a
  // restaurant slug landing here (e.g. an old link) 404s rather than
  // silently rendering a second, product-grid-shaped page for it.
  if (!vendor || vendor.businessType !== "GROCERY_VENDOR") notFound();

  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const page = Number(sp.page ?? "1");

  const [user, selectedLocation, result] = await Promise.all([
    getCurrentUser(),
    getSelectedLocation(),
    getMarketplaceProducts({ vendorSlug: vendor.slug, q, sort: "relevance", page: Number.isFinite(page) && page > 0 ? page : 1 }),
  ]);
  const isFavorited = user
    ? !!(await db.favoriteVendor.findUnique({ where: { userId_vendorId: { userId: user.id, vendorId: vendor.id } } }))
    : false;
  const etaLabel = formatEtaRange(selectedLocation?.etaMin, selectedLocation?.etaMax);
  const status = getRestaurantStatus(vendor);

  const qParam = q ? `&q=${encodeURIComponent(q)}` : "";

  return (
    <>
      <div className="relative aspect-[3/1] w-full sm:aspect-[4/1]">
        <ProductImage src={vendor.coverImageUrl} alt={vendor.businessName} categorySlug="vendor" className="h-full w-full" />
      </div>

      <Container className="py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <VendorLogo logoUrl={vendor.logoUrl} coverImageUrl={vendor.coverImageUrl} businessName={vendor.businessName} size={56} className="-mt-10 text-xl" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-2xl font-bold text-brand-dark sm:text-3xl">{vendor.businessName}</h1>
                <Badge variant={status.isOpenNow ? "brand" : "dark"}>{formatOpenStatusBadge(status)}</Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                {vendor.shopType && <span>{SHOP_TYPE_LABELS[vendor.shopType]}</span>}
                {etaLabel && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" aria-hidden />
                    {etaLabel}
                  </span>
                )}
                {selectedLocation?.isCovered && selectedLocation.deliveryFee != null && (
                  <span className="flex items-center gap-1">
                    <Bike className="h-4 w-4" aria-hidden />
                    {Number(selectedLocation.deliveryFee) === 0 ? "Free delivery" : `Tk ${selectedLocation.deliveryFee} delivery`}
                  </span>
                )}
              </div>
            </div>
          </div>
          <FavoriteVendorButton vendorId={vendor.id} isFavorited={isFavorited} />
        </div>

        {!status.isOpenNow && (
          <p className="mt-3 rounded-control bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {status.canAcceptScheduledOrders
              ? "This shop is closed right now, but accepts scheduled orders — you can order and it'll be delivered once they reopen."
              : "This shop is closed right now and is not accepting orders."}
          </p>
        )}

        {/* Sticky on mobile so it stays reachable while scrolling a long catalog. */}
        <form method="GET" className="sticky top-[60px] z-10 mt-5 bg-white py-2 sm:static sm:bg-transparent sm:py-0">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder={`Search in ${vendor.businessName}`}
              className="h-11 w-full rounded-control border border-border-brand bg-white pl-10 pr-3.5 text-sm text-brand-dark placeholder:text-gray-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            />
          </div>
        </form>

        {result.items.length === 0 ? (
          <div className="mt-6 rounded-card border border-border-brand bg-white p-10 text-center">
            <p className="font-heading text-lg font-bold text-brand-dark">{q ? "No products match your search" : "This shop has no products yet"}</p>
            {q && <p className="mt-1 text-sm text-gray-600">Try a different search term.</p>}
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {result.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              buildHref={(p) => `/marketplace/${vendor.slug}?page=${p}${qParam}`}
            />
          </>
        )}
      </Container>
    </>
  );
}
