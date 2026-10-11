"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/rbac";
import { recordAuditLog } from "@/lib/audit";
import { optionalText } from "@/lib/validation/form-helpers";
import { SHOP_TYPES } from "@/lib/shops/shop-type";
import { parseWeeklyHoursFormData } from "@/lib/restaurant/weekly-hours-form-data";
import type { ActionState } from "./types";

export async function toggleVendorSuspensionAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const vendorId = String(formData.get("vendorId") ?? "");
  const vendor = await db.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) return;

  await db.vendor.update({ where: { id: vendorId }, data: { isSuspended: !vendor.isSuspended } });
  await recordAuditLog({
    actorUserId: admin.id,
    action: vendor.isSuspended ? "VENDOR_UNSUSPENDED" : "VENDOR_SUSPENDED",
    entityType: "Vendor",
    entityId: vendorId,
  });
  revalidatePath("/admin/vendors");
}

export async function updateVendorCommissionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const vendorId = String(formData.get("vendorId") ?? "");
  const raw = String(formData.get("commissionRatePct") ?? "");
  const rate = Number(raw);
  if (raw.trim() === "" || !Number.isFinite(rate)) {
    return { status: "error", message: "Enter a valid commission percentage." };
  }
  if (rate < 0 || rate > 100) {
    return { status: "error", message: "Commission rate must be between 0 and 100." };
  }

  await db.vendor.update({ where: { id: vendorId }, data: { commissionRatePct: rate } });
  await recordAuditLog({ actorUserId: admin.id, action: "VENDOR_COMMISSION_UPDATED", entityType: "Vendor", entityId: vendorId, metadata: { rate } });
  revalidatePath("/admin/vendors");
  return { status: "success", message: "Commission rate updated." };
}

const shopDetailsSchema = z.object({
  vendorId: z.string().min(1),
  businessName: z.string().trim().min(2).max(120),
  description: optionalText(z.string().trim().max(1000)),
  phone: z.string().trim().min(6).max(20),
  addressText: z.string().trim().min(5),
  commissionRatePct: z.coerce.number().min(0).max(100),
  shopType: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.enum(SHOP_TYPES).optional()),
  logoUrl: optionalText(z.string().url()),
  coverImageUrl: optionalText(z.string().url()),
});

/** Admin editing a vendor's shop details on their behalf — same fields the vendor can edit themselves on /vendor/profile, plus commission (admin-only). */
export async function updateVendorShopDetailsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = shopDetailsSchema.safeParse({
    vendorId: formData.get("vendorId"),
    businessName: formData.get("businessName"),
    description: formData.get("description"),
    phone: formData.get("phone"),
    addressText: formData.get("addressText"),
    commissionRatePct: formData.get("commissionRatePct"),
    shopType: formData.get("shopType"),
    logoUrl: formData.get("logoUrl"),
    coverImageUrl: formData.get("coverImageUrl"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed.error.flatten().fieldErrors)) if (value) fieldErrors[key] = value;
    return { status: "error", message: "Please fix the errors below.", fieldErrors };
  }

  const before = await db.vendor.findUnique({ where: { id: parsed.data.vendorId } });
  if (!before) return { status: "error", message: "Vendor not found." };

  await db.vendor.update({
    where: { id: parsed.data.vendorId },
    data: {
      businessName: parsed.data.businessName,
      description: parsed.data.description || null,
      phone: parsed.data.phone,
      addressText: parsed.data.addressText,
      commissionRatePct: parsed.data.commissionRatePct,
      shopType: parsed.data.shopType ?? null,
      logoUrl: parsed.data.logoUrl || undefined,
      coverImageUrl: parsed.data.coverImageUrl || undefined,
    },
  });

  await recordAuditLog({
    actorUserId: admin.id,
    action: "VENDOR_SHOP_DETAILS_UPDATED",
    entityType: "Vendor",
    entityId: parsed.data.vendorId,
    metadata: {
      before: { businessName: before.businessName, phone: before.phone, addressText: before.addressText, commissionRatePct: Number(before.commissionRatePct) },
      after: { businessName: parsed.data.businessName, phone: parsed.data.phone, addressText: parsed.data.addressText, commissionRatePct: parsed.data.commissionRatePct },
    },
  });

  revalidatePath(`/admin/vendors/${parsed.data.vendorId}`);
  revalidatePath("/admin/vendors");
  return { status: "success", message: "Shop details updated." };
}

/** Admin editing a restaurant's opening hours on its behalf — same effect as the restaurant's own /vendor/hours, audited since it's on their behalf. */
export async function adminUpdateWeeklyHoursAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const vendorId = String(formData.get("vendorId") ?? "");
  const restaurant = await db.restaurant.findUnique({ where: { vendorId } });
  if (!restaurant) return { status: "error", message: "Restaurant not found." };
  const days = parseWeeklyHoursFormData(formData);
  if (!days) return { status: "error", message: "Please set hours for all 7 days." };

  for (const d of days) {
    await db.restaurantWeeklyHours.upsert({
      where: { restaurantId_dayOfWeek: { restaurantId: restaurant.id, dayOfWeek: d.dayOfWeek } },
      create: { restaurantId: restaurant.id, ...d },
      update: { opensAt: d.opensAt, closesAt: d.closesAt, isClosed: d.isClosed },
    });
  }

  await recordAuditLog({ actorUserId: admin.id, action: "VENDOR_HOURS_UPDATED", entityType: "Vendor", entityId: vendorId });
  revalidatePath(`/admin/vendors/${vendorId}`);
  return { status: "success", message: "Opening hours updated." };
}

/** Admin equivalent of adminUpdateWeeklyHoursAction for GROCERY_VENDOR shops — writes to VendorWeeklyHours instead of RestaurantWeeklyHours. */
export async function adminUpdateShopWeeklyHoursAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const vendorId = String(formData.get("vendorId") ?? "");
  const vendor = await db.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) return { status: "error", message: "Shop not found." };
  const days = parseWeeklyHoursFormData(formData);
  if (!days) return { status: "error", message: "Please set hours for all 7 days." };

  for (const d of days) {
    await db.vendorWeeklyHours.upsert({
      where: { vendorId_dayOfWeek: { vendorId, dayOfWeek: d.dayOfWeek } },
      create: { vendorId, ...d },
      update: { opensAt: d.opensAt, closesAt: d.closesAt, isClosed: d.isClosed },
    });
  }

  await recordAuditLog({ actorUserId: admin.id, action: "VENDOR_HOURS_UPDATED", entityType: "Vendor", entityId: vendorId });
  revalidatePath(`/admin/vendors/${vendorId}`);
  return { status: "success", message: "Opening hours updated." };
}

/** Admin equivalent of updateShopHoursSettingsAction, acting on behalf of a grocery vendor. */
export async function adminUpdateShopHoursSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const vendorId = String(formData.get("vendorId") ?? "");
  const vendor = await db.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) return { status: "error", message: "Shop not found." };

  const isManuallyClosed = formData.get("isManuallyClosed") === "1";
  const scheduledOrderingEnabled = formData.get("scheduledOrderingEnabled") === "1";
  const temporaryClosureUntilRaw = String(formData.get("temporaryClosureUntil") ?? "");
  const temporaryClosureUntil = temporaryClosureUntilRaw ? new Date(temporaryClosureUntilRaw) : null;

  await db.vendor.update({ where: { id: vendorId }, data: { isManuallyClosed, scheduledOrderingEnabled, temporaryClosureUntil } });
  await recordAuditLog({ actorUserId: admin.id, action: "VENDOR_HOURS_SETTINGS_UPDATED", entityType: "Vendor", entityId: vendorId });
  revalidatePath(`/admin/vendors/${vendorId}`);
  return { status: "success", message: "Settings updated." };
}
