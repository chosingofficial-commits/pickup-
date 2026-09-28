import "server-only";
import { db } from "@/lib/db";
import { getSiteSettings, SITE_SETTING_KEYS } from "@/lib/settings";

export type FreeDeliveryPromoSettings = {
  enabled: boolean;
  minOrderAmount: number;
  bannerTextEn: string;
  bannerTextBn: string;
};

/** Reads through getSiteSettings()'s tagged cache, so an admin save (which revalidates that tag) is reflected immediately. */
export async function getFreeDeliveryPromoSettings(): Promise<FreeDeliveryPromoSettings> {
  const settings = await getSiteSettings();
  return {
    enabled: settings[SITE_SETTING_KEYS.freeDeliveryPromoEnabled] === "1",
    minOrderAmount: Number(settings[SITE_SETTING_KEYS.freeDeliveryThreshold]),
    bannerTextEn: settings[SITE_SETTING_KEYS.freeDeliveryBannerTextEn],
    bannerTextBn: settings[SITE_SETTING_KEYS.freeDeliveryBannerTextBn],
  };
}

/** No prior OrderGroup at all — checked fresh on every read, not cached, since eligibility changes the moment an order is placed. */
export async function isFirstOrderCustomer(userId: string): Promise<boolean> {
  const count = await db.orderGroup.count({ where: { customerId: userId } });
  return count === 0;
}
