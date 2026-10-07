"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/rbac";
import { recordAuditLog } from "@/lib/audit";
import { optionalText } from "@/lib/validation/form-helpers";
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

export async function updateVendorCommissionAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const vendorId = String(formData.get("vendorId") ?? "");
  const rate = Number(formData.get("commissionRatePct"));
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) return;

  await db.vendor.update({ where: { id: vendorId }, data: { commissionRatePct: rate } });
  await recordAuditLog({ actorUserId: admin.id, action: "VENDOR_COMMISSION_UPDATED", entityType: "Vendor", entityId: vendorId, metadata: { rate } });
  revalidatePath("/admin/vendors");
}

const shopDetailsSchema = z.object({
  vendorId: z.string().min(1),
  businessName: z.string().trim().min(2).max(120),
  description: optionalText(z.string().trim().max(1000)),
  phone: z.string().trim().min(6).max(20),
  addressText: z.string().trim().min(5),
  commissionRatePct: z.coerce.number().min(0).max(100),
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

const DAY_COUNT = 7;

/** Admin editing a restaurant's opening hours on its behalf — same effect as the restaurant's own /vendor/hours, audited since it's on their behalf. */
export async function adminUpdateWeeklyHoursAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const vendorId = String(formData.get("vendorId") ?? "");
  const restaurant = await db.restaurant.findUnique({ where: { vendorId } });
  if (!restaurant) return { status: "error", message: "Restaurant not found." };

  for (let day = 0; day < DAY_COUNT; day++) {
    const isClosed = formData.get(`closed-${day}`) === "1";
    const opensAt = String(formData.get(`opens-${day}`) ?? "10:00");
    const closesAt = String(formData.get(`closes-${day}`) ?? "22:00");

    await db.restaurantWeeklyHours.upsert({
      where: { restaurantId_dayOfWeek: { restaurantId: restaurant.id, dayOfWeek: day } },
      create: { restaurantId: restaurant.id, dayOfWeek: day, opensAt, closesAt, isClosed },
      update: { opensAt, closesAt, isClosed },
    });
  }

  await recordAuditLog({ actorUserId: admin.id, action: "VENDOR_HOURS_UPDATED", entityType: "Vendor", entityId: vendorId });
  revalidatePath(`/admin/vendors/${vendorId}`);
  return { status: "success", message: "Opening hours updated." };
}
