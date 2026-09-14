"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";

/** Simulates a gateway callback for the mock adapter — never used when real credentials are configured. */
export async function resolveMockPaymentAction(formData: FormData): Promise<void> {
  const paymentId = String(formData.get("paymentId") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  const returnUrl = String(formData.get("returnUrl") ?? "/");

  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (payment && payment.isSandbox && (payment.status === "PENDING" || payment.status === "PROCESSING")) {
    const nextStatus = outcome === "approve" ? "PAID" : "FAILED";
    await db.payment.update({
      where: { id: paymentId },
      data: { status: nextStatus, paidAt: nextStatus === "PAID" ? new Date() : null },
    });
    await db.transaction.create({
      data: { paymentId, type: "charge", amount: payment.amount, status: nextStatus, metadata: { sandbox: true } },
    });
    await recordAuditLog({
      action: nextStatus === "PAID" ? "SANDBOX_PAYMENT_APPROVED" : "SANDBOX_PAYMENT_DECLINED",
      entityType: "Payment",
      entityId: paymentId,
    });
  }

  redirect(returnUrl);
}
