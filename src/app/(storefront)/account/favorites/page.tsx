import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { RestaurantCard } from "@/components/restaurant/restaurant-card";
import { getCurrentUser } from "@/lib/auth/session";
import { getFavoriteVendors } from "@/lib/favorites/queries";

export const metadata: Metadata = { title: "Favorite shops" };

export default async function AccountFavoritesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const vendors = await getFavoriteVendors(user.id);
  const restaurants = vendors.filter((v) => v.restaurant);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-brand-dark">Favorite shops</h1>
      {restaurants.length === 0 ? (
        <div className="rounded-card border border-border-brand bg-white p-10 text-center">
          <Heart className="mx-auto h-10 w-10 text-gray-300" aria-hidden />
          <p className="mt-2 text-sm text-gray-600">Tap the heart on a restaurant to save it here for next time.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((vendor) => (
            <RestaurantCard key={vendor.id} vendor={vendor} isFavorited />
          ))}
        </div>
      )}
    </div>
  );
}
