import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { MAX_MENU_ITEM_PHOTOS } from "@/lib/validation/menu-item";
import { getRestaurantStatus } from "@/lib/restaurant/status";
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
        // Unavailable items stay visible (greyed out, "Sold out") rather
        // than vanishing — consistent with how out-of-stock grocery
        // products are shown, not hidden.
        include: {
          items: {
            where: { deletedAt: null },
            include: {
              addOnGroups: { include: { addOns: true } },
              // Existing items from before the 4->3 photo-limit cut may
              // still have more than MAX_MENU_ITEM_PHOTOS stored —
              // customers only ever see the first 3 (by sortOrder).
              photos: { orderBy: { sortOrder: "asc" }, take: MAX_MENU_ITEM_PHOTOS },
              suggestions: {
                orderBy: { sortOrder: "asc" },
                include: { suggestedItem: { select: { id: true, name: true, price: true, imageUrl: true, isAvailable: true } } },
              },
            },
          },
        },
      },
      reviews: { include: { customer: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
});

const MAX_MATCHING_DISHES_PER_RESTAURANT = 4;

/**
 * Restaurant search ("Search restaurants or dishes") — separate from
 * getRestaurantsList so the default, unsearched browse view (cuisine pills
 * + full unpaginated grid) is completely untouched. A vendor matches if its
 * own name matches, OR it has at least one matching dish; either way, only
 * the dishes that actually matched are returned under it (sold-out ones
 * last, capped per restaurant — the full menu is still one tap away on the
 * restaurant's own page).
 */
export async function searchRestaurantsAndDishes(q: string, opts: { page?: number; pageSize?: number } = {}) {
  const pageSize = opts.pageSize ?? 10;
  const page = Math.max(1, opts.page ?? 1);

  const dishMatch: Prisma.MenuItemWhereInput = {
    deletedAt: null,
    OR: [{ name: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }],
  };

  const where: Prisma.VendorWhereInput = {
    businessType: "RESTAURANT",
    ...activeVendorFilter,
    restaurant: { isNot: null },
    OR: [
      { businessName: { contains: q, mode: "insensitive" } },
      { restaurantMenus: { some: { items: { some: dishMatch } } } },
    ],
  };

  const all = await db.vendor.findMany({
    where,
    orderBy: { ratingAvg: "desc" },
    include: {
      restaurant: { include: { weeklyHours: true } },
      restaurantMenus: {
        where: { isActive: true },
        select: {
          items: {
            where: dishMatch,
            select: { id: true, name: true, price: true, imageUrl: true, isAvailable: true },
          },
        },
      },
    },
  });

  const total = all.length;
  const start = (page - 1) * pageSize;
  const pageVendors = all.slice(start, start + pageSize);

  const items = pageVendors.map((vendor) => {
    const dishes = vendor.restaurantMenus.flatMap((m) => m.items);
    // Stable sort: available first, sold-out last.
    dishes.sort((a, b) => Number(!a.isAvailable) - Number(!b.isAvailable));
    return {
      vendor,
      status: getRestaurantStatus(vendor.restaurant!),
      matchingDishes: dishes.slice(0, MAX_MATCHING_DISHES_PER_RESTAURANT).map((d) => ({
        id: d.id,
        name: d.name,
        price: d.price.toString(),
        imageUrl: d.imageUrl,
        isAvailable: d.isAvailable,
      })),
    };
  });

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export const listCuisines = cache(async (): Promise<string[]> => {
  const restaurants = await db.restaurant.findMany({ select: { cuisineTags: true } });
  const set = new Set<string>();
  for (const r of restaurants) for (const tag of r.cuisineTags) set.add(tag);
  return Array.from(set).sort();
});
