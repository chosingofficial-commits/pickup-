"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/rbac";
import { transitionPayoutStatus } from "@/lib/vendor/payout-transitions";

export async function updatePayoutStatusAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const payoutId = String(formData.get("payoutId") ?? "");
  const status = String(formData.get("status") ?? "");

  // A required reason for rejection (the UI already marks the field
  // required, this is the server-side backstop) — stored in adminNote,
  // the existing unused column meant for exactly this.
  const reason = String(formData.get("reason") ?? "").trim();
  if (status === "REJECTED" && !reason) return;

  const referenceNo = String(formData.get("referenceNo") ?? "").trim();

  // Status change + eligibility re-check + audit log entry happen together,
  // in one transaction — see transitionPayoutStatus. A double-click or two
  // admins racing to process the same payout can only ever have one of
  // them actually succeed; the other gets back false and nothing below
  // runs for it.
  const didTransition = await transitionPayoutStatus(
    payoutId,
    status,
    { id: admin.id, role: admin.role },
    { referenceNo: referenceNo || undefined, adminNote: status === "REJECTED" ? reason : undefined },
  );
  if (!didTransition) return;

  revalidatePath("/admin/payouts");
  revalidatePath(`/admin/payouts/${payoutId}`);
}
