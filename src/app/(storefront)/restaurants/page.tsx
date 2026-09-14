import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/container";
import { RestaurantCard } from "@/components/restaurant/restaurant-card";
import { getRestaurantsList, listCuisines } from "@/lib/restaurant/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { getFavoritedVendorIds } from "@/lib/favorites/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Restaurants",
  description: "Order Bangla food, biriyani, fast food, Chinese, bakery, and more from restaurants in Khagrachari Sadar.",
};

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<{ cuisine?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const [restaurants, cuisines, favoritedVendorIds] = await Promise.all([
    getRestaurantsList(sp),
    listCuisines(),
    user ? getFavoritedVendorIds(user.id) : Promise.resolve(new Set<string>()),
  ]);

  return (
    <Section title="Restaurants" subtitle={`${restaurants.length} restaurant${restaurants.length === 1 ? "" : "s"} in Khagrachari Sadar`}>
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
