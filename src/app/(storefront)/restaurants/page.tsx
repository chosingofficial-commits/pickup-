import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Section } from "@/components/ui/container";
import { RestaurantCard } from "@/components/restaurant/restaurant-card";
import { RestaurantSearchResultCard } from "@/components/restaurant/restaurant-search-result-card";
import { SearchBox } from "@/components/search/search-box";
import { Pagination } from "@/components/ui/pagination";
import { getRestaurantsList, listCuisines, searchRestaurantsAndDishes } from "@/lib/restaurant/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { getFavoritedVendorIds } from "@/lib/favorites/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Restaurants",
  description: "Order Bangla food, biriyani, fast food, Chinese, bakery, and more from restaurants in Khagrachari Sadar.",
};

function SearchBoxFallback() {
  return <div className="h-11 rounded-control border border-border-brand bg-white" />;
}

function buildSearchHref(q: string, page: number): string {
  const params = new URLSearchParams({ q, page: String(page) });
  return `/restaurants?${params.toString()}`;
}

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<{ cuisine?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim();
  const userPromise = getCurrentUser();

  if (q) {
    const page = Number(sp.page ?? "1");
    // No favorite button on the compact search-result card (name, photo,
    // price per spec) — skip fetching favorites in this branch entirely.
    const searchResult = await searchRestaurantsAndDishes(q, { page: Number.isFinite(page) && page > 0 ? page : 1 });

    return (
      <Section title="Restaurants" subtitle={`${searchResult.total} result${searchResult.total === 1 ? "" : "s"} for "${q}"`}>
        <div className="sticky top-[60px] z-10 mb-6 bg-white py-2 sm:static sm:bg-transparent sm:py-0">
          <Suspense fallback={<SearchBoxFallback />}>
            <SearchBox placeholder="Search restaurants or dishes" />
          </Suspense>
        </div>

        {searchResult.items.length === 0 ? (
          <div className="rounded-card border border-border-brand bg-white p-10 text-center">
            <p className="font-heading text-lg font-bold text-brand-dark">No restaurants or dishes found for &quot;{q}&quot;</p>
            <p className="mt-1 text-sm text-gray-600">Try another word.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {searchResult.items.map((result) => (
                <RestaurantSearchResultCard key={result.vendor.id} result={result} />
              ))}
            </div>
            <Pagination page={searchResult.page} totalPages={searchResult.totalPages} buildHref={(p) => buildSearchHref(q, p)} />
          </>
        )}
      </Section>
    );
  }

  const [restaurants, cuisines, favoritedVendorIds] = await Promise.all([
    getRestaurantsList(sp),
    listCuisines(),
    userPromise.then((user) => (user ? getFavoritedVendorIds(user.id) : new Set<string>())),
  ]);

  return (
    <Section title="Restaurants" subtitle={`${restaurants.length} restaurant${restaurants.length === 1 ? "" : "s"} in Khagrachari Sadar`}>
      <div className="sticky top-[60px] z-10 mb-6 bg-white py-2 sm:static sm:bg-transparent sm:py-0">
        <Suspense fallback={<SearchBoxFallback />}>
          <SearchBox placeholder="Search restaurants or dishes" />
        </Suspense>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/restaurants"
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-sm font-medium",
            !sp.cuisine ? "border-brand-primary bg-brand-primary text-white" : "border-border-brand text-brand-dark hover:bg-brand-bg",
          )}
        >
          All cuisines
        </Link>
        {cuisines.map((cuisine) => (
          <Link
            key={cuisine}
            href={`/restaurants?cuisine=${encodeURIComponent(cuisine)}`}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium",
              sp.cuisine === cuisine
                ? "border-brand-primary bg-brand-primary text-white"
                : "border-border-brand text-brand-dark hover:bg-brand-bg",
            )}
          >
            {cuisine}
          </Link>
        ))}
      </div>

      {restaurants.length === 0 ? (
        <div className="rounded-card border border-border-brand bg-white p-10 text-center">
          <p className="font-heading text-lg font-bold text-brand-dark">No restaurants found</p>
          <p className="mt-1 text-sm text-gray-600">Try a different cuisine filter.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((vendor) => (
            <RestaurantCard key={vendor.id} vendor={vendor} isFavorited={favoritedVendorIds.has(vendor.id)} />
          ))}
        </div>
      )}
    </Section>
  );
}
