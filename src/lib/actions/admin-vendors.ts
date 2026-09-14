"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/rbac";
import { recordAuditLog } from "@/lib/audit";

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
