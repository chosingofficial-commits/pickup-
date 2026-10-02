import "server-only";
import { db } from "@/lib/db";
import { getSiteSettings, getSiteSettingsUncached, SITE_SETTING_KEYS } from "@/lib/settings";

export type FreeDeliveryOfferSettings = {
  enabled: boolean;
  minOrderAmount: number;
  bannerTextEn: string;
  bannerTextBn: string;
};

export type FreeDeliveryPromoSettings = {
  /** Sitewide, only for a customer's very first order. */
  firstOrder: FreeDeliveryOfferSettings;
  /** Sitewide, every order — replaces the old per-zone threshold rule. */
  allOrders: FreeDeliveryOfferSettings;
  // Changes whenever either ENABLED offer's amount or banner text changes
  // (and when an offer is toggled on/off) — AnnouncementBar stores this
  // alongside a dismissal, so an admin edit makes a previously-dismissed
  // banner reappear instead of staying hidden forever.
  versionKey: string;
};

function mapPromoSettings(settings: Record<string, string>): FreeDeliveryPromoSettings {
  const firstOrder: FreeDeliveryOfferSettings = {
    enabled: settings[SITE_SETTING_KEYS.freeDeliveryPromoEnabled] === "1",
    minOrderAmount: Number(settings[SITE_SETTING_KEYS.freeDeliveryThreshold]),
    bannerTextEn: settings[SITE_SETTING_KEYS.freeDeliveryBannerTextEn],
    bannerTextBn: settings[SITE_SETTING_KEYS.freeDeliveryBannerTextBn],
  };
  const allOrders: FreeDeliveryOfferSettings = {
    enabled: settings[SITE_SETTING_KEYS.allOrdersFreeDeliveryEnabled] === "1",
    minOrderAmount: Number(settings[SITE_SETTING_KEYS.allOrdersFreeDeliveryThreshold]),
    bannerTextEn: settings[SITE_SETTING_KEYS.allOrdersBannerTextEn],
    bannerTextBn: settings[SITE_SETTING_KEYS.allOrdersBannerTextBn],
  };

  const versionParts: string[] = [];
  if (firstOrder.enabled) versionParts.push(`fo:${firstOrder.minOrderAmount}|${firstOrder.bannerTextEn}|${firstOrder.bannerTextBn}`);
  if (allOrders.enabled) versionParts.push(`ao:${allOrders.minOrderAmount}|${allOrders.bannerTextEn}|${allOrders.bannerTextBn}`);

  return { firstOrder, allOrders, versionKey: versionParts.join("||") || "none" };
}

/** Reads through getSiteSettings()'s tagged cache — fine for previews (cart, checkout review, homepage banner), where an admin save is reflected within moments via revalidateTag. */
export async function getFreeDeliveryPromoSettings(): Promise<FreeDeliveryPromoSettings> {
  return mapPromoSettings(await getSiteSettings());
}

/** Bypasses the cache — use only for the actual charge (placeOrderAction), where even a momentarily stale read is unacceptable. */
export async function getFreeDeliveryPromoSettingsUncached(): Promise<FreeDeliveryPromoSettings> {
  return mapPromoSettings(await getSiteSettingsUncached());
}

/**
 * No prior OrderGroup containing a real order — checked fresh on every
 * read, not cached, since eligibility changes the moment an order is
 * placed. A group whose every order was cancelled or failed never actually
 * delivered anything, so it doesn't burn the customer's first-order
 * eligibility; a group with at least one order in any other status
 * (in-progress or delivered) does.
 */
export async function isFirstOrderCustomer(userId: string): Promise<boolean> {
  const count = await db.orderGroup.count({
    where: { customerId: userId, orders: { some: { status: { notIn: ["CANCELLED", "FAILED_DELIVERY"] } } } },
  });
  return count === 0;
}
