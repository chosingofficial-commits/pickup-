"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/rbac";
import { recordAuditLog } from "@/lib/audit";
import { transitionPayoutStatus } from "@/lib/vendor/payout-transitions";

export async function updatePayoutStatusAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const payoutId = String(formData.get("payoutId") ?? "");
  const status = String(formData.get("status") ?? "");

  // A single conditional UPDATE (WHERE id = ... AND status IN (...)) — a
  // double-click or two admins racing to process the same payout can only
  // ever have one of them actually succeed; the other's update matches zero
  // rows and this returns false, so nothing below runs for it.
  const didTransition = await transitionPayoutStatus(payoutId, status);
  if (!didTransition) return;

  await recordAuditLog({ actorUserId: admin.id, action: `PAYOUT_${status}`, entityType: "VendorPayout", entityId: payoutId });
  revalidatePath("/admin/payouts");
}
