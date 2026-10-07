"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/auth/rbac";
import { recordAuditLog } from "@/lib/audit";
import { canTransition } from "@/lib/orders/status-flow";
import { reverseDeliveryEarningEntry } from "./orders";
import type { ActionState } from "./types";
import type { Prisma, BusinessType, OrderStatus } from "@/generated/prisma/client";

type OrderForRefundSync = {
  id: string;
  status: OrderStatus;
  vendor: { businessType: BusinessType };
  delivery: { id: string } | null;
};

/**
 * The part of processing a refund that keeps the rest of the app honest:
 * moves the specific order this refund is for to REFUNDED — which is what
 * excludes it from vendor-earnings/commission-revenue aggregates (they
 * filter on order.status === "DELIVERED") — and reverses the rider's
 * delivery-earning ledger entry, exactly like any other admin-driven
 * REFUNDED transition (advanceOrderStatusAction). A no-op if the order
 * can't legally move to REFUNDED from its current status (e.g. it's
 * already REFUNDED, or this refund predates Refund.orderId and has no
 * order to sync).
 */
export async function syncOrderStatusForProcessedRefund(
  tx: Prisma.TransactionClient,
  order: OrderForRefundSync | null,
  changedByUserId: string,
): Promise<void> {
  if (!order || !canTransition(order.status, "REFUNDED", order.vendor.businessType)) return;

  await tx.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });
  await tx.deliveryStatusHistory.create({
    data: { orderId: order.id, status: "REFUNDED", note: "Refund processed", changedByUserId },
  });
  if (order.delivery) await reverseDeliveryEarningEntry(tx, order.delivery.id);
}

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
      orderId: order.id,
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

  await db.$transaction(async (tx) => {
    const updated = await tx.refund.update({
      where: { id: refundId },
      data: { status: status as never, processedAt: status === "PROCESSED" ? new Date() : undefined },
      include: { order: { include: { vendor: true, delivery: true } } },
    });

    if (status === "PROCESSED") {
      await tx.payment.update({ where: { id: updated.paymentId }, data: { status: "REFUNDED" } });
      await syncOrderStatusForProcessedRefund(tx, updated.order, admin.id);
    }

    return updated;
  });

  await recordAuditLog({ actorUserId: admin.id, action: `REFUND_${status}`, entityType: "Refund", entityId: refundId });
  revalidatePath("/admin/refunds");
}
