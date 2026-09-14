"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { canTransition, TRANSITION_ACTOR } from "@/lib/orders/status-flow";
import { recordAuditLog } from "@/lib/audit";
import type { ActionState } from "./types";
import type { OrderStatus } from "@/generated/prisma/client";

const ALL_STATUSES: OrderStatus[] = [
  "ORDER_PLACED",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "RIDER_ASSIGNED",
  "PICKED_UP",
  "ON_THE_WAY",
  "DELIVERED",
  "CANCELLED",
  "FAILED_DELIVERY",
  "RETURNED",
  "REFUNDED",
];

/** Shared by the vendor/restaurant and rider dashboards — every transition is re-validated here regardless of what the UI allowed. */
export async function advanceOrderStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Please log in." };

  const orderId = String(formData.get("orderId") ?? "");
  const nextStatusRaw = String(formData.get("nextStatus") ?? "");
  const note = formData.get("note") ? String(formData.get("note")) : undefined;

  if (!ALL_STATUSES.includes(nextStatusRaw as OrderStatus)) return { status: "error", message: "Invalid status." };
  const nextStatus = nextStatusRaw as OrderStatus;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { vendor: true, delivery: true },
  });
  if (!order) return { status: "error", message: "Order not found." };

  if (!canTransition(order.status, nextStatus, order.vendor.businessType)) {
    return { status: "error", message: `Cannot move this order from "${order.status}" to "${nextStatus}".` };
  }

  const requiredActor = TRANSITION_ACTOR[nextStatus];

  if (requiredActor === "VENDOR") {
    if (user.role !== "VENDOR" || order.vendorId !== user.vendorProfile?.id) {
      return { status: "error", message: "You are not authorized to update this order." };
    }
  } else if (requiredActor === "RIDER") {
    if (user.role !== "RIDER" || !user.riderProfile) {
      return { status: "error", message: "You are not authorized to update this order." };
    }
    if (nextStatus === "RIDER_ASSIGNED") {
      if (order.delivery?.riderId) return { status: "error", message: "This delivery has already been accepted by another rider." };
    } else if (order.delivery?.riderId !== user.riderProfile.id) {
      return { status: "error", message: "This delivery is assigned to a different rider." };
    }
  } else if (requiredActor === "ADMIN" && user.role !== "ADMIN") {
    return { status: "error", message: "You are not authorized to update this order." };
  }

  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: nextStatus } });
    await tx.deliveryStatusHistory.create({ data: { orderId, status: nextStatus, note, changedByUserId: user.id } });

    if (nextStatus === "RIDER_ASSIGNED" && user.riderProfile) {
      await tx.delivery.update({
        where: { orderId },
        data: { riderId: user.riderProfile.id, assignedAt: new Date(), isTrackingActive: true },
      });
    }
    if (nextStatus === "PICKED_UP") {
      await tx.delivery.update({ where: { orderId }, data: { pickedUpAt: new Date() } });
    }
    if (nextStatus === "DELIVERED" || nextStatus === "FAILED_DELIVERY") {
      await tx.delivery.update({
        where: { orderId },
        data: { deliveredAt: nextStatus === "DELIVERED" ? new Date() : undefined, isTrackingActive: false },
      });
    }
  });

  await recordAuditLog({ actorUserId: user.id, action: "ORDER_STATUS_CHANGED", entityType: "Order", entityId: orderId, metadata: { from: order.status, to: nextStatus } });

  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/vendor/orders");
  revalidatePath("/rider");
  revalidatePath("/rider/deliveries");
  return { status: "success" };
}

const WAIT_MINUTES = 3;

/** Vendor hits "Wait" on a new order instead of Accept — order stays ORDER_PLACED but is held out of the incoming-order alert until vendorWaitUntil passes, and the customer sees a "restaurant is busy" notice in the meantime. */
export async function snoozeOrderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR" || !user.vendorProfile) return { status: "error", message: "You are not authorized to update this order." };
  if (user.vendorProfile.businessType !== "RESTAURANT") return { status: "error", message: "Only restaurants can ask a customer to wait." };

  const orderId = String(formData.get("orderId") ?? "");
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.vendorId !== user.vendorProfile.id) return { status: "error", message: "Order not found." };
  if (order.status !== "ORDER_PLACED") return { status: "error", message: "This order has already moved past the incoming stage." };

  const vendorWaitUntil = new Date(Date.now() + WAIT_MINUTES * 60_000);
  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { vendorWaitUntil } });
    await tx.deliveryStatusHistory.create({
      data: { orderId, status: "ORDER_PLACED", note: `Restaurant asked customer to wait ~${WAIT_MINUTES} min`, changedByUserId: user.id },
    });
  });

  await recordAuditLog({ actorUserId: user.id, action: "ORDER_SNOOZED_BY_VENDOR", entityType: "Order", entityId: orderId, metadata: { vendorWaitUntil } });
  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/vendor/orders");
  return { status: "success" };
}

export async function cancelOrderAsCustomerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Please log in." };

  const orderId = String(formData.get("orderId") ?? "");
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.customerId !== user.id) return { status: "error", message: "Order not found." };

  if (order.status !== "ORDER_PLACED" && order.status !== "CONFIRMED") {
    return { status: "error", message: "This order can no longer be cancelled — please contact support." };
  }

  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
    await tx.deliveryStatusHistory.create({ data: { orderId, status: "CANCELLED", changedByUserId: user.id, note: "Cancelled by customer" } });
  });

  await recordAuditLog({ actorUserId: user.id, action: "ORDER_CANCELLED_BY_CUSTOMER", entityType: "Order", entityId: orderId });
  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/account/orders");
  return { status: "success", message: "Order cancelled." };
}
