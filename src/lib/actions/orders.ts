"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { canTransition, TRANSITION_ACTOR } from "@/lib/orders/status-flow";
import { recordAuditLog } from "@/lib/audit";
import { computeDeliveryEarning, toPoisha } from "@/lib/rider/ledger";
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
    include: { vendor: true, delivery: true, orderGroup: { include: { payment: true } } },
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

  try {
    await db.$transaction(async (tx) => {
      if (nextStatus === "RIDER_ASSIGNED" && user.riderProfile) {
        // Atomic claim — the pre-check above is only a fast-fail UX nicety;
        // this guarded update is what actually prevents two riders who both
        // passed that check at the same instant from both winning. Whichever
        // transaction commits first flips riderId away from null, so the
        // second one's updateMany matches zero rows.
        const claimed = await tx.delivery.updateMany({
          where: { orderId, riderId: null },
          data: { riderId: user.riderProfile.id, assignedAt: new Date(), isTrackingActive: true },
        });
        if (claimed.count === 0) throw new Error("RIDER_RACE_LOST");
      }

      await tx.order.update({ where: { id: orderId }, data: { status: nextStatus } });
      await tx.deliveryStatusHistory.create({ data: { orderId, status: nextStatus, note, changedByUserId: user.id } });

      if (nextStatus === "PICKED_UP") {
        await tx.delivery.update({ where: { orderId }, data: { pickedUpAt: new Date() } });
      }
      if (nextStatus === "DELIVERED" || nextStatus === "FAILED_DELIVERY") {
        await tx.delivery.update({
          where: { orderId },
          data: { deliveredAt: nextStatus === "DELIVERED" ? new Date() : undefined, isTrackingActive: false },
        });
      }

      if (nextStatus === "DELIVERED" && order.delivery?.riderId) {
        await createDeliveryEarningEntry(tx, order, order.delivery.id, order.delivery.riderId);
      }

      // Neither REFUNDED nor RETURNED reverses the rider's ledger: once a
      // rider has completed a delivery (DELIVERED) they already did the
      // physical work and, for COD, already collected and handed over the
      // cash. Both a refund and a return afterward are platform/vendor-side
      // events only (see syncOrderStatusForProcessedRefund in
      // lib/actions/refunds.ts, which handles the REFUNDED transition
      // reached via the refund-request flow; this direct-admin-action path
      // only ever reaches REFUNDED from CANCELLED/FAILED_DELIVERY, where no
      // earning entry exists yet anyway). If a return warrants paying the
      // rider extra (e.g. a pickup trip) or deducting something, that's done
      // manually via an ADJUSTMENT ledger entry (lib/actions/admin-riders.ts)
      // — never automatically here.
    });
  } catch (err) {
    if (err instanceof Error && err.message === "RIDER_RACE_LOST") {
      return { status: "error", message: "This delivery has already been accepted by another rider." };
    }
    throw err;
  }

  await recordAuditLog({ actorUserId: user.id, action: "ORDER_STATUS_CHANGED", entityType: "Order", entityId: orderId, metadata: { from: order.status, to: nextStatus } });

  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/vendor/orders");
  revalidatePath("/rider");
  revalidatePath("/rider/deliveries");
  return { status: "success" };
}

/**
 * Vendor clicks "Find rider": broadcasts the order to every eligible rider
 * (approved, online, not already mid-delivery) at once, via both a
 * Notification row and the existing /rider polling alert — riders never see
 * this order in getAvailableAssignments() before this runs. Whichever rider
 * accepts first wins; advanceOrderStatusAction's guarded update is what
 * actually enforces that atomically, this just makes the order visible.
 * Re-clicking before anyone accepts just re-notifies everyone.
 */
export async function findRiderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user?.vendorProfile) return { status: "error", message: "You are not authorized to do this." };

  const orderId = String(formData.get("orderId") ?? "");
  const order = await db.order.findUnique({ where: { id: orderId }, include: { vendor: true, delivery: true } });
  if (!order || order.vendorId !== user.vendorProfile.id) return { status: "error", message: "Order not found." };
  if (order.delivery?.riderId) return { status: "error", message: "A rider has already accepted this order." };

  const readyStatus = order.vendor.businessType === "RESTAURANT" ? "READY_FOR_PICKUP" : "PREPARING";
  if (order.status !== readyStatus) {
    return { status: "error", message: "This order isn't ready for a rider yet." };
  }

  const eligibleRiders = await db.riderProfile.findMany({
    where: {
      isApproved: true,
      isOnline: true,
      deliveries: { none: { order: { status: { in: ["RIDER_ASSIGNED", "PICKED_UP", "ON_THE_WAY"] } } } },
    },
    select: { userId: true },
  });

  await db.$transaction(async (tx) => {
    await tx.delivery.update({ where: { orderId }, data: { riderSearchStartedAt: new Date() } });
    if (eligibleRiders.length > 0) {
      await tx.notification.createMany({
        data: eligibleRiders.map((r) => ({
          userId: r.userId,
          type: "DELIVERY" as const,
          title: "New delivery available",
          body: `${order.vendor.businessName} has order ${order.orderNumber} ready for pickup.`,
          linkUrl: "/rider",
        })),
      });
    }
  });

  await recordAuditLog({ actorUserId: user.id, action: "FIND_RIDER_BROADCAST", entityType: "Order", entityId: orderId, metadata: { eligibleRiderCount: eligibleRiders.length } });

  revalidatePath(`/vendor/orders/${orderId}`);
  revalidatePath("/vendor/orders");
  revalidatePath("/rider");

  return eligibleRiders.length > 0
    ? { status: "success", message: `Notified ${eligibleRiders.length} rider${eligibleRiders.length === 1 ? "" : "s"}.` }
    : { status: "error", message: "No riders are currently online and free. Try again shortly." };
}

type OrderForEarning = {
  id: string;
  deliveryFee: Prisma.Decimal;
  total: Prisma.Decimal;
  standardDeliveryFeePoisha: number | null;
  orderGroup: { payment: { provider: string } | null };
};

/**
 * Creates the DELIVERY_EARNING ledger entry for a just-delivered order.
 * Idempotent two ways: an in-transaction existence check (fast path, avoids
 * a DB round-trip to the constraint in the common case) plus a partial
 * unique index on (deliveryId) WHERE type = 'DELIVERY_EARNING' (the real
 * guarantee — catches a genuine race between two concurrent "mark
 * delivered" calls that both pass the existence check before either commits).
 */
export async function createDeliveryEarningEntry(tx: Prisma.TransactionClient, order: OrderForEarning, deliveryId: string, riderId: string): Promise<void> {
  const existing = await tx.riderLedgerEntry.findFirst({ where: { deliveryId, type: "DELIVERY_EARNING" }, select: { id: true } });
  if (existing) return;

  const rider = await tx.riderProfile.findUniqueOrThrow({ where: { id: riderId }, select: { commissionRatePct: true } });
  // Orders placed before standardDeliveryFeePoisha existed fall back to the
  // actually-charged deliveryFee — a small, one-time drift for old orders only.
  const standardFeePoisha = order.standardDeliveryFeePoisha ?? toPoisha(Number(order.deliveryFee));
  const { riderEarningPoisha, platformSharePoisha } = computeDeliveryEarning(standardFeePoisha, Number(rider.commissionRatePct));
  const isCod = order.orderGroup.payment?.provider === "COD";
  const orderTotalPoisha = toPoisha(Number(order.total));
  const balanceImpactPoisha = isCod ? orderTotalPoisha - riderEarningPoisha : -riderEarningPoisha;
  const amountPoisha = isCod ? orderTotalPoisha : riderEarningPoisha;

  await tx.delivery.update({
    where: { id: deliveryId },
    data: {
      riderRatePctSnapshot: rider.commissionRatePct,
      deliveryFeePoisha: standardFeePoisha,
      riderEarningPoisha,
      platformDeliverySharePoisha: platformSharePoisha,
      isCod,
      orderTotalPoisha,
    },
  });

  try {
    await tx.riderLedgerEntry.create({
      data: {
        riderId,
        type: "DELIVERY_EARNING",
        deliveryId,
        balanceImpactPoisha,
        amountPoisha,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return; // lost a race to another concurrent call — safe no-op
    throw err;
  }

  await tx.riderProfile.update({ where: { id: riderId }, data: { balancePoisha: { increment: balanceImpactPoisha } } });
}

/**
 * Reverses a delivery's earning entry. NOT used for REFUNDED or RETURNED —
 * once a rider has completed a delivery they keep their earning regardless
 * of what happens to the order afterward (see advanceOrderStatusAction and
 * syncOrderStatusForProcessedRefund). Only called defensively from
 * adminCancelOrderAction, for a pre-delivery cancel that in practice never
 * has an earning entry to reverse (kept correct if that invariant ever
 * changes). Idempotent two ways: an in-transaction existence check plus a
 * partial unique index on (deliveryId) WHERE type = 'DELIVERY_REVERSAL'.
 */
export async function reverseDeliveryEarningEntry(tx: Prisma.TransactionClient, deliveryId: string): Promise<void> {
  const earning = await tx.riderLedgerEntry.findFirst({ where: { deliveryId, type: "DELIVERY_EARNING" } });
  if (!earning) return;

  const existingReversal = await tx.riderLedgerEntry.findFirst({ where: { deliveryId, type: "DELIVERY_REVERSAL" }, select: { id: true } });
  if (existingReversal) return;

  const balanceImpactPoisha = -earning.balanceImpactPoisha;
  try {
    await tx.riderLedgerEntry.create({
      data: {
        riderId: earning.riderId,
        type: "DELIVERY_REVERSAL",
        deliveryId,
        balanceImpactPoisha,
        amountPoisha: earning.amountPoisha,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return;
    throw err;
  }

  await tx.riderProfile.update({ where: { id: earning.riderId }, data: { balancePoisha: { increment: balanceImpactPoisha } } });
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
