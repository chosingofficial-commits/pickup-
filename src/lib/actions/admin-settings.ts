"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/rbac";
import { setSiteSetting, SITE_SETTING_KEYS } from "@/lib/settings";
import { recordAuditLog } from "@/lib/audit";
import type { ActionState } from "./types";

export async function updateSiteSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const entries: [string, string][] = [
    [SITE_SETTING_KEYS.supportPhone, String(formData.get("supportPhone") ?? "")],
    [SITE_SETTING_KEYS.supportEmail, String(formData.get("supportEmail") ?? "")],
    [SITE_SETTING_KEYS.supportAddress, String(formData.get("supportAddress") ?? "")],
    [SITE_SETTING_KEYS.whatsappNumber, String(formData.get("whatsappNumber") ?? "")],
    [SITE_SETTING_KEYS.defaultCommissionRatePct, String(formData.get("defaultCommissionRatePct") ?? "10")],
    [SITE_SETTING_KEYS.freeDeliveryThreshold, String(formData.get("freeDeliveryThreshold") ?? "500")],
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
