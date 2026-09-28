"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/rbac";
import { setSiteSetting, SITE_SETTING_KEYS } from "@/lib/settings";
import { recordAuditLog } from "@/lib/audit";
import type { ActionState } from "./types";

const FREE_DELIVERY_MIN_AMOUNT_MAX = 100_000;

export async function updateSiteSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const freeDeliveryThresholdRaw = String(formData.get("freeDeliveryThreshold") ?? "500");
  const freeDeliveryThresholdNum = Number(freeDeliveryThresholdRaw);
  if (!Number.isInteger(freeDeliveryThresholdNum) || freeDeliveryThresholdNum <= 0 || freeDeliveryThresholdNum > FREE_DELIVERY_MIN_AMOUNT_MAX) {
    return { status: "error", message: `Free delivery minimum order amount must be a whole number between 1 and ${FREE_DELIVERY_MIN_AMOUNT_MAX}.` };
  }

  const freeDeliveryBannerTextEn = String(formData.get("freeDeliveryBannerTextEn") ?? "").trim();
  const freeDeliveryBannerTextBn = String(formData.get("freeDeliveryBannerTextBn") ?? "").trim();
  if (!freeDeliveryBannerTextEn || !freeDeliveryBannerTextBn) {
    return { status: "error", message: "Both English and Bengali banner text are required." };
  }

  const entries: [string, string][] = [
    [SITE_SETTING_KEYS.supportPhone, String(formData.get("supportPhone") ?? "")],
    [SITE_SETTING_KEYS.supportEmail, String(formData.get("supportEmail") ?? "")],
    [SITE_SETTING_KEYS.supportAddress, String(formData.get("supportAddress") ?? "")],
    [SITE_SETTING_KEYS.whatsappNumber, String(formData.get("whatsappNumber") ?? "")],
    [SITE_SETTING_KEYS.defaultCommissionRatePct, String(formData.get("defaultCommissionRatePct") ?? "10")],
    [SITE_SETTING_KEYS.freeDeliveryThreshold, String(freeDeliveryThresholdNum)],
    [SITE_SETTING_KEYS.freeDeliveryPromoEnabled, formData.get("freeDeliveryPromoEnabled") === "1" ? "1" : "0"],
    [SITE_SETTING_KEYS.freeDeliveryBannerTextEn, freeDeliveryBannerTextEn],
    [SITE_SETTING_KEYS.freeDeliveryBannerTextBn, freeDeliveryBannerTextBn],
    [SITE_SETTING_KEYS.vatRatePct, String(formData.get("vatRatePct") ?? "0")],
    [SITE_SETTING_KEYS.defaultRiderCommissionRatePct, String(formData.get("defaultRiderCommissionRatePct") ?? "25")],
    [SITE_SETTING_KEYS.heroImageUrl, String(formData.get("heroImageUrl") ?? "")],
  ];

  for (const [key, value] of entries) {
    await setSiteSetting(key, value);
  }

  await recordAuditLog({ actorUserId: admin.id, action: "SITE_SETTINGS_UPDATED", entityType: "SiteSetting" });
  revalidatePath("/admin/settings");
  return { status: "success", message: "Settings saved." };
}
