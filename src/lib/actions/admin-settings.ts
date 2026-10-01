"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/rbac";
import { setSiteSetting, SITE_SETTING_KEYS } from "@/lib/settings";
import { recordAuditLog } from "@/lib/audit";
import { PAYMENT_METHOD_PROVIDERS, paymentMethodSettingKey } from "@/lib/payments/method-settings";
import { isGatewayLive } from "@/lib/payments/gateway-status";
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

  const allOrdersThresholdRaw = String(formData.get("allOrdersFreeDeliveryThreshold") ?? "500");
  const allOrdersThresholdNum = Number(allOrdersThresholdRaw);
  if (!Number.isInteger(allOrdersThresholdNum) || allOrdersThresholdNum <= 0 || allOrdersThresholdNum > FREE_DELIVERY_MIN_AMOUNT_MAX) {
    return { status: "error", message: `All-orders free delivery minimum amount must be a whole number between 1 and ${FREE_DELIVERY_MIN_AMOUNT_MAX}.` };
  }
  // Banner text is optional for this offer — the discount can apply quietly, unadvertised.
  const allOrdersBannerTextEn = String(formData.get("allOrdersBannerTextEn") ?? "").trim();
  const allOrdersBannerTextBn = String(formData.get("allOrdersBannerTextBn") ?? "").trim();

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
    [SITE_SETTING_KEYS.allOrdersFreeDeliveryEnabled, formData.get("allOrdersFreeDeliveryEnabled") === "1" ? "1" : "0"],
    [SITE_SETTING_KEYS.allOrdersFreeDeliveryThreshold, String(allOrdersThresholdNum)],
    [SITE_SETTING_KEYS.allOrdersBannerTextEn, allOrdersBannerTextEn],
    [SITE_SETTING_KEYS.allOrdersBannerTextBn, allOrdersBannerTextBn],
    [SITE_SETTING_KEYS.vatRatePct, String(formData.get("vatRatePct") ?? "0")],
    [SITE_SETTING_KEYS.defaultRiderCommissionRatePct, String(formData.get("defaultRiderCommissionRatePct") ?? "25")],
    [SITE_SETTING_KEYS.heroImageUrl, String(formData.get("heroImageUrl") ?? "")],
    [SITE_SETTING_KEYS.adPaymentInstructions, String(formData.get("adPaymentInstructions") ?? "").trim()],
  ];

  for (const [key, value] of entries) {
    await setSiteSetting(key, value);
  }

  await recordAuditLog({ actorUserId: admin.id, action: "SITE_SETTINGS_UPDATED", entityType: "SiteSetting" });
  revalidatePath("/admin/settings");
  return { status: "success", message: "Settings saved." };
}

/**
 * A method is only ever actually switched on when its gateway is really
 * live+configured — re-checked here server-side regardless of what the form
 * submitted, so a tampered request (or a stale page that still shows a
 * method as toggleable after its credentials were removed) can never force
 * a non-functional method on. COD has no gateway and is never blocked.
 */
export async function updatePaymentMethodSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  for (const provider of PAYMENT_METHOD_PROVIDERS) {
    const requestedOn = formData.get(`enabled_${provider}`) === "1";
    const value = requestedOn && isGatewayLive(provider) ? "1" : "0";
    await setSiteSetting(paymentMethodSettingKey(provider), value);
  }

  await recordAuditLog({ actorUserId: admin.id, action: "PAYMENT_METHODS_UPDATED", entityType: "SiteSetting" });
  revalidatePath("/admin/settings");
  revalidatePath("/checkout/payment");
  return { status: "success", message: "Payment methods saved." };
}
