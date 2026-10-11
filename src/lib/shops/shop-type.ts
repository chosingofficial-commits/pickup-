import type { ShopType } from "@/generated/prisma/client";

/** Display order doubles as the admin/vendor <select> option order. */
export const SHOP_TYPES: ShopType[] = [
  "GROCERY",
  "FRESH_MARKET",
  "BAKERY",
  "PHARMACY",
  "CONVENIENCE",
  "HEALTH_BEAUTY",
  "ELECTRONICS",
  "HOME_GIFTS",
  "CLOTHING",
  "FLOWERS",
  "DRINKS",
  "OTHER",
];

/**
 * Delivery time isn't tracked per-vendor anywhere in this app — every "Shop
 * delivers in X-Y min" figure is really the CUSTOMER's selected delivery
 * zone's ETA (see getSelectedLocation()), identical on every shop card. This
 * matches how restaurant cards behave too (no per-restaurant ETA either).
 */
export function formatEtaRange(etaMin?: number, etaMax?: number): string | null {
  if (etaMin == null || etaMax == null) return null;
  return `${etaMin}–${etaMax} min`;
}

export const SHOP_TYPE_LABELS: Record<ShopType, string> = {
  GROCERY: "Grocery",
  FRESH_MARKET: "Fresh Market",
  BAKERY: "Bakery",
  PHARMACY: "Pharmacy",
  CONVENIENCE: "Convenience",
  HEALTH_BEAUTY: "Health & Beauty",
  ELECTRONICS: "Electronics",
  HOME_GIFTS: "Home & Gifts",
  CLOTHING: "Clothing",
  FLOWERS: "Flowers",
  DRINKS: "Drinks",
  OTHER: "Other",
};
