import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

const activeVendorFilter = { isApproved: true, isSuspended: false, deletedAt: null } as const;

const restaurantInclude = {
  restaurant: { include: { weeklyHours: true } },
} satisfies Prisma.VendorInclude;

export const getPopularRestaurants = unstable_cache(
  async (limit = 8) => {
    return db.vendor.findMany({
      where: { businessType: "RESTAURANT", ...activeVendorFilter, restaurant: { isNot: null } },
      orderBy: [{ ratingAvg: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: restaurantInclude,
    });
  },
  ["popular-restaurants"],
  { revalidate: 300, tags: ["restaurants"] },
);

export type RestaurantListFilters = { cuisine?: string; q?: string };

export async function getRestaurantsList(filters: RestaurantListFilters = {}) {
  const where: Prisma.VendorWhereInput = {
    businessType: "RESTAURANT",
    ...activeVendorFilter,
    restaurant: {
      isNot: null,
      ...(filters.cuisine ? { is: { cuisineTags: { has: filters.cuisine } } } : {}),
    },
    ...(filters.q ? { businessName: { contains: filters.q, mode: "insensitive" } } : {}),
  };

  return db.vendor.findMany({ where, orderBy: { ratingAvg: "desc" }, include: restaurantInclude });
}

export const getRestaurantBySlug = cache(async (slug: string) => {
  return db.vendor.findFirst({
    where: { slug, businessType: "RESTAURANT", ...activeVendorFilter },
    include: {
      restaurant: { include: { weeklyHours: true } },
      restaurantMenus: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: { items: { where: { isAvailable: true }, include: { addOnGroups: { include: { addOns: true } } } } },
      },
      reviews: { include: { customer: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
});

export const listCuisines = cache(async (): Promise<string[]> => {
  const restaurants = await db.restaurant.findMany({ select: { cuisineTags: true } });
  const set = new Set<string>();
  for (const r of restaurants) for (const tag of r.cuisineTags) set.add(tag);
  return Array.from(set).sort();
});
