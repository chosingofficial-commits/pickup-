"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/rbac";
import { transitionPayoutStatus } from "@/lib/vendor/payout-transitions";

export async function updatePayoutStatusAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const payoutId = String(formData.get("payoutId") ?? "");
  const status = String(formData.get("status") ?? "");

  // Status change + audit log entry happen together, in one transaction —
  // see transitionPayoutStatus. A double-click or two admins racing to
  // process the same payout can only ever have one of them actually
  // succeed; the other gets back false and nothing below runs for it.
  const didTransition = await transitionPayoutStatus(payoutId, status, { id: admin.id, role: admin.role });
  if (!didTransition) return;

  revalidatePath("/admin/payouts");
}
