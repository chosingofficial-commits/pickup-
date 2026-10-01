import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { serverEnv } from "@/lib/env/server";

export const SITE_SETTING_KEYS = {
  supportPhone: "support_phone",
  supportEmail: "support_email",
  supportAddress: "support_address",
  whatsappNumber: "whatsapp_number",
  defaultCommissionRatePct: "default_commission_rate_pct",
  // Minimum order amount (Tk) for the first-order free-delivery promo below —
  // this key predates the promo actually being wired up to anything (it was
  // only ever read back into the admin form, see the free-delivery
  // investigation in the project history), but the name and existing default
  // already matched exactly what the promo needed, so it's reused as-is.
  freeDeliveryThreshold: "free_delivery_threshold",
  freeDeliveryPromoEnabled: "free_delivery_promo_enabled",
  freeDeliveryBannerTextEn: "free_delivery_banner_text_en",
  freeDeliveryBannerTextBn: "free_delivery_banner_text_bn",
  // Sitewide "free delivery on every order" offer — replaces the old
  // per-zone DeliveryZone.freeDeliveryThreshold rule (which was never
  // exposed in the admin Locations & zones UI and so was un-editable
  // without a redeploy; the column stays, just unused for fee calculations).
  allOrdersFreeDeliveryEnabled: "all_orders_free_delivery_enabled",
  allOrdersFreeDeliveryThreshold: "all_orders_free_delivery_threshold",
  allOrdersBannerTextEn: "all_orders_banner_text_en",
  allOrdersBannerTextBn: "all_orders_banner_text_bn",
  vatRatePct: "vat_rate_pct",
  defaultRiderCommissionRatePct: "default_rider_commission_rate_pct",
  heroImageUrl: "hero_image_url",
  // Shown on /advertise/submitted — how to actually pay (bKash/Nagad number,
  // "pay cash when our team calls", etc.) is a business decision, not
  // something to hardcode.
  adPaymentInstructions: "ad_payment_instructions",

  // Per-provider checkout toggles (see lib/payments/method-settings.ts). A
  // provider is only ever truly usable when its flag here AND its gateway
  // are both go — see isPaymentMethodEnabled for why the flag alone isn't enough.
  paymentMethodEnabledCod: "payment_method_enabled_cod",
  paymentMethodEnabledBkash: "payment_method_enabled_bkash",
  paymentMethodEnabledNagad: "payment_method_enabled_nagad",
  paymentMethodEnabledRocket: "payment_method_enabled_rocket",
  paymentMethodEnabledSslcommerz: "payment_method_enabled_sslcommerz",
  paymentMethodEnabledCard: "payment_method_enabled_card",
} as const;

const DEFAULTS: Record<string, string> = {
  [SITE_SETTING_KEYS.supportPhone]: serverEnv.SUPPORT_PHONE,
  [SITE_SETTING_KEYS.supportEmail]: serverEnv.SUPPORT_EMAIL,
  [SITE_SETTING_KEYS.supportAddress]: serverEnv.SUPPORT_ADDRESS,
  [SITE_SETTING_KEYS.whatsappNumber]: serverEnv.WHATSAPP_NUMBER,
  [SITE_SETTING_KEYS.defaultCommissionRatePct]: String(serverEnv.DEFAULT_COMMISSION_RATE_PCT),
  [SITE_SETTING_KEYS.freeDeliveryThreshold]: "500",
  [SITE_SETTING_KEYS.freeDeliveryPromoEnabled]: "1",
  [SITE_SETTING_KEYS.freeDeliveryBannerTextEn]: "🎉 Free delivery on your first order over Tk {amount} in Khagrachari Sadar!",
  [SITE_SETTING_KEYS.freeDeliveryBannerTextBn]: "🎉 খাগড়াছড়ি সদরে আপনার প্রথম অর্ডারে {amount} টাকার বেশি হলে ফ্রি ডেলিভারি!",
  [SITE_SETTING_KEYS.allOrdersFreeDeliveryEnabled]: "0",
  [SITE_SETTING_KEYS.allOrdersFreeDeliveryThreshold]: "500",
  [SITE_SETTING_KEYS.allOrdersBannerTextEn]: "🚚 Free delivery on all orders over Tk {amount}!",
  [SITE_SETTING_KEYS.allOrdersBannerTextBn]: "🚚 সব অর্ডারে {amount} টাকার বেশি হলে ফ্রি ডেলিভারি!",
  [SITE_SETTING_KEYS.vatRatePct]: "0",
  [SITE_SETTING_KEYS.defaultRiderCommissionRatePct]: "25",
  [SITE_SETTING_KEYS.heroImageUrl]: "",
  [SITE_SETTING_KEYS.adPaymentInstructions]:
    "We'll contact you on the phone number you provided with payment instructions (bKash/Nagad number or cash arrangement). Your ad goes live once payment is confirmed.",
  // COD on by default (it needs no gateway); every online method off by
  // default until a real merchant account is actually connected.
  [SITE_SETTING_KEYS.paymentMethodEnabledCod]: "1",
  [SITE_SETTING_KEYS.paymentMethodEnabledBkash]: "0",
  [SITE_SETTING_KEYS.paymentMethodEnabledNagad]: "0",
  [SITE_SETTING_KEYS.paymentMethodEnabledRocket]: "0",
  [SITE_SETTING_KEYS.paymentMethodEnabledSslcommerz]: "0",
  [SITE_SETTING_KEYS.paymentMethodEnabledCard]: "0",
};

async function fetchSiteSettings(): Promise<Record<string, string>> {
  const rows = await db.siteSetting.findMany();
  const fromDb = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { ...DEFAULTS, ...fromDb };
}

/**
 * Runtime, admin-editable settings backed by the SiteSetting table, with
 * .env values as first-run defaults. Read this instead of `serverEnv`
 * anywhere the admin dashboard should be able to change the value without a
 * redeploy.
 */
export const getSiteSettings = unstable_cache(fetchSiteSettings, ["site-settings"], { revalidate: 300, tags: ["site-settings"] });

/**
 * Bypasses the cache entirely, always hitting the DB — for money-critical
 * reads (the actual delivery-fee charge in placeOrderAction) where even a
 * momentarily stale value right after an admin save is unacceptable. Preview
 * surfaces (cart, checkout review, the homepage banner) should keep using
 * the cached getSiteSettings() above.
 */
export async function getSiteSettingsUncached(): Promise<Record<string, string>> {
  return fetchSiteSettings();
}

export async function setSiteSetting(key: string, value: string) {
  await db.siteSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
  revalidateTag("site-settings", "minutes");
}
