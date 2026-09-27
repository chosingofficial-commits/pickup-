"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/rbac";
import { recordAuditLog } from "@/lib/audit";
import type { ActionState } from "./types";

export async function setRiderApprovalAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const riderId = String(formData.get("riderId") ?? "");
  const isApproved = formData.get("isApproved") === "1";

  const rider = await db.riderProfile.findUnique({ where: { id: riderId } });
  if (!rider) return { status: "error", message: "Rider not found." };

  if (isApproved && !rider.nationalIdDocKey) {
    return { status: "error", message: "Cannot approve — this rider has no National ID photo on file." };
  }

  await db.riderProfile.update({ where: { id: riderId }, data: { isApproved } });
  await db.notification.create({
    data: {
      userId: rider.userId,
      type: "ACCOUNT",
      title: isApproved ? "You're approved to ride with Pick Up!" : "Your rider account was suspended",
      body: isApproved ? "You can now accept deliveries." : "Contact support for details.",
    },
  });

  await recordAuditLog({ actorUserId: admin.id, action: isApproved ? "RIDER_APPROVED" : "RIDER_SUSPENDED", entityType: "RiderProfile", entityId: riderId });
  revalidatePath("/admin/riders");
  revalidatePath("/admin/rider-applications");
  return { status: "success", message: isApproved ? "Rider approved." : "Rider suspended." };
}

export async function updateRiderOfficeVerificationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const riderId = String(formData.get("riderId") ?? "");

  const rider = await db.riderProfile.findUnique({ where: { id: riderId } });
  if (!rider) return { status: "error", message: "Rider not found." };

  const licenseCheckedInOffice = formData.get("licenseCheckedInOffice") === "1";
  const photoCheckedInOffice = formData.get("photoCheckedInOffice") === "1";
  const licenseNumber = String(formData.get("licenseNumber") ?? "").trim();
  const adminNote = String(formData.get("adminNote") ?? "").trim();

  await db.riderProfile.update({
    where: { id: riderId },
    data: {
      licenseCheckedInOffice,
      photoCheckedInOffice,
      licenseNumber: licenseNumber || null,
      adminNote: adminNote || null,
    },
  });

  await recordAuditLog({ actorUserId: admin.id, action: "RIDER_OFFICE_VERIFICATION_UPDATED", entityType: "RiderProfile", entityId: riderId });
  revalidatePath("/admin/riders");
  revalidatePath("/admin/rider-applications");
  return { status: "success", message: "Saved." };
}
