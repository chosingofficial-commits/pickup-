import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { getDaysAgoDhakaMidnight } from "@/lib/date/period";
import { getFreeDeliveryPromoSettings } from "@/lib/promotions/free-delivery";
import { getRestaurantStatus, type RestaurantStatus } from "@/lib/restaurant/status";
import type { Prisma, ShopType } from "@/generated/prisma/client";

/**
 * "Shops" = grocery/essentials vendors only. Restaurants keep their own
 * /restaurants directory and are never listed or counted here.
 */
const activeShopFilter = {
  businessType: "GROCERY_VENDOR" as const,
  isApproved: true,
  isSuspended: false,
  deletedAt: null,
} as const;

// A tobacco-only shop must never be "Popular" or shown as having a "Deal" —
// no promotion anywhere for age-restricted products, full stop. Coupons are
// never created for a tobacco-only shop in practice, and such a shop is
// extremely unlikely to rank by order volume either, but this guards both
// rails structurally rather than relying on that. Not applied to the "All
// shops" directory, which is a neutral listing customers can browse
// directly (same as /cigarettes itself is reachable without being promoted).
const hasPromotableCatalog = {
  products: { some: { isAgeRestricted: false, isPublished: true, deletedAt: null } },
} as const;

const SHOP_CARD_SELECT = {
  id: true,
  slug: true,
  businessName: true,
  shopType: true,
  logoUrl: true,
  coverImageUrl: true,
  lat: true,
  lng: true,
  ratingAvg: true,
  ratingCount: true,
  createdAt: true,
  isManuallyClosed: true,
  temporaryClosureUntil: true,
  scheduledOrderingEnabled: true,
  weeklyHours: true,
} as const;

type ShopCardRow = Prisma.VendorGetPayload<{ select: typeof SHOP_CARD_SELECT }>;
export type ShopCardData = Omit<ShopCardRow, "isManuallyClosed" | "temporaryClosureUntil" | "scheduledOrderingEnabled" | "weeklyHours"> & {
  status: RestaurantStatus;
};

export type ShopOffer = { kind: "coupon" | "discount" | "freeDelivery"; label: string };
export type ShopWithOffers = ShopCardData & { offers: ShopOffer[] };

/** Strips the raw hours fields down to a computed `status`, so every shop-card component works off the same RestaurantStatus shape restaurants use. */
function withShopStatus(row: ShopCardRow): ShopCardData {
  const { isManuallyClosed, temporaryClosureUntil, scheduledOrderingEnabled, weeklyHours, ...rest } = row;
  return { ...rest, status: getRestaurantStatus({ isManuallyClosed, temporaryClosureUntil, scheduledOrderingEnabled, weeklyHours }) };
}

/** Popular = most DELIVERED orders in the last 30 days (Asia/Dhaka), falling back to newest shops when there isn't enough order history yet. */
export async function getPopularShops(limit = 10): Promise<ShopCardData[]> {
  const since = getDaysAgoDhakaMidnight(30);
  const grouped = await db.order.groupBy({
    by: ["vendorId"],
    where: { status: "DELIVERED", createdAt: { gte: since }, vendor: { ...activeShopFilter, ...hasPromotableCatalog } },
    _count: { vendorId: true },
    orderBy: { _count: { vendorId: "desc" } },
    take: limit,
  });

  const rankedIds = grouped.map((g) => g.vendorId);
  const ranked = rankedIds.length > 0 ? await db.vendor.findMany({ where: { id: { in: rankedIds } }, select: SHOP_CARD_SELECT }) : [];
  // findMany({ where: { id: { in } } }) doesn't preserve the `in` array's
  // order, so re-sort by the actual order-count ranking.
  const byId = new Map(ranked.map((v) => [v.id, v]));
  const orderedRanked = rankedIds.map((id) => byId.get(id)).filter((v): v is ShopCardRow => !!v);

  if (orderedRanked.length >= limit) return orderedRanked.map(withShopStatus);

  const fillers = await db.vendor.findMany({
    where: { ...activeShopFilter, ...hasPromotableCatalog, id: { notIn: rankedIds } },
    orderBy: { createdAt: "desc" },
    take: limit - orderedRanked.length,
    select: SHOP_CARD_SELECT,
  });
  return [...orderedRanked, ...fillers].map(withShopStatus);
}

/**
 * Computes each vendor's offer badges: an active vendor-scoped coupon, the
 * best live product discount (compareAtPrice vs price), and — informational,
 * identical for every shop — whether the sitewide free-delivery-on-all-orders
 * promo is currently on.
 */
async function computeOffersForVendors(vendorIds: string[], freeDeliveryActive: boolean): Promise<Map<string, ShopOffer[]>> {
  const map = new Map<string, ShopOffer[]>(vendorIds.map((id) => [id, []]));
  if (vendorIds.length === 0) return map;

  const now = new Date();
  const [coupons, discountedProducts] = await Promise.all([
    db.coupon.findMany({
      where: { vendorId: { in: vendorIds }, isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      select: { vendorId: true, type: true, value: true },
    }),
    db.product.findMany({
      where: { vendorId: { in: vendorIds }, isPublished: true, deletedAt: null, isAgeRestricted: false, compareAtPrice: { not: null } },
      select: { vendorId: true, price: true, compareAtPrice: true },
    }),
  ]);

  for (const c of coupons) {
    if (!c.vendorId) continue;
    const label = c.type === "PERCENTAGE" ? `${Number(c.value)}% off with code` : `Tk ${Number(c.value)} off with code`;
    map.get(c.vendorId)?.push({ kind: "coupon", label });
  }

  const maxDiscountPctByVendor = new Map<string, number>();
  for (const p of discountedProducts) {
    if (!p.compareAtPrice) continue;
    const pct = Math.round((1 - Number(p.price) / Number(p.compareAtPrice)) * 100);
    if (pct <= 0) continue;
    maxDiscountPctByVendor.set(p.vendorId, Math.max(maxDiscountPctByVendor.get(p.vendorId) ?? 0, pct));
  }
  for (const [vendorId, pct] of maxDiscountPctByVendor) {
    map.get(vendorId)?.unshift({ kind: "discount", label: `Up to ${pct}% off` });
  }

  if (freeDeliveryActive) {
    for (const id of vendorIds) map.get(id)?.push({ kind: "freeDelivery", label: "Free delivery" });
  }

  return map;
}

/** Shops with at least one active vendor-scoped coupon or a live product discount. Free delivery alone never qualifies a shop for this row — it's sitewide, so it doesn't distinguish one shop from another. */
export async function getShopsWithDeals(limit = 10): Promise<ShopWithOffers[]> {
  const now = new Date();
  const [couponVendors, discountVendors, freeDeliverySettings] = await Promise.all([
    db.coupon.findMany({
      where: { vendorId: { not: null }, isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      select: { vendorId: true },
      distinct: ["vendorId"],
    }),
    db.product.findMany({
      where: { isPublished: true, deletedAt: null, isAgeRestricted: false, compareAtPrice: { not: null }, vendor: { ...activeShopFilter, ...hasPromotableCatalog } },
      select: { vendorId: true },
      distinct: ["vendorId"],
    }),
    getFreeDeliveryPromoSettings(),
  ]);

  const candidateIds = Array.from(new Set([...couponVendors.map((c) => c.vendorId!), ...discountVendors.map((d) => d.vendorId)]));
  if (candidateIds.length === 0) return [];

  const vendors = await db.vendor.findMany({
    where: { id: { in: candidateIds }, ...activeShopFilter, ...hasPromotableCatalog },
    orderBy: { ratingAvg: "desc" },
    take: limit,
    select: SHOP_CARD_SELECT,
  });

  const offersMap = await computeOffersForVendors(vendors.map((v) => v.id), freeDeliverySettings.allOrders.enabled);
  return vendors.map((v) => ({ ...withShopStatus(v), offers: offersMap.get(v.id) ?? [] }));
}

function haversineKm(a: { lat: number; lng: number }, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - a.lat);
  const dLng = toRad(bLng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export type ShopSort = "popular" | "nearest" | "az";

export type ShopListFilters = {
  shopType?: ShopType;
  hasOffers?: boolean;
  openNow?: boolean;
  q?: string;
  sort?: ShopSort;
  page?: number;
  pageSize?: number;
};

export type ShopListResult = {
  items: ShopWithOffers[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * All active, approved grocery shops, with offer badges attached, filtered
 * and sorted in-app after one query — none of "has an offer", "popular (by
 * recent order count)", or "nearest" are plain sortable/filterable Prisma
 * columns. Fine at this app's scale (a single-city vendor directory, not
 * millions of rows).
 */
export async function getAllShops(filters: ShopListFilters, customerLatLng?: { lat: number; lng: number } | null): Promise<ShopListResult> {
  const pageSize = filters.pageSize ?? 20;
  const page = Math.max(1, filters.page ?? 1);

  const where: Prisma.VendorWhereInput = {
    ...activeShopFilter,
    ...(filters.shopType ? { shopType: filters.shopType } : {}),
    ...(filters.q ? { businessName: { contains: filters.q, mode: "insensitive" } } : {}),
  };

  const all = await db.vendor.findMany({ where, select: SHOP_CARD_SELECT });
  if (all.length === 0) return { items: [], total: 0, page, pageSize, totalPages: 1 };

  const freeDeliverySettings = await getFreeDeliveryPromoSettings();
  const offersMap = await computeOffersForVendors(
    all.map((v) => v.id),
    freeDeliverySettings.allOrders.enabled,
  );

  let candidates: ShopWithOffers[] = all.map((v) => ({ ...withShopStatus(v), offers: offersMap.get(v.id) ?? [] }));
  if (filters.hasOffers) candidates = candidates.filter((v) => v.offers.some((o) => o.kind !== "freeDelivery"));
  if (filters.openNow) candidates = candidates.filter((v) => v.status.isOpenNow);

  if (filters.sort === "popular") {
    const since = getDaysAgoDhakaMidnight(30);
    const grouped = await db.order.groupBy({
      by: ["vendorId"],
      where: { status: "DELIVERED", createdAt: { gte: since }, vendorId: { in: candidates.map((c) => c.id) } },
      _count: { vendorId: true },
    });
    const countMap = new Map(grouped.map((g) => [g.vendorId, g._count.vendorId]));
    candidates = [...candidates].sort((a, b) => (countMap.get(b.id) ?? 0) - (countMap.get(a.id) ?? 0));
  } else if (filters.sort === "nearest" && customerLatLng) {
    candidates = [...candidates].sort((a, b) => {
      const da = a.lat != null && a.lng != null ? haversineKm(customerLatLng, Number(a.lat), Number(a.lng)) : Infinity;
      const db_ = b.lat != null && b.lng != null ? haversineKm(customerLatLng, Number(b.lat), Number(b.lng)) : Infinity;
      return da - db_;
    });
  } else if (filters.sort === "az") {
    candidates = [...candidates].sort((a, b) => a.businessName.localeCompare(b.businessName));
  } else {
    candidates = [...candidates].sort((a, b) => Number(b.ratingAvg) - Number(a.ratingAvg));
  }

  const total = candidates.length;
  const start = (page - 1) * pageSize;
  const items = candidates.slice(start, start + pageSize);
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export const getShopTypeCounts = cache(async (): Promise<Partial<Record<ShopType, number>>> => {
  const grouped = await db.vendor.groupBy({
    by: ["shopType"],
    where: { ...activeShopFilter, shopType: { not: null } },
    _count: { shopType: true },
  });
  const counts: Partial<Record<ShopType, number>> = {};
  for (const g of grouped) {
    if (g.shopType) counts[g.shopType] = g._count.shopType;
  }
  return counts;
});
