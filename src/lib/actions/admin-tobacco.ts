"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/rbac";
import { recordAuditLog } from "@/lib/audit";
import { serverEnv } from "@/lib/env/server";
import type { ActionState } from "./types";

export async function updateTobaccoSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const tobaccoSalesEnabled = formData.get("tobaccoSalesEnabled") === "1";

  const minimumAgeRaw = String(formData.get("minimumAge") ?? "");
  const minimumAgeInput = Number(minimumAgeRaw);
  if (minimumAgeRaw.trim() !== "" && !Number.isFinite(minimumAgeInput)) {
    return { status: "error", message: "Enter a valid minimum age." };
  }
  const minimumAge = Math.max(18, minimumAgeRaw.trim() === "" ? 18 : minimumAgeInput);

  const radiusRaw = String(formData.get("exclusionRadiusMeters") ?? "");
  const radiusInput = Number(radiusRaw);
  if (radiusRaw.trim() !== "" && !Number.isFinite(radiusInput)) {
    return { status: "error", message: "Enter a valid exclusion radius in meters." };
  }
  const exclusionRadiusMeters = Math.max(10, radiusRaw.trim() === "" ? 100 : radiusInput);

  const healthWarningText = String(formData.get("healthWarningText") ?? "").trim();

  if (tobaccoSalesEnabled && !serverEnv.TOBACCO_SALES_ENABLED) {
    return {
      status: "error",
      message:
        "The TOBACCO_SALES_ENABLED environment variable is off at the deployment level. A developer must set it to true (after legal/compliance sign-off) before this can be enabled here.",
    };
  }

  const existing = await db.ageRestrictedProductSetting.findFirst();
  if (existing) {
    await db.ageRestrictedProductSetting.update({
      where: { id: existing.id },
      data: { tobaccoSalesEnabled, minimumAge, exclusionRadiusMeters, healthWarningText },
    });
  } else {
    await db.ageRestrictedProductSetting.create({ data: { tobaccoSalesEnabled, minimumAge, exclusionRadiusMeters, healthWarningText } });
  }

  await recordAuditLog({
    actorUserId: admin.id,
    action: "TOBACCO_SETTINGS_UPDATED",
    entityType: "AgeRestrictedProductSetting",
    metadata: { tobaccoSalesEnabled, minimumAge, exclusionRadiusMeters },
  });
  revalidatePath("/admin/tobacco");
  return { status: "success", message: "Settings updated." };
}

export async function emergencyDisableTobaccoAction(): Promise<void> {
  const admin = await requireAdmin();
  const existing = await db.ageRestrictedProductSetting.findFirst();
  if (existing) {
    await db.ageRestrictedProductSetting.update({ where: { id: existing.id }, data: { tobaccoSalesEnabled: false } });
  }
  await db.category.updateMany({ where: { isAgeRestricted: true }, data: { isActive: false } });
  await recordAuditLog({ actorUserId: admin.id, action: "TOBACCO_EMERGENCY_DISABLED", entityType: "AgeRestrictedProductSetting" });
  revalidatePath("/admin/tobacco");
}
