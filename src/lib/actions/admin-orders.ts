"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/rbac";
import { recordAuditLog } from "@/lib/audit";
import { isTerminal, getOrderFlow } from "@/lib/orders/status-flow";
import { syncProductFromVariants } from "@/lib/catalog/variant-sync";
import { reverseDeliveryEarningEntry } from "./orders";
import type { ActionState } from "./types";

/**
 * Admin override: cancel any order that hasn't been delivered yet, from any
 * status (broader than the vendor-facing cancel in orders.ts, which stops
 * once a rider has picked up — this is a dispatcher's emergency tool).
 * Reverses stock for every line, defensively reverses any rider earning
 * entry (shouldn't exist pre-delivery, but kept correct if that ever
 * changes), and notifies the customer, vendor, and assigned rider (if any).
 */
export async function adminCancelOrderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { status: "error", message: "A cancellation reason is required." };

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      vendor: { select: { userId: true } },
      customer: { select: { id: true } },
      items: { select: { productId: true, variantId: true, quantity: true } },
      delivery: { select: { id: true, rider: { select: { userId: true } } } },
    },
  });
  if (!order) return { status: "error", message: "Order not found." };
  if (isTerminal(order.status)) {
    return { status: "error", message: `Cannot cancel an order that is already "${order.status}".` };
  }

  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
    await tx.deliveryStatusHistory.create({ data: { orderId, status: "CANCELLED", note: reason, changedByUserId: admin.id } });

    // Restore stock for every variant-tracked line — the exact reverse of
    // place-order.ts's guarded decrement, plus the same cache resync it uses.
    const touchedProductIds = new Set<string>();
    for (const item of order.items) {
      if (item.variantId) {
        await tx.productVariant.update({ where: { id: item.variantId }, data: { stockQty: { increment: item.quantity } } });
        if (item.productId) touchedProductIds.add(item.productId);
      }
    }
    for (const productId of touchedProductIds) {
      await syncProductFromVariants(tx, productId);
    }

    if (order.delivery) await reverseDeliveryEarningEntry(tx, order.delivery.id);

    await tx.notification.createMany({
      data: [
        { userId: order.customer.id, type: "ORDER", title: "Order cancelled", body: `Your order ${order.orderNumber} was cancelled: ${reason}`, linkUrl: `/account/orders/${order.id}` },
        { userId: order.vendor.userId, type: "ORDER", title: "Order cancelled", body: `Order ${order.orderNumber} was cancelled by Pick Up: ${reason}`, linkUrl: `/vendor/orders/${order.id}` },
        ...(order.delivery?.rider?.userId
          ? [{ userId: order.delivery.rider.userId, type: "ORDER" as const, title: "Order cancelled", body: `Order ${order.orderNumber} was cancelled before delivery.`, linkUrl: "/rider/deliveries" }]
          : []),
      ],
    });
  });

  await recordAuditLog({ actorUserId: admin.id, action: "ORDER_CANCELLED_BY_ADMIN", entityType: "Order", entityId: orderId, metadata: { reason, previousStatus: order.status } });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath(`/vendor/orders/${orderId}`);
  revalidatePath("/vendor/orders");
  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/rider/deliveries");
  return { status: "success", message: "Order cancelled." };
}

/** Admin override: assign or reassign the rider on any order that hasn't been delivered yet. */
export async function adminAssignRiderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const riderId = String(formData.get("riderId") ?? "");
  if (!riderId) return { status: "error", message: "Choose a rider." };

  const [order, rider] = await Promise.all([
    db.order.findUnique({ where: { id: orderId }, include: { delivery: { select: { id: true } }, vendor: { select: { businessType: true } } } }),
    db.riderProfile.findUnique({ where: { id: riderId }, include: { user: { select: { id: true, name: true } } } }),
  ]);
  if (!order) return { status: "error", message: "Order not found." };
  if (!rider || !rider.isApproved) return { status: "error", message: "That rider is not approved." };
  if (isTerminal(order.status)) {
    return { status: "error", message: `Cannot assign a rider to an order that is already "${order.status}".` };
  }

  const flow = getOrderFlow(order.vendor.businessType);
  const riderAssignedIdx = flow.indexOf("RIDER_ASSIGNED");
  const currentIdx = flow.indexOf(order.status);
  const shouldAdvanceStatus = currentIdx !== -1 && currentIdx < riderAssignedIdx;

  await db.$transaction(async (tx) => {
    if (order.delivery) {
      await tx.delivery.update({ where: { id: order.delivery.id }, data: { riderId: rider.id, assignedAt: new Date(), isTrackingActive: true } });
    } else {
      await tx.delivery.create({ data: { orderId: order.id, riderId: rider.id, assignedAt: new Date(), isTrackingActive: true } });
    }
    if (shouldAdvanceStatus) {
      await tx.order.update({ where: { id: orderId }, data: { status: "RIDER_ASSIGNED" } });
      await tx.deliveryStatusHistory.create({ data: { orderId, status: "RIDER_ASSIGNED", changedByUserId: admin.id, note: `Assigned by admin to ${rider.user.name}` } });
    }
    await tx.notification.create({
      data: { userId: rider.user.id, type: "DELIVERY", title: "New delivery assigned", body: `You've been assigned order ${order.orderNumber}.`, linkUrl: "/rider/deliveries" },
    });
  });

  await recordAuditLog({ actorUserId: admin.id, action: "ADMIN_RIDER_ASSIGNED", entityType: "Order", entityId: orderId, metadata: { riderId, riderName: rider.user.name } });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/rider");
  revalidatePath("/rider/deliveries");
  return { status: "success", message: `Assigned to ${rider.user.name}.` };
}
