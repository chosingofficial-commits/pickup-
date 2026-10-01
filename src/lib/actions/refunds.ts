"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/auth/rbac";
import { recordAuditLog } from "@/lib/audit";
import type { ActionState } from "./types";

export async function requestRefundAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Please log in." };

  const orderId = String(formData.get("orderId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { status: "error", message: "Tell us what went wrong." };

  const order = await db.order.findUnique({ where: { id: orderId }, include: { orderGroup: { include: { payment: true } } } });
  // An admin can start a refund on behalf of any order, not just their own —
  // used by the admin order-detail page's "Start a refund" action.
  if (!order || (order.customerId !== user.id && user.role !== "ADMIN")) return { status: "error", message: "Order not found." };
  if (!order.orderGroup.payment) return { status: "error", message: "No payment found for this order." };
  if (order.status !== "DELIVERED" && order.status !== "CANCELLED" && order.status !== "FAILED_DELIVERY") {
    return { status: "error", message: "Refunds can only be requested for delivered, cancelled, or failed orders." };
  }

  const existing = await db.refund.findFirst({ where: { paymentId: order.orderGroup.payment.id, reason: { contains: order.orderNumber } } });
  if (existing) return { status: "error", message: "A refund request for this order is already in progress." };

  await db.refund.create({
    data: {
      paymentId: order.orderGroup.payment.id,
      amount: order.total,
      reason: `[${order.orderNumber}] ${reason}`,
      status: "REQUESTED",
    },
  });

  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/refunds");
  return { status: "success", message: "Refund requested. Our team will review it shortly." };
}

export async function updateRefundStatusAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const refundId = String(formData.get("refundId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["APPROVED", "REJECTED", "PROCESSED"].includes(status)) return;

  const refund = await db.refund.update({
    where: { id: refundId },
    data: { status: status as never, processedAt: status === "PROCESSED" ? new Date() : undefined },
  });

  if (status === "PROCESSED") {
    await db.payment.update({ where: { id: refund.paymentId }, data: { status: "REFUNDED" } });
  }

  await recordAuditLog({ actorUserId: admin.id, action: `REFUND_${status}`, entityType: "Refund", entityId: refundId });
  revalidatePath("/admin/refunds");
}
