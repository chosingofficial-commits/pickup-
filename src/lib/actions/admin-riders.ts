"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/rbac";
import { recordAuditLog } from "@/lib/audit";

export async function setRiderApprovalAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const riderId = String(formData.get("riderId") ?? "");
  const isApproved = formData.get("isApproved") === "1";

  await db.riderProfile.update({ where: { id: riderId }, data: { isApproved } });
  await db.notification.create({
    data: {
      userId: (await db.riderProfile.findUnique({ where: { id: riderId } }))!.userId,
      type: "ACCOUNT",
      title: isApproved ? "You're approved to ride with Pick Up!" : "Your rider account was suspended",
      body: isApproved ? "You can now accept deliveries." : "Contact support for details.",
    },
  });

  await recordAuditLog({ actorUserId: admin.id, action: isApproved ? "RIDER_APPROVED" : "RIDER_SUSPENDED", entityType: "RiderProfile", entityId: riderId });
  revalidatePath("/admin/riders");
}
