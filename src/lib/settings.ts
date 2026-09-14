import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { serverEnv } from "@/lib/env/server";

export const SITE_SETTING_KEYS = {
  supportPhone: "support_phone",
  supportEmail: "support_email",
  supportAddress: "support_address",
  whatsappNumber: "whatsapp_number",
  defaultCommissionRatePct: "default_commission_rate_pct",
  freeDeliveryThreshold: "free_delivery_threshold",
  vatRatePct: "vat_rate_pct",
  riderDeliveryRate: "rider_delivery_rate",
  heroImageUrl: "hero_image_url",
} as const;

const DEFAULTS: Record<string, string> = {
  [SITE_SETTING_KEYS.supportPhone]: serverEnv.SUPPORT_PHONE,
  [SITE_SETTING_KEYS.supportEmail]: serverEnv.SUPPORT_EMAIL,
  [SITE_SETTING_KEYS.supportAddress]: serverEnv.SUPPORT_ADDRESS,
  [SITE_SETTING_KEYS.whatsappNumber]: serverEnv.WHATSAPP_NUMBER,
  [SITE_SETTING_KEYS.defaultCommissionRatePct]: String(serverEnv.DEFAULT_COMMISSION_RATE_PCT),
  [SITE_SETTING_KEYS.freeDeliveryThreshold]: "500",
  [SITE_SETTING_KEYS.vatRatePct]: "0",
  [SITE_SETTING_KEYS.riderDeliveryRate]: "40",
  [SITE_SETTING_KEYS.heroImageUrl]: "",
};

/**
 * Runtime, admin-editable settings backed by the SiteSetting table, with
 * .env values as first-run defaults. Read this instead of `serverEnv`
 * anywhere the admin dashboard should be able to change the value without a
 * redeploy.
 */
export const getSiteSettings = cache(async (): Promise<Record<string, string>> => {
  const rows = await db.siteSetting.findMany();
  const fromDb = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { ...DEFAULTS, ...fromDb };
});

export async function setSiteSetting(key: string, value: string) {
  await db.siteSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}
