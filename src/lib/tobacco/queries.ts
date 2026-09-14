import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { serverEnv } from "@/lib/env/server";

/**
 * The only query path allowed to return age-restricted (tobacco) products.
 * General catalog queries (src/lib/catalog/queries.ts) categorically exclude
 * them — never wire actual product records into search, recommendations, or
 * the general marketplace grid. The one sanctioned exception is
 * matchesTobaccoSearchQuery below: a plain keyword check (no product data)
 * that lets the marketplace search page show a link to the gated /cigarettes
 * section — never product cards, images, prices, or an add-to-cart button.
 */

const TOBACCO_SEARCH_TERMS = /cigarette|cigar\b|tobacco|smoking/i;

export function matchesTobaccoSearchQuery(query: string): boolean {
  return TOBACCO_SEARCH_TERMS.test(query);
}

export const getTobaccoSettings = cache(async () => {
  const setting = await db.ageRestrictedProductSetting.findFirst();
  return {
    tobaccoSalesEnabled: setting?.tobaccoSalesEnabled ?? false,
    minimumAge: setting?.minimumAge ?? serverEnv.TOBACCO_MINIMUM_AGE,
    exclusionRadiusMeters: setting?.exclusionRadiusMeters ?? serverEnv.TOBACCO_EXCLUSION_RADIUS_METERS,
    healthWarningText: setting?.healthWarningText || "Smoking is injurious to health.",
  };
});

export async function isTobaccoModuleEnabled(): Promise<boolean> {
  if (!serverEnv.TOBACCO_SALES_ENABLED) return false;
  const settings = await getTobaccoSettings();
  return settings.tobaccoSalesEnabled;
}

const activeVendorFilter = { isApproved: true, isSuspended: false, deletedAt: null } as const;

export const getCigaretteProducts = cache(async () => {
  if (!(await isTobaccoModuleEnabled())) return [];

  return db.product.findMany({
    where: {
      isPublished: true,
      deletedAt: null,
      isAgeRestricted: true,
      category: { isActive: true, isAgeRestricted: true },
      vendor: activeVendorFilter,
    },
    orderBy: { createdAt: "desc" },
    include: { images: { take: 1 }, category: true, vendor: { select: { businessName: true, slug: true } } },
  });
});
