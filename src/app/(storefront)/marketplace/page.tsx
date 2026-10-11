import type { Metadata } from "next";
import { Section, Container } from "@/components/ui/container";
import { ProductCard } from "@/components/product/product-card";
import { MarketplaceFiltersForm } from "@/components/product/marketplace-filters";
import { Pagination } from "@/components/ui/pagination";
import { AdCarouselSection } from "@/components/ads/ad-carousel-section";
import { MarketplaceViewSwitch } from "@/components/shops/marketplace-view-switch";
import { HorizontalShopRail } from "@/components/shops/horizontal-shop-rail";
import { ShopCardCompact, ShopCardDeal, ShopCardGrid } from "@/components/shops/shop-card";
import { ShopsFiltersBar } from "@/components/shops/shops-filters-bar";
import { ShopsFiltersSheet } from "@/components/shops/shops-filters-sheet";
import { getMarketplaceProducts, getAllShoppableCategories } from "@/lib/catalog/queries";
import type { MarketplaceFilters } from "@/lib/catalog/queries";
import { getPopularShops, getShopsWithDeals, getAllShops } from "@/lib/shops/queries";
import type { ShopListFilters } from "@/lib/shops/queries";
import type { ShopType } from "@/generated/prisma/client";
import { isTobaccoModuleEnabled, matchesTobaccoSearchQuery } from "@/lib/tobacco/queries";
import { TobaccoSearchBanner } from "@/components/tobacco/search-banner";
import { getSelectedLocation } from "@/lib/location/cookie";

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Browse groceries, everyday essentials, household products, and personal care from Pick Up vendors in Khagrachari Sadar.",
};

type SearchParams = Record<string, string | string[] | undefined>;

function toStr(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function parseFilters(sp: SearchParams): MarketplaceFilters {
  const page = Number(toStr(sp.page) ?? "1");
  return {
    categorySlug: toStr(sp.category),
    q: toStr(sp.q),
    minPrice: toStr(sp.minPrice) ? Number(toStr(sp.minPrice)) : undefined,
    maxPrice: toStr(sp.maxPrice) ? Number(toStr(sp.maxPrice)) : undefined,
    minRating: toStr(sp.minRating) ? Number(toStr(sp.minRating)) : undefined,
    sort: (toStr(sp.sort) as MarketplaceFilters["sort"]) ?? "relevance",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function buildHref(filters: MarketplaceFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.categorySlug) params.set("category", filters.categorySlug);
  if (filters.q) params.set("q", filters.q);
  if (filters.minPrice != null) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice != null) params.set("maxPrice", String(filters.maxPrice));
  if (filters.minRating != null) params.set("minRating", String(filters.minRating));
  if (filters.sort) params.set("sort", filters.sort);
  params.set("page", String(page));
  return `/marketplace?${params.toString()}`;
}

const SHOP_TYPE_VALUES = new Set(["GROCERY", "FRESH_MARKET", "BAKERY", "PHARMACY", "CONVENIENCE", "HEALTH_BEAUTY", "ELECTRONICS", "HOME_GIFTS", "CLOTHING", "FLOWERS", "DRINKS", "OTHER"]);

function parseShopFilters(sp: SearchParams): ShopListFilters {
  const page = Number(toStr(sp.page) ?? "1");
  const shopTypeRaw = toStr(sp.shopType);
  const sortRaw = toStr(sp.sort);
  return {
    shopType: shopTypeRaw && SHOP_TYPE_VALUES.has(shopTypeRaw) ? (shopTypeRaw as ShopType) : undefined,
    hasOffers: toStr(sp.hasOffers) === "1",
    openNow: toStr(sp.openNow) === "1",
    sort: sortRaw === "nearest" || sortRaw === "az" ? sortRaw : "popular",
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: 20,
  };
}

function buildShopHref(filters: ShopListFilters, page: number): string {
  const params = new URLSearchParams();
  params.set("view", "shops");
  if (filters.shopType) params.set("shopType", filters.shopType);
  if (filters.hasOffers) params.set("hasOffers", "1");
  if (filters.openNow) params.set("openNow", "1");
  if (filters.sort) params.set("sort", filters.sort);
  params.set("page", String(page));
  return `/marketplace?${params.toString()}`;
}

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const view = toStr(sp.view) === "shops" ? "shops" : "products";

  if (view === "shops") {
    const shopFilters = parseShopFilters(sp);
    const selectedLocation = await getSelectedLocation();
    const eta = { etaMin: selectedLocation?.etaMin, etaMax: selectedLocation?.etaMax, deliveryFee: selectedLocation?.deliveryFee, isCovered: selectedLocation?.isCovered };
    const customerLatLng = selectedLocation?.lat != null && selectedLocation?.lng != null ? { lat: selectedLocation.lat, lng: selectedLocation.lng } : null;

    const [popularShops, dealShops, allShopsResult] = await Promise.all([
      getPopularShops(10),
      getShopsWithDeals(10),
      getAllShops(shopFilters, customerLatLng),
    ]);

    return (
      <>
        <Container className="pt-6">
          <AdCarouselSection placementCode="MARKETPLACE_TOP" className="mx-0" />
        </Container>
        <MarketplaceViewSwitch active="shops" baseQuery="" />

        <Container className="space-y-8 pb-10">
          {popularShops.length > 0 && (
            <section>
              <h2 className="mb-3 font-heading text-lg font-bold text-brand-dark sm:text-xl">Popular shops</h2>
              <HorizontalShopRail ariaLabel="Popular shops">
                {popularShops.map((shop) => (
                  <ShopCardCompact key={shop.id} shop={shop} eta={eta} />
                ))}
              </HorizontalShopRail>
            </section>
          )}

          {dealShops.length > 0 && (
            <section>
              <h2 className="mb-3 font-heading text-lg font-bold text-brand-dark sm:text-xl">Shops with deals</h2>
              <HorizontalShopRail ariaLabel="Shops with deals">
                {dealShops.map((shop) => (
                  <ShopCardDeal key={shop.id} shop={shop} eta={eta} />
                ))}
              </HorizontalShopRail>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-brand-dark sm:text-xl">All shops</h2>
              <span className="text-sm text-gray-500">{allShopsResult.total} shop{allShopsResult.total === 1 ? "" : "s"}</span>
            </div>
            <div className="mb-4 space-y-3">
              <ShopsFiltersSheet filters={shopFilters} />
              <ShopsFiltersBar filters={shopFilters} />
            </div>

            {allShopsResult.items.length === 0 ? (
              <div className="rounded-card border border-border-brand bg-white p-10 text-center">
                <p className="font-heading text-lg font-bold text-brand-dark">No shops match these filters</p>
                <p className="mt-1 text-sm text-gray-600">Try a different shop type or clear your filters.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                  {allShopsResult.items.map((shop) => (
                    <ShopCardGrid key={shop.id} shop={shop} eta={eta} />
                  ))}
                </div>
                <Pagination page={allShopsResult.page} totalPages={allShopsResult.totalPages} buildHref={(p) => buildShopHref(shopFilters, p)} />
              </>
            )}
          </section>
        </Container>
      </>
    );
  }

  const filters = parseFilters(sp);

  const [categories, result, showTobaccoBanner] = await Promise.all([
    getAllShoppableCategories(),
    getMarketplaceProducts(filters),
    filters.q && matchesTobaccoSearchQuery(filters.q) ? isTobaccoModuleEnabled() : Promise.resolve(false),
  ]);

  const activeCategory = categories.find((c) => c.slug === filters.categorySlug);

  return (
    <>
      <Container className="pt-6">
        <AdCarouselSection placementCode="MARKETPLACE_TOP" className="mx-0" />
      </Container>
      <MarketplaceViewSwitch active="products" baseQuery="" />
      <Section
        title={activeCategory ? activeCategory.name : filters.q ? `Search results for "${filters.q}"` : "Marketplace"}
        subtitle={`${result.total} product${result.total === 1 ? "" : "s"} available`}
      >
      <div className="mb-6">
        <MarketplaceFiltersForm categories={categories} filters={filters} />
      </div>

      {showTobaccoBanner && <TobaccoSearchBanner />}

      {result.items.length === 0 ? (
        <div className="rounded-card border border-border-brand bg-white p-10 text-center">
          <p className="font-heading text-lg font-bold text-brand-dark">No products found</p>
          <p className="mt-1 text-sm text-gray-600">Try adjusting your filters or search for something else.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {result.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Pagination page={result.page} totalPages={result.totalPages} buildHref={(p) => buildHref(filters, p)} />
        </>
      )}
      </Section>
    </>
  );
}
