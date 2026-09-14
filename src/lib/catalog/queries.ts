import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Every general-purpose catalog query below excludes age-restricted
 * products and categories by default. The tobacco module has its own
 * gated query path (see src/lib/tobacco) — it must never surface here,
 * per the "no promotion/recommendation for restricted products" rule.
 */
const NOT_AGE_RESTRICTED = { isAgeRestricted: false } as const;

// Homepage rails below are identical for every visitor and change only when
// an admin/vendor publishes something — cached across requests for a short
// window instead of re-querying on every single page view.
const CATALOG_CACHE_SECONDS = 300;

export const getShopCategories = unstable_cache(
  async () => {
    return db.category.findMany({
      where: { parentId: null, isActive: true, ...NOT_AGE_RESTRICTED },
      orderBy: { sortOrder: "asc" },
      include: { children: { where: { isActive: true, ...NOT_AGE_RESTRICTED }, orderBy: { name: "asc" } } },
    });
  },
  ["shop-categories"],
  { revalidate: CATALOG_CACHE_SECONDS, tags: ["categories"] },
);

export const getCategoryBySlug = cache(async (slug: string) => {
  return db.category.findUnique({ where: { slug }, include: { parent: true, children: true } });
});

export const getAllShoppableCategories = cache(async () => {
  return db.category.findMany({
    where: { isActive: true, ...NOT_AGE_RESTRICTED },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
});

const activeVendorFilter = { isApproved: true, isSuspended: false, deletedAt: null } as const;

export const getPopularProducts = unstable_cache(
  async (limit = 10) => {
    return db.product.findMany({
      where: {
        isPublished: true,
        deletedAt: null,
        ...NOT_AGE_RESTRICTED,
        category: { isActive: true, ...NOT_AGE_RESTRICTED },
        vendor: activeVendorFilter,
      },
      orderBy: [{ ratingAvg: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: { images: { take: 1 }, category: true, vendor: { select: { businessName: true, slug: true } } },
    });
  },
  ["popular-products"],
  { revalidate: CATALOG_CACHE_SECONDS, tags: ["products"] },
);

export const getWeeklyGroceryPicks = unstable_cache(
  async (limit = 10) => {
    return db.product.findMany({
      where: {
        isPublished: true,
        deletedAt: null,
        isWeeklyGrocery: true,
        ...NOT_AGE_RESTRICTED,
        category: { isActive: true, ...NOT_AGE_RESTRICTED },
        vendor: activeVendorFilter,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { images: { take: 1 }, category: true, vendor: { select: { businessName: true, slug: true } } },
    });
  },
  ["weekly-grocery-picks"],
  { revalidate: CATALOG_CACHE_SECONDS, tags: ["products"] },
);

export const getFlashDeals = unstable_cache(
  async (limit = 10) => {
    return db.product.findMany({
      where: {
        isPublished: true,
        deletedAt: null,
        ...NOT_AGE_RESTRICTED,
        compareAtPrice: { not: null },
        category: { isActive: true, ...NOT_AGE_RESTRICTED },
        vendor: activeVendorFilter,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { images: { take: 1 }, category: true, vendor: { select: { businessName: true, slug: true } } },
    });
  },
  ["flash-deals"],
  { revalidate: CATALOG_CACHE_SECONDS, tags: ["products"] },
);

export type ProductListItem = Prisma.ProductGetPayload<{
  include: { images: { take: 1 }; category: true; vendor: { select: { businessName: true; slug: true } } };
}>;

export type MarketplaceFilters = {
  categorySlug?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  vendorSlug?: string;
  availability?: "AVAILABLE" | "ALL";
  sort?: "relevance" | "price_asc" | "price_desc" | "popularity" | "rating" | "newest";
  page?: number;
  pageSize?: number;
};

export async function getMarketplaceProducts(filters: MarketplaceFilters) {
  const pageSize = filters.pageSize ?? 20;
  const page = Math.max(1, filters.page ?? 1);

  const categoryFilter: Prisma.CategoryWhereInput = {
    isActive: true,
    ...NOT_AGE_RESTRICTED,
    ...(filters.categorySlug ? { OR: [{ slug: filters.categorySlug }, { parent: { slug: filters.categorySlug } }] } : {}),
  };

  const vendorFilter: Prisma.VendorWhereInput = {
    ...activeVendorFilter,
    ...(filters.vendorSlug ? { slug: filters.vendorSlug } : {}),
  };

  const where: Prisma.ProductWhereInput = {
    isPublished: true,
    deletedAt: null,
    ...NOT_AGE_RESTRICTED,
    category: categoryFilter,
    vendor: vendorFilter,
    ...(filters.q ? { name: { contains: filters.q, mode: "insensitive" } } : {}),
    ...(filters.minPrice != null || filters.maxPrice != null
      ? {
          price: {
            ...(filters.minPrice != null ? { gte: filters.minPrice } : {}),
            ...(filters.maxPrice != null ? { lte: filters.maxPrice } : {}),
          },
        }
      : {}),
    ...(filters.minRating != null ? { ratingAvg: { gte: filters.minRating } } : {}),
    ...(filters.availability !== "ALL" ? { availability: "AVAILABLE" } : {}),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    filters.sort === "price_asc"
      ? { price: "asc" }
      : filters.sort === "price_desc"
        ? { price: "desc" }
        : filters.sort === "rating"
          ? { ratingAvg: "desc" }
          : filters.sort === "newest"
            ? { createdAt: "desc" }
            : filters.sort === "popularity"
              ? { ratingCount: "desc" }
              : { createdAt: "desc" };

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { images: { take: 1 }, category: true, vendor: { select: { businessName: true, slug: true } } },
    }),
    db.product.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export const getProductBySlug = cache(async (vendorSlug: string, productSlug: string) => {
  return db.product.findFirst({
    where: {
      slug: productSlug,
      isAgeRestricted: false,
      vendor: { slug: vendorSlug, ...activeVendorFilter },
    },
    include: {
      images: true,
      variants: true,
      category: true,
      vendor: true,
      inventory: true,
      reviews: { include: { customer: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
});

export const getRelatedProducts = cache(async (categoryId: string, excludeProductId: string, limit = 6) => {
  return db.product.findMany({
    where: {
      categoryId,
      id: { not: excludeProductId },
      isPublished: true,
      ...NOT_AGE_RESTRICTED,
      vendor: activeVendorFilter,
    },
    take: limit,
    include: { images: { take: 1 }, category: true, vendor: { select: { businessName: true, slug: true } } },
  });
});

export const getVendorBySlug = cache(async (slug: string) => {
  return db.vendor.findFirst({
    where: { slug, ...activeVendorFilter },
    include: { restaurant: true },
  });
});
