"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/rbac";
import { recordAuditLog } from "@/lib/audit";

export async function updatePayoutStatusAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const payoutId = String(formData.get("payoutId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["APPROVED", "PAID", "REJECTED"].includes(status)) return;

  await db.vendorPayout.update({
    where: { id: payoutId },
    data: { status: status as never, processedAt: status === "PAID" ? new Date() : undefined },
  });

  await recordAuditLog({ actorUserId: admin.id, action: `PAYOUT_${status}`, entityType: "VendorPayout", entityId: payoutId });
  revalidatePath("/admin/payouts");
}
